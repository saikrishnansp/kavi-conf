from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Header
from sqlmodel import Session, select
from datetime import datetime
from typing import Annotated, Optional

from app.core.dbsession import get_session, transaction_scope
from app.core.security import get_current_user, get_google_token
from app.db_models.user import User
from app.db_models.booking import Booking
from app.db_models.enums import BookingStatus
from app.schema.booking import (
    BookingCreate,
    BookingResponse,
    BookingListResponse,
    BookingUpdate,
    BookingTransfer,
)
from app.core.websocket import manager
from app.utils.rate_limit import rate_limit_api
from app.api.v1.crud import booking as booking_crud
from app.api.v1.crud import room as room_crud
from app.api.v1.crud import room_hold as room_hold_crud

router = APIRouter(dependencies=[Depends(rate_limit_api)])

# ==========================================
# 1. STATIC ROUTES (MUST BE DEFINED FIRST)
# ==========================================

@router.get("/range", response_model=list[BookingResponse])
def get_bookings_range(
    start_time: datetime,
    end_time: datetime,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Get all bookings within a time range (Public/Shared View).
    MOVED TO TOP to prevent conflict with /{booking_id}.
    """
    from app.utils.validation import ensure_tz_aware
    start_time = ensure_tz_aware(start_time)
    end_time = ensure_tz_aware(end_time)
    
    items = booking_crud.get_bookings_in_range(session, start_time, end_time)
    hydrated_items = []
    for item in items:
        hydrated = BookingResponse.model_validate(item)
        hydrated.attendees = booking_crud.hydrate_attendees(session, item.attendees_list)
        hydrated_items.append(hydrated)
    return hydrated_items


@router.get("", response_model=BookingListResponse)
def get_bookings(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 100,
    date: Optional[str] = None,
    all_bookings: bool = False,
):
    """
    Get bookings. Admins can get all bookings.
    """
    limit = min(limit, 100)
    
    if all_bookings and current_user.is_admin:
        items, total = booking_crud.get_all_bookings(
            session, skip=skip, limit=limit, date=date
        )
    else:
        items, total = booking_crud.get_user_bookings(
            session, user_id=current_user.employee_id, skip=skip, limit=limit
        )
    
    hydrated_items = []
    for item in items:
        hydrated = BookingResponse.model_validate(item)
        hydrated.attendees = booking_crud.hydrate_attendees(session, item.attendees_list)
        hydrated_items.append(hydrated)
        
    return {"items": hydrated_items, "total": total}


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    booking_in: BookingCreate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    background_tasks: BackgroundTasks,
    x_google_token: Annotated[Optional[str], Header()] = None,
    google_token_from_jwt: Annotated[Optional[str], Depends(get_google_token)] = None,
):
    """
    Create a new booking.
    """
    # Use header if provided, otherwise fallback to JWT payload
    effective_google_token = x_google_token or google_token_from_jwt

    with transaction_scope(session):
        room = room_crud.get_room_by_id(session, booking_in.room_id)
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Room '{booking_in.room_id}' not found.",
            )

        # LOCK the Room hierarchy
        hierarchy_ids = room_crud.get_room_hierarchy(session, room.room_id)
        from app.db_models.room import Room
        session.exec(
            select(Room).where(Room.room_id.in_(hierarchy_ids)).with_for_update()
        ).all()

        if not room.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Room is not active and cannot be booked.",
            )

        # 2. Check Room Hold
        if room_hold_crud.is_room_held(session, room.room_id, current_user.employee_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Room is currently being booked by another user.",
            )

        # Create/Update hold
        room_hold_crud.create_hold(session, room.room_id, current_user.employee_id, commit=False)

        # 3. Resolve Attendees and check availability
        resolved_attendees = booking_crud.resolve_attendees(
            session, booking_in.attendees
        )
        
        # Ensure organizer is in the attendee list
        organizer_found = any(a["email"] == current_user.email for a in resolved_attendees)
        if not organizer_found:
            resolved_attendees.append({
                "email": current_user.email,
                "full_name": current_user.full_name,
                "employee_id": current_user.employee_id,
                "position": current_user.position,
            })

        employee_ids = [a["employee_id"] for a in resolved_attendees]
        attendee_count = len(resolved_attendees)

        # 4. Room Capacity Validation
        if attendee_count > room.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Attendee count ({attendee_count}) exceeds room capacity ({room.capacity}).",
            )

        # 5. Check Room Availability
        is_available = booking_crud.check_availability(
            session,
            room_id=room.room_id,
            start_time=booking_in.start_time,
            end_time=booking_in.end_time,
        )

        if not is_available:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Room is already booked for this time slot.",
            )

        conflicts = booking_crud.check_attendee_availability(
            session,
            employee_ids=employee_ids,
            start_time=booking_in.start_time,
            end_time=booking_in.end_time,
        )

        if conflicts:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"The following attendees have conflicting bookings: {', '.join(conflicts)}",
            )

        # 7. Create Booking
        # Generate Google Calendar Event first to get links
        meet_link, calendar_link, google_event_id = None, None, None
        if effective_google_token:
            from app.utils.google_calendar import create_event
            from app.utils.logging import logger
            attendee_emails = [a["email"] for a in resolved_attendees]
            if current_user.email not in attendee_emails:
                attendee_emails.append(current_user.email)

            try:
                meet_link, calendar_link, google_event_id = create_event(
                    subject=booking_in.subject,
                    start_time=booking_in.start_time,
                    end_time=booking_in.end_time,
                    attendees_emails=attendee_emails,
                    user_token=effective_google_token,
                    refresh_token=current_user.google_refresh_token,
                    description=booking_in.description,
                    send_updates='all'
                )
                
                if not google_event_id:
                    logger.error(f"Google Calendar event creation returned None for user {current_user.email}")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Failed to create Google Calendar event. Please check your Google permissions."
                    )
            except Exception as e:
                logger.error(f"Critical error during Google Calendar event creation: {str(e)}")
                if isinstance(e, HTTPException):
                    raise e
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Google Calendar Integration Error: {str(e)}"
                )
        else:
            from app.utils.logging import logger
            logger.warning(f"Google token missing for user {current_user.email}, skipping Calendar event creation.")

        new_booking = booking_crud.create_booking(
            session,
            booking_in,
            user_id=current_user.employee_id,
            resolved_attendees=resolved_attendees,
            meet_link=meet_link,
            calendar_link=calendar_link,
            google_event_id=google_event_id,
            commit=False,
        )
        
        # 8. Success - Delete Hold
        room_hold_crud.delete_hold(session, room.room_id, current_user.employee_id, commit=False)
        
        # Sync refresh to ensure all fields are loaded before broadcasting
        session.flush()

        # Prepare response data with hydration
        hydrated_attendees = booking_crud.hydrate_attendees(session, new_booking.attendees_list)
        response_data = BookingResponse.model_validate(new_booking)
        response_data.attendees = hydrated_attendees
        
        # Prepare broadcast payload before exiting transaction to ensure relationships are loaded
        broadcast_payload = {
            "type": "booking_created",
            "data": {
                "booking_id": new_booking.id,
                "room_id": new_booking.room_id,
                "start_time": new_booking.start_time.isoformat(),
                "end_time": new_booking.end_time.isoformat(),
                "user_id": new_booking.user_id,
                "status": new_booking.status
            }
        }
        
        hold_release_payload = {
            "type": "hold_released",
            "data": {
                "room_id": new_booking.room_id,
                "user_id": current_user.employee_id,
                "reason": "booking_finalized"
            }
        }

    # Broadcast after transaction commit
    background_tasks.add_task(manager.broadcast, broadcast_payload)
    background_tasks.add_task(manager.broadcast, hold_release_payload)

    return response_data


# ==========================================
# 2. DYNAMIC ROUTES (MUST BE DEFINED LAST)
# ==========================================

@router.put("/{booking_id}", response_model=BookingResponse)
def update_booking(
    booking_id: int,
    booking_in: BookingUpdate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    background_tasks: BackgroundTasks,
    x_google_token: Annotated[Optional[str], Header()] = None,
    google_token_from_jwt: Annotated[Optional[str], Depends(get_google_token)] = None,
):
    """
    Update an existing booking.
    """
    effective_google_token = x_google_token or google_token_from_jwt

    with transaction_scope(session):
        db_booking = booking_crud.get_booking_by_id(session, booking_id)
        if not db_booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found."
            )

        # Permission Check
        if db_booking.user_id != current_user.employee_id and not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to update this booking.",
            )

        if db_booking.status in [BookingStatus.CANCELLED, BookingStatus.COMPLETED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot update a {db_booking.status} booking.",
            )

        # 1. Resolve Room if changed
        target_room_id = booking_in.room_id or db_booking.room_id
        room = room_crud.get_room_by_id(session, target_room_id)
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Room '{target_room_id}' not found.",
            )
        if not room.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Room is not active.",
            )

        # LOCK the Room hierarchy
        hierarchy_ids = room_crud.get_room_hierarchy(session, target_room_id)
        from app.db_models.room import Room
        session.exec(
            select(Room).where(Room.room_id.in_(hierarchy_ids)).with_for_update()
        ).all()

        # 2. Times
        start_time = booking_in.start_time or db_booking.start_time
        end_time = booking_in.end_time or db_booking.end_time

        if start_time >= end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End time must be after start time.",
            )

        # 3. Resolve Attendees
        resolved_attendees = None
        if booking_in.attendees is not None:
            resolved_attendees = booking_crud.resolve_attendees(
                session, booking_in.attendees
            )
            
            # Ensure organizer is in the attendee list
            organizer_found = any(a["email"] == current_user.email for a in resolved_attendees)
            if not organizer_found:
                resolved_attendees.append({
                    "email": current_user.email,
                    "full_name": current_user.full_name,
                    "employee_id": current_user.employee_id,
                    "position": current_user.position,
                })

            employee_ids = [a["employee_id"] for a in resolved_attendees]
        else:
            employee_ids = [a.employee_id for a in db_booking.attendees_list]

        attendee_count = len(employee_ids)

        # 4. Capacity Check
        if attendee_count > room.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Attendee count ({attendee_count}) exceeds room capacity ({room.capacity}).",
            )

        # 5. Availability Check (Room)
        time_changed = (start_time != db_booking.start_time) or (
            end_time != db_booking.end_time
        )
        room_changed = target_room_id != db_booking.room_id

        if time_changed or room_changed:
            is_available = booking_crud.check_availability(
                session,
                room_id=target_room_id,
                start_time=start_time,
                end_time=end_time,
                exclude_booking_id=booking_id,
            )
            if not is_available:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Room is already booked for this time slot.",
                )

        # 6. Attendee Availability
        if time_changed or booking_in.attendees is not None:
            conflicts = booking_crud.check_attendee_availability(
                session,
                employee_ids=employee_ids,
                start_time=start_time,
                end_time=end_time,
                exclude_booking_id=booking_id,
            )
            if conflicts:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"The following attendees have conflicting bookings: {', '.join(conflicts)}",
                )

        # 7. Google Calendar Update
        if db_booking.google_event_id and effective_google_token:
            from app.utils.google_calendar import update_event
            attendee_emails = []
            if resolved_attendees:
                attendee_emails = [a["email"] for a in resolved_attendees]
            else:
                attendee_emails = [a.email for a in db_booking.attendees_list]
            
            if current_user.email not in attendee_emails:
                attendee_emails.append(current_user.email)

            update_event(
                event_id=db_booking.google_event_id,
                subject=booking_in.subject or db_booking.subject,
                start_time=start_time,
                end_time=end_time,
                attendees_emails=attendee_emails,
                user_token=effective_google_token,
                refresh_token=current_user.google_refresh_token,
                description=booking_in.description if booking_in.description is not None else db_booking.description,
                send_updates='all'
            )

        # 8. Update DB
        updated_booking = booking_crud.update_booking(
            session, db_booking, booking_in, resolved_attendees, commit=False
        )

        hydrated_attendees = booking_crud.hydrate_attendees(session, updated_booking.attendees_list)
        response_data = BookingResponse.model_validate(updated_booking)
        response_data.attendees = hydrated_attendees

        broadcast_payload = {
            "type": "booking_updated",
            "data": {
                "booking_id": updated_booking.id,
                "room_id": updated_booking.room_id,
                "start_time": updated_booking.start_time.isoformat(),
                "end_time": updated_booking.end_time.isoformat(),
                "user_id": updated_booking.user_id,
                "status": updated_booking.status
            }
        }

    background_tasks.add_task(manager.broadcast, broadcast_payload)
    return response_data


@router.post("/{booking_id}/transfer", response_model=BookingResponse)
def transfer_booking(
    booking_id: int,
    transfer_in: BookingTransfer,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    background_tasks: BackgroundTasks,
):
    """
    Transfer ownership of a booking to another user.
    """
    db_booking = booking_crud.get_booking_by_id(session, booking_id)
    if not db_booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found."
        )

    if db_booking.user_id != current_user.employee_id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to transfer this booking.",
        )

    if db_booking.status in [BookingStatus.CANCELLED, BookingStatus.COMPLETED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transfer a {db_booking.status} booking.",
        )

    try:
        resolved = booking_crud.resolve_attendees(
            session, [transfer_in.new_owner_identifier]
        )
        if not resolved:
            raise HTTPException(status_code=404, detail="New owner not found.")
        new_owner = resolved[0]
    except HTTPException as e:
        raise HTTPException(
            status_code=e.status_code, detail=f"New owner check failed: {e.detail}"
        )

    updated_booking = booking_crud.transfer_booking(
        session, booking_id, new_owner["employee_id"]
    )

    background_tasks.add_task(manager.broadcast, {
        "type": "booking_transferred",
        "data": {
            "booking_id": updated_booking.id,
            "room_id": updated_booking.room_id,
            "new_user_id": updated_booking.user_id,
            "status": updated_booking.status
        }
    })

    return updated_booking


@router.get("/{booking_id}", response_model=BookingResponse)
def get_booking(
    booking_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Get a single booking by ID.
    """
    booking = booking_crud.get_booking_by_id(session, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found."
        )

    if booking.user_id != current_user.employee_id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view this booking.",
        )

    response = BookingResponse.model_validate(booking)
    response.attendees = booking_crud.hydrate_attendees(session, booking.attendees_list)
    return response


@router.delete("/{booking_id}", response_model=BookingResponse)
def cancel_booking(
    booking_id: int,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    background_tasks: BackgroundTasks,
    x_google_token: Annotated[Optional[str], Header()] = None,
    google_token_from_jwt: Annotated[Optional[str], Depends(get_google_token)] = None,
):
    """
    Cancel a booking.
    """
    effective_google_token = x_google_token or google_token_from_jwt

    booking = booking_crud.get_booking_by_id(session, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found."
        )

    if booking.user_id != current_user.employee_id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to cancel this booking.",
        )

    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is already cancelled.",
        )

    # Google Calendar Deletion
    if booking.google_event_id and effective_google_token:
        from app.utils.google_calendar import delete_event
        delete_event(
            event_id=booking.google_event_id,
            user_token=effective_google_token,
            refresh_token=current_user.google_refresh_token,
            send_updates='all'
        )

    cancelled_booking = booking_crud.cancel_booking(session, booking_id)

    background_tasks.add_task(manager.broadcast, {
        "type": "booking_cancelled",
        "data": {
            "booking_id": cancelled_booking.id,
            "room_id": cancelled_booking.room_id,
            "user_id": cancelled_booking.user_id,
            "status": cancelled_booking.status
        }
    })

    return cancelled_booking