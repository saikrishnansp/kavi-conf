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
    
    # We need to map the internal INT parent_room_id back to STRING room_id for the response?
    # The Pydantic model expects string `parent_room_id`. 
    # If the frontend relies on that, we might need to populate it.
    # However, standard SQLModel return is usually sufficient if the frontend matches IDs.
    return items, total


def get_room_by_id(session: Session, room_id: str, for_update: bool = False) -> Room | None:
    if for_update:
        return session.exec(
            select(Room).where(Room.room_id == room_id).with_for_update()
        ).first()
    return session.exec(select(Room).where(Room.room_id == room_id)).first()


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
    # parent_room_id in DB is an INTEGER (Foreign Key to id)
    curr = room
    while curr.parent_room_id:
        parent = session.get(Room, curr.parent_room_id) # Fetch by INT id
        if not parent:
            break
        if parent.room_id in all_related_ids:  # Cycle detection safety
            break
        all_related_ids.add(parent.room_id)
        curr = parent

    # 2. Traverse Down (Descendants)
    # We need to find rooms where parent_room_id == current's INT ID
    queue = [room]
    while queue:
        current_node = queue.pop(0)
        if not current_node.id: 
            continue
            
        statement = select(Room).where(Room.parent_room_id == current_node.id)
        children = session.exec(statement).all()
        
        for child in children:
            if child.room_id not in all_related_ids:
                all_related_ids.add(child.room_id)
                queue.append(child)

    return list(all_related_ids)


def _sync_parent_split_status(session: Session, parent_int_id: int | None):
    """
    Updates the is_split flag of a parent room based on the existence of child rooms.
    Takes the INTEGER PK of the parent.
    """
    if not parent_int_id:
        return

    parent = session.get(Room, parent_int_id)
    if not parent:
        return

    # Check if this parent has any active children
    statement = select(func.count()).where(Room.parent_room_id == parent_int_id)
    count = session.exec(statement).one()

    new_is_split = count > 0
    if parent.is_split != new_is_split:
        parent.is_split = new_is_split
        session.add(parent)


def create_room(session: Session, room_in: RoomCreate, commit: bool = True) -> Room:
    # 1. Convert parent_room_id (String) to parent_id (Int)
    parent_int_id = None
    if room_in.parent_room_id:
        parent_obj = get_room_by_id(session, room_in.parent_room_id)
        if parent_obj:
            parent_int_id = parent_obj.id

    # 2. Manual mapping to ignore 'room_number' and handle parent ID
    db_room = Room(
        room_id=room_in.room_id,
        name=room_in.name,
        capacity=room_in.capacity,
        is_split=room_in.is_split,
        parent_room_id=parent_int_id,
        is_active=True # Default new rooms to active
    )

    session.add(db_room)
    session.flush() # Flush to get the new ID for db_room

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
    old_parent_int_id = db_room.parent_room_id
    
    room_data = room_in.model_dump(exclude_unset=True)
    
    # Handle parent_room_id conversion (Str -> Int)
    if "parent_room_id" in room_data:
        parent_str = room_data.pop("parent_room_id")
        if parent_str:
            parent_obj = get_room_by_id(session, parent_str)
            if parent_obj:
                db_room.parent_room_id = parent_obj.id
            else:
                db_room.parent_room_id = None
        else:
            db_room.parent_room_id = None
            
    # Handle other fields (skip room_number)
    for key, value in room_data.items():
        if hasattr(db_room, key) and key != "id":
            setattr(db_room, key, value)

    new_parent_int_id = db_room.parent_room_id

    session.add(db_room)

    # If parent changed, sync both old and new parents
    if old_parent_int_id != new_parent_int_id:
        if old_parent_int_id:
            _sync_parent_split_status(session, old_parent_int_id)
        if new_parent_int_id:
            _sync_parent_split_status(session, new_parent_int_id)

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

    parent_int_id = db_room.parent_room_id

    try:
        session.delete(db_room)
        # Flush to ensure count in _sync_parent_split_status is correct before commit
        session.flush()

        if parent_int_id:
            _sync_parent_split_status(session, parent_int_id)

        if commit:
            session.commit()
    except IntegrityError:
        if commit:
            session.rollback()
        raise

    return True