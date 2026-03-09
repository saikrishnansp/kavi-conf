from datetime import datetime, timedelta

from app.db_models.room_hold import RoomHold
from app.utils.tz import IST
from sqlmodel import Session, select


def is_room_held(session: Session, room_id: str, user_id: str) -> bool:
    """
    Checks if a room is currently held by someone ELSE.
    Returns True if held by others, False if free or held by current user.
    """
    now = datetime.now(IST)
    statement = select(RoomHold).where(
        RoomHold.room_id == room_id,
        RoomHold.user_id != user_id,
        RoomHold.expires_at > now,
    )
    result = session.exec(statement).first()
    return result is not None


def create_hold(
    session: Session, room_id: str, user_id: str, minutes: int = 5, commit: bool = True
) -> RoomHold:
    """
    Creates or updates a hold on a room.
    """
    # Check if user already has a hold on this room
    statement = select(RoomHold).where(
        RoomHold.room_id == room_id, RoomHold.user_id == user_id
    )
    existing_hold = session.exec(statement).first()

    expires_at = datetime.now(IST) + timedelta(minutes=minutes)

    if existing_hold:
        existing_hold.expires_at = expires_at
        session.add(existing_hold)
        if commit:
            session.commit()
            session.refresh(existing_hold)
        return existing_hold

    new_hold = RoomHold(room_id=room_id, user_id=user_id, expires_at=expires_at)
    session.add(new_hold)
    if commit:
        session.commit()
        session.refresh(new_hold)
    return new_hold


def delete_hold(session: Session, room_id: str, user_id: str, commit: bool = True):
    """
    Removes a hold.
    """
    statement = select(RoomHold).where(
        RoomHold.room_id == room_id, RoomHold.user_id == user_id
    )
    hold = session.exec(statement).first()
    if hold:
        session.delete(hold)
        if commit:
            session.commit()


def cleanup_expired_holds(session: Session, commit: bool = True) -> list[str]:


    """


    Removes all expired holds. Returns a list of room_ids that were released.


    """


    now = datetime.now(IST)


    statement = select(RoomHold).where(RoomHold.expires_at <= now)


    expired_holds = session.exec(statement).all()


    room_ids = [h.room_id for h in expired_holds]


    for hold in expired_holds:


        session.delete(hold)


    if room_ids and commit:


        session.commit()


    return room_ids

