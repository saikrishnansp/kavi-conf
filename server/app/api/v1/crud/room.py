from typing import List, Tuple, Optional
from sqlmodel import Session, select, func
from sqlalchemy.exc import IntegrityError
from app.db_models.room import Room
from app.schema.room import RoomCreate, RoomUpdate


def get_all_rooms(
    session: Session, skip: int = 0, limit: int = 10, active_only: bool = False
) -> Tuple[List[Room], int]:
    query = select(Room)
    if active_only:
        query = query.where(Room.is_active == True)

    count_query = select(func.count()).select_from(Room)
    if active_only:
        count_query = count_query.where(Room.is_active == True)

    total = session.exec(count_query).one()

    statement = query.offset(skip).limit(limit)
    items = session.exec(statement).all()
    
    return items, total


def get_room_by_id(session: Session, room_id: str, for_update: bool = False) -> Room | None:
    statement = select(Room).where(Room.room_id == room_id)
    if for_update:
        statement = statement.with_for_update()
    return session.exec(statement).first()


def get_room_hierarchy(session: Session, room_id: str) -> List[str]:
    """
    Returns a list of room_ids including the room itself, all its ancestors,
    and all its descendants.
    """
    room = get_room_by_id(session, room_id)
    if not room:
        return [room_id]

    all_related_ids = {room.room_id}

    # 1. Traverse Up (Ancestors)
    curr = room
    while curr.parent_room_id:
        parent = get_room_by_id(session, curr.parent_room_id)
        if not parent:
            break
        if parent.room_id in all_related_ids:  # Cycle detection safety
            break
        all_related_ids.add(parent.room_id)
        curr = parent

    # 2. Traverse Down (Descendants)
    queue = [room.room_id]
    while queue:
        current_room_id = queue.pop(0)
        statement = select(Room).where(Room.parent_room_id == current_room_id)
        children = session.exec(statement).all()
        
        for child in children:
            if child.room_id not in all_related_ids:
                all_related_ids.add(child.room_id)
                queue.append(child.room_id)

    return list(all_related_ids)


def _sync_parent_split_status(session: Session, parent_room_id: str | None):
    """
    Updates the is_split flag of a parent room based on the existence of child rooms.
    """
    if not parent_room_id:
        return

    parent = get_room_by_id(session, parent_room_id)
    if not parent:
        return

    # Check if this parent has any active children
    statement = select(func.count()).where(Room.parent_room_id == parent_room_id)
    count = session.exec(statement).one()

    new_is_split = count > 0
    if parent.is_split != new_is_split:
        parent.is_split = new_is_split
        session.add(parent)


def create_room(session: Session, room_in: RoomCreate, commit: bool = True) -> Room:
    db_room = Room(
        room_id=room_in.room_id,
        capacity=room_in.capacity,
        amenities=room_in.amenities,
        is_split=room_in.is_split,
        parent_room_id=room_in.parent_room_id,
        is_active=True # Default new rooms to active
    )

    session.add(db_room)
    session.flush()

    # Sync parent's is_split status
    if db_room.parent_room_id:
        _sync_parent_split_status(session, db_room.parent_room_id)

    if commit:
        session.commit()
        session.refresh(db_room)
    return db_room


def update_room(
    session: Session, db_room: Room, room_in: RoomUpdate, commit: bool = True
) -> Room:
    """
    Updates a room's data and synchronizes hierarchy flags.
    """
    old_parent_room_id = db_room.parent_room_id
    
    room_data = room_in.model_dump(exclude_unset=True)
    
    # room_id is the primary key. If we update it, we might cause issues with FKs.
    # However, standard SQLModel update should handle it if 'room_id' is in data.
    # Let's handle 'room_id' specially if it's changing (though usually not recommended for PKs)
            
    for key, value in room_data.items():
        if hasattr(db_room, key) and key != "room_number": # room_number is frontend-only
            setattr(db_room, key, value)

    new_parent_room_id = db_room.parent_room_id

    session.add(db_room)

    # If parent changed, sync both old and new parents
    if old_parent_room_id != new_parent_room_id:
        if old_parent_room_id:
            _sync_parent_split_status(session, old_parent_room_id)
        if new_parent_room_id:
            _sync_parent_split_status(session, new_parent_room_id)

    if commit:
        session.commit()
        session.refresh(db_room)
    return db_room


def delete_room(session: Session, room_id: str, commit: bool = True) -> bool:
    """
    Deletes a room by its room_id and synchronizes its parent's split status.
    """
    db_room = get_room_by_id(session, room_id)
    if not db_room:
        return False

    parent_room_id = db_room.parent_room_id

    try:
        session.delete(db_room)
        session.flush()

        if parent_room_id:
            _sync_parent_split_status(session, parent_room_id)

        if commit:
            session.commit()
    except IntegrityError:
        if commit:
            session.rollback()
        raise

    return True
