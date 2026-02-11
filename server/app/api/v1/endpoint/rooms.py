from typing import Annotated
from datetime import datetime
from fastapi import APIRouter, Depends, status, HTTPException, BackgroundTasks
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError

from app.core.dbsession import get_session
from app.core.security import get_current_user, get_current_admin_user
from app.db_models.user import User
from app.db_models.room import Room
from app.db_models.booking import Booking
from app.schema.room import RoomResponse, RoomCreate, RoomUpdate, RoomListResponse
from app.api.v1.crud import room as room_crud
from app.api.v1.crud import room_hold as room_hold_crud
from app.utils.rate_limit import rate_limit_api
from app.utils.tz import IST
from app.core.websocket import manager

router = APIRouter(dependencies=[Depends(rate_limit_api)])


@router.post("/{room_id}/hold", status_code=status.HTTP_201_CREATED)
def hold_room(
    room_id: str,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    background_tasks: BackgroundTasks,
):
    """
    Temporary hold a room to prevent others from booking it while filling the form.
    """
    room = room_crud.get_room_by_id(session, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    if not room.is_active:
        raise HTTPException(status_code=400, detail="Room is not active.")

    if room_hold_crud.is_room_held(session, room_id, current_user.employee_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Room is already held by another user.",
        )

    hold = room_hold_crud.create_hold(session, room_id, current_user.employee_id)

    background_tasks.add_task(manager.broadcast, {
        "type": "hold_acquired",
        "data": {
            "room_id": room_id,
            "user_id": current_user.employee_id,
            "expires_at": hold.expires_at.isoformat()
        }
    })

    return {"message": "Room hold acquired", "expires_at": hold.expires_at}


@router.delete("/{room_id}/hold", status_code=status.HTTP_204_NO_CONTENT)
def release_room_hold(
    room_id: str,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    background_tasks: BackgroundTasks,
):
    """
    Manually release a room hold.
    """
    room_hold_crud.delete_hold(session, room_id, current_user.employee_id)

    background_tasks.add_task(manager.broadcast, {
        "type": "hold_released",
        "data": {
            "room_id": room_id,
            "user_id": current_user.employee_id,
            "reason": "manual"
        }
    })

    return None


@router.get("", response_model=RoomListResponse)
def read_rooms(
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
):
    """
    Retrieve all rooms.
    """
    limit = min(limit, 100)
    items, total = room_crud.get_all_rooms(
        session, skip=skip, limit=limit, active_only=active_only
    )
    
    now = datetime.now(IST)
    
    # Enrich room objects with current booking info
    enriched_items = []
    for room in items:
        # Check for confirmed booking active right now
        statement = select(Booking).where(
            Booking.room_id == room.room_id,
            Booking.status == "confirmed",
            Booking.start_time <= now,
            Booking.end_time > now
        )
        current_booking = session.exec(statement).first()
        
        # Convert to RoomResponse and add current_booking
        room_resp = RoomResponse.model_validate(room)
        room_resp.current_booking = current_booking
        if current_booking:
            room_resp.next_available_at = current_booking.end_time
        else:
            room_resp.next_available_at = None
            
        enriched_items.append(room_resp)
        
    return {"items": enriched_items, "total": total}


@router.get("/{room_id}", response_model=RoomResponse)
def read_room(
    room_id: str,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Get a single room by room_id.
    """
    room = room_crud.get_room_by_id(session, room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Room not found."
        )
    return room


@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(
    *,
    session: Annotated[Session, Depends(get_session)],
    room_in: RoomCreate,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    background_tasks: BackgroundTasks,
):
    """
    Create a new room.
    Requires Admin privileges.
    """
    # Uniqueness check for room_id
    existing_room = room_crud.get_room_by_id(session, room_in.room_id)
    if existing_room:
        raise HTTPException(
            status_code=400, detail=f"Room with ID '{room_in.room_id}' already exists."
        )

    # Validate Parent Room
    if room_in.parent_room_id:
        parent_room = room_crud.get_room_by_id(session, room_in.parent_room_id)
        if not parent_room:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Parent room with ID '{room_in.parent_room_id}' not found.",
            )

    new_room = room_crud.create_room(session=session, room_in=room_in)
    
    background_tasks.add_task(manager.broadcast, {
        "type": "room_created",
        "data": {
            "room_id": new_room.room_id,
            "capacity": new_room.capacity,
            "is_active": new_room.is_active
        }
    })
    
    return new_room


@router.patch("/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: str,
    room_in: RoomUpdate,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_admin_user)],
    background_tasks: BackgroundTasks,
):
    """
    Update a room.
    Requires Admin privileges.
    """
    db_room = room_crud.get_room_by_id(session, room_id)
    if not db_room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Room not found."
        )

    # 1. Uniqueness check if room_id is being changed
    if room_in.room_id is not None and room_in.room_id != room_id:
        existing = room_crud.get_room_by_id(session, room_in.room_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room with ID '{room_in.room_id}' already exists.",
            )

    # 2. Hierarchy Check (Parent Validity and Cycles)
    if room_in.parent_room_id is not None:
        parent_room = room_crud.get_room_by_id(session, room_in.parent_room_id)
        if not parent_room:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Parent room with ID '{room_in.parent_room_id}' not found.",
            )

        if room_in.parent_room_id == room_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A room cannot be its own parent.",
            )

        # Cycle check
        # We need to trace up from the NEW parent
        # room_in.parent_room_id is a STRING here.
        current_check_id = room_in.parent_room_id
        depth = 0
        max_depth = 50
        while current_check_id and depth < max_depth:
            if current_check_id == room_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Hierarchy cycle detected: cannot set a descendant as parent.",
                )
            p_room = room_crud.get_room_by_id(session, current_check_id)
            if not p_room:
                break
            
            # Get parent's string ID for next iteration
            # p_room.parent_room_id is INT. We need to fetch that object to get the string ID.
            if p_room.parent_room_id:
                grandparent = session.get(Room, p_room.parent_room_id)
                current_check_id = grandparent.room_id if grandparent else None
            else:
                current_check_id = None
                
            depth += 1

    updated_room = room_crud.update_room(session, db_room, room_in)
    
    background_tasks.add_task(manager.broadcast, {
        "type": "room_updated",
        "data": {
            "room_id": updated_room.room_id,
            "capacity": updated_room.capacity,
            "is_active": updated_room.is_active
        }
    })
    
    return updated_room


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(
    room_id: str,
    session: Annotated[Session, Depends(get_session)],
    current_user: Annotated[User, Depends(get_current_admin_user)],
    background_tasks: BackgroundTasks,
):
    """
    Delete a room.
    """
    # ... (Same as your existing delete logic, but check Booking/Room models import)
    # Check if bookings exist
    statement = select(Booking).where(Booking.room_id == room_id)
    has_history = session.exec(statement).first()

    if has_history:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room has booking history and cannot be deleted. Please deactivate it instead.",
        )

    # Check children (using parent_room_id INT FK)
    # First get the room object to know its ID
    room_obj = room_crud.get_room_by_id(session, room_id)
    if not room_obj:
        raise HTTPException(status_code=404, detail="Room not found")
        
    statement = select(Room).where(Room.parent_room_id == room_obj.id)
    has_children = session.exec(statement).first()
    if has_children:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a parent room with associated child rooms.",
        )

    try:
        success = room_crud.delete_room(session, room_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Room not found."
            )
        
        background_tasks.add_task(manager.broadcast, {
            "type": "room_deleted",
            "data": {
                "room_id": room_id
            }
        })
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete room due to referential integrity.",
        )
    return None