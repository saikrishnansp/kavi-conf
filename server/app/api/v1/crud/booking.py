from sqlalchemy.orm import selectinload
from sqlmodel import Session, select, and_, func
from datetime import datetime
from fastapi import HTTPException, status
from app.db_models.booking import Booking
from app.db_models.booking_attendee import BookingAttendee
from app.db_models.enums import BookingStatus
from app.db_models.user import User
from app.schema.booking import BookingCreate, BookingUpdate, AttendeeDetail
from app.api.v1.crud import user as user_crud
from app.api.v1.crud import room as room_crud
from app.utils.tz import IST


def hydrate_attendees(session: Session, attendees_list: list[BookingAttendee]) -> list[AttendeeDetail]:
    """
    Hydrates attendee details by querying the User table for registered employees.
    Falls back to "External Guest" for unknown emails.
    """
    if not attendees_list:
        return []

    emails = [a.email for a in attendees_list]
    statement = select(User).where(User.email.in_(emails))
    users = session.exec(statement).all()
    user_map = {u.email: u for u in users}

    hydrated = []
    for a in attendees_list:
        user = user_map.get(a.email)
        if user:
            hydrated.append(AttendeeDetail(
                full_name=user.full_name or "Registered User",
                email=user.email,
                employee_id=user.employee_id
            ))
        else:
            hydrated.append(AttendeeDetail(
                full_name="External Guest",
                email=a.email,
                employee_id=None
            ))
    return hydrated


def update_completed_bookings(session: Session, commit: bool = True) -> list[Booking]:
    """
    Finds all confirmed bookings whose end time has passed and updates them to COMPLETED.
    """
    now = datetime.now(IST)
    statement = select(Booking).where(
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.TRANSFERRED]),
        Booking.end_time < now,
    )
    bookings = session.exec(statement).all()
    for booking in bookings:
        booking.status = BookingStatus.COMPLETED
        session.add(booking)

    if bookings and commit:
        session.commit()
    
    return bookings


def check_availability(
    session: Session,
    room_id: str,
    start_time: datetime,
    end_time: datetime,
    exclude_booking_id: int = None,
) -> bool:
    """
    Returns True if the room and its hierarchy (parent/children) are available,
    False if there is a conflict.
    """
    hierarchy_ids = room_crud.get_room_hierarchy(session, room_id)

    query = select(Booking).where(
        Booking.room_id.in_(hierarchy_ids),
        Booking.status != BookingStatus.CANCELLED,
        and_(Booking.start_time < end_time, Booking.end_time > start_time),
    )

    if exclude_booking_id:
        query = query.where(Booking.id != exclude_booking_id)

    results = session.exec(query).all()
    return len(results) == 0


def check_attendee_availability(
    session: Session,
    employee_ids: list[str],
    start_time: datetime,
    end_time: datetime,
    exclude_booking_id: int = None,
) -> list[str]:
    """
    Checks if any of the attendees are already booked for another meeting during the given time.
    Returns a list of employee_ids that have conflicts.
    """
    if not employee_ids:
        return []

    statement = (
        select(BookingAttendee.employee_id)
        .join(Booking)
        .where(
            BookingAttendee.employee_id.in_(employee_ids),
            Booking.status != BookingStatus.CANCELLED,
            and_(Booking.start_time < end_time, Booking.end_time > start_time),
        )
    )

    if exclude_booking_id:
        statement = statement.where(Booking.id != exclude_booking_id)

    conflicts = session.exec(statement).all()
    return list(set(conflicts))


def resolve_attendees(session: Session, identifiers: list[str]) -> list[dict]:
    """
    Resolves a list of identifiers (email, name, or employee_id) to user details.
    Accepts external guests if the identifier is a valid email.
    """
    import re
    resolved_map = {}
    email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"

    for identifier in identifiers:
        # 1. Try Email
        user = user_crud.get_user_by_email(session, identifier)
        
        # 2. Try Employee ID
        if not user:
            user = user_crud.get_user_by_employee_id(session, identifier)

        # 3. Try Name
        if not user:
            users = user_crud.get_users_by_name(session, identifier)
            if len(users) == 1:
                user = users[0]
            elif len(users) > 1:
                ids = [f"{u.full_name} ({u.employee_id})" for u in users]
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Multiple employees found for name '{identifier}'. Please use employee ID: {', '.join(ids)}",
                )

        if user:
            resolved_map[user.employee_id] = {
                "email": user.email,
                "full_name": user.full_name,
                "employee_id": user.employee_id,
                "position": user.position,
            }
            continue

        # 4. Handle External Guest
        if re.match(email_regex, identifier):
            # Using email as employee_id for guests, prefixed with GUEST_
            resolved_map[f"GUEST_{identifier}"] = {
                "email": identifier,
                "full_name": identifier.split("@")[0],
                "employee_id": f"GUEST_{identifier}",
                "position": "External Guest",
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User or employee '{identifier}' not found and is not a valid email.",
            )
    
    return list(resolved_map.values())


def create_booking(
    session: Session,
    booking_in: BookingCreate,
    user_id: str,
    resolved_attendees: list[dict] = None,
    meet_link: Optional[str] = None,
    calendar_link: Optional[str] = None,
    google_event_id: Optional[str] = None,
    commit: bool = True,
) -> Booking:
    booking_data = booking_in.model_dump()
    attendee_identifiers = booking_data.pop("attendees", [])

    if resolved_attendees is None:
        resolved_attendees = resolve_attendees(session, attendee_identifiers)

    booking_data["attendee_count"] = len(resolved_attendees)

    db_booking = Booking(
        **booking_data,
        user_id=user_id,
        status=BookingStatus.CONFIRMED,
        meet_link=meet_link,
        calendar_link=calendar_link,
        google_event_id=google_event_id,
    )
    session.add(db_booking)
    session.flush()
    session.refresh(db_booking)

    for attr in resolved_attendees:
        attendee = BookingAttendee(
            booking_id=db_booking.id,
            email=attr["email"],
            full_name=attr["full_name"],
            employee_id=attr["employee_id"],
            position=attr["position"],
        )
        session.add(attendee)

    if commit:
        session.commit()

    statement = (
        select(Booking)
        .where(Booking.id == db_booking.id)
        .options(selectinload(Booking.attendees_list))
    )
    return session.exec(statement).one()


def update_booking(
    session: Session,
    db_booking: Booking,
    booking_in: BookingUpdate,
    resolved_attendees: list[dict] = None,
    commit: bool = True,
) -> Booking:
    booking_data = booking_in.model_dump(exclude_unset=True)

    if "attendees" in booking_data:
        attendee_identifiers = booking_data.pop("attendees")
        for attendee in db_booking.attendees_list:
            session.delete(attendee)

        if resolved_attendees is None:
            resolved_attendees = resolve_attendees(session, attendee_identifiers)

        for attr in resolved_attendees:
            attendee = BookingAttendee(
                booking_id=db_booking.id,
                email=attr["email"],
                full_name=attr["full_name"],
                employee_id=attr["employee_id"],
                position=attr["position"],
            )
            session.add(attendee)
        
        db_booking.attendee_count = len(resolved_attendees)

    for key, value in booking_data.items():
        setattr(db_booking, key, value)

    session.add(db_booking)
    if commit:
        session.commit()
        session.refresh(db_booking)

    statement = (
        select(Booking)
        .where(Booking.id == db_booking.id)
        .options(selectinload(Booking.attendees_list))
    )
    return session.exec(statement).one()


def transfer_booking(
    session: Session, booking_id: int, new_owner_id: str, commit: bool = True
) -> Booking:
    db_booking = get_booking_by_id(session, booking_id)
    if not db_booking:
        return None

    db_booking.user_id = new_owner_id
    db_booking.status = BookingStatus.TRANSFERRED
    session.add(db_booking)
    if commit:
        session.commit()
        session.refresh(db_booking)
    return db_booking


def get_all_bookings(
    session: Session, skip: int = 0, limit: int = 100, date: str = None
) -> tuple[list[Booking], int]:
    statement = select(Booking).options(selectinload(Booking.attendees_list))
    
    if date:
        # Assuming date is 'YYYY-MM-DD'
        start_of_day = datetime.strptime(f"{date} 00:00:00", "%Y-%m-%d %H:%M:%S").replace(tzinfo=IST)
        end_of_day = datetime.strptime(f"{date} 23:59:59", "%Y-%m-%d %H:%M:%S").replace(tzinfo=IST)
        statement = statement.where(
            Booking.start_time < end_of_day,
            Booking.end_time > start_of_day
        )

    # Count total
    count_statement = select(func.count()).select_from(statement.subquery())
    total = session.exec(count_statement).one()

    statement = statement.offset(skip).limit(limit)
    items = session.exec(statement).all()
    return items, total


def get_user_bookings(
    session: Session, user_id: str, skip: int = 0, limit: int = 100
) -> tuple[list[Booking], int]:
    total_statement = (
        select(func.count()).select_from(Booking).where(Booking.user_id == user_id)
    )
    total = session.exec(total_statement).one()

    statement = (
        select(Booking)
        .where(Booking.user_id == user_id)
        .options(selectinload(Booking.attendees_list))
        .offset(skip)
        .limit(limit)
    )
    items = session.exec(statement).all()
    return items, total


def get_booking_by_id(session: Session, booking_id: int) -> Booking | None:
    statement = (
        select(Booking)
        .where(Booking.id == booking_id)
        .options(selectinload(Booking.attendees_list))
    )
    return session.exec(statement).first()


def cancel_booking(session: Session, booking_id: int, commit: bool = True) -> Booking | None:
    """
    Sets booking status to CANCELLED.
    """
    db_booking = get_booking_by_id(session, booking_id)
    if not db_booking:
        return None

    db_booking.status = BookingStatus.CANCELLED
    session.add(db_booking)
    if commit:
        session.commit()
        session.refresh(db_booking)
    return db_booking


def get_bookings_in_range(
    session: Session, start_time: datetime, end_time: datetime
) -> list[Booking]:
    """
    Get all confirmed bookings within a time range.
    """
    statement = (
        select(Booking)
        .where(
            Booking.status != BookingStatus.CANCELLED,
            Booking.end_time > start_time,
            Booking.start_time < end_time,
        )
        .options(selectinload(Booking.attendees_list))
    )
    return session.exec(statement).all()