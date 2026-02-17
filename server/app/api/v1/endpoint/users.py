from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlmodel import Session, select, or_
from typing import Annotated, List

from app.core.dbsession import get_session
from app.core.security import get_current_user
from app.db_models.user import User
from app.db_models.booking import Booking
from app.db_models.room_hold import RoomHold
from app.db_models.enums import BookingStatus
from app.utils.google_calendar import delete_event
from app.api.v1.crud import user as user_crud
from app.schema.auth import UserResponse

router = APIRouter()

@router.get("", response_model=List[UserResponse])
def read_users(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    search: str = Query(None, min_length=1),
    skip: int = 0,
    limit: int = 10,
):
    """
    Search for users by full name, email, or employee ID.
    If no search query is provided, returns a paginated list.
    """
    # Only admins can view the full employee directory
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions to view employees",
        )

    statement = select(User)
    if search:
        search_filter = f"%{search}%"
        statement = statement.where(
            or_(
                User.full_name.ilike(search_filter),
                User.email.ilike(search_filter),
                User.employee_id.ilike(search_filter),
            )
        )
    
    # Apply pagination
    statement = statement.offset(skip).limit(limit)
    users = session.exec(statement).all()
    return users

@router.get("/count")
def read_users_count(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Get the total count of registered users.
    """
    from sqlmodel import func
    statement = select(func.count()).select_from(User)
    count = session.exec(statement).one()
    return {"total_employees": count}

@router.delete("/{employee_id}")
def delete_user(
    employee_id: str,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    force: bool = False,
):
    """
    Delete a user by their employee ID.
    Only admins can delete other users. Users can delete themselves.
    If force is True, cancels all active bookings before deletion.
    """
    # Permission check: Admin or Self
    if not current_user.is_admin and current_user.employee_id != employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this user",
        )

    # Fetch the user to be deleted
    db_user = user_crud.get_user_by_employee_id(session, employee_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check for active bookings (status NOT Cancelled/Completed)
    active_bookings_statement = select(Booking).where(
        Booking.user_id == employee_id,
        Booking.status != BookingStatus.CANCELLED,
        Booking.status != BookingStatus.COMPLETED,
    )
    active_bookings = session.exec(active_bookings_statement).all()

    if active_bookings:
        if not force:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete user with active bookings. Use force delete to cancel them.",
            )
        
        # If force is True, cancel active bookings (and notify Google if possible)
        for booking in active_bookings:
            if booking.google_event_id:
                delete_event(
                    event_id=booking.google_event_id,
                    user_token="",
                    refresh_token=db_user.google_refresh_token,
                )
            booking.status = BookingStatus.CANCELLED
            session.add(booking)
        session.commit()

    # To satisfy foreign key constraints, we must either delete or disassociate 
    # all bookings (including completed/cancelled ones) before deleting the user.
    all_bookings_statement = select(Booking).where(Booking.user_id == employee_id)
    all_bookings = session.exec(all_bookings_statement).all()
    for booking in all_bookings:
        session.delete(booking)

    # Delete all RoomHolds for this user
    room_holds_statement = select(RoomHold).where(RoomHold.user_id == employee_id)
    room_holds = session.exec(room_holds_statement).all()
    for hold in room_holds:
        session.delete(hold)
    
    session.commit()

    # Finally, delete the user record
    success = user_crud.delete_user(session, employee_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found during deletion",
        )
    
    return {"detail": f"User {employee_id} deleted successfully"}
