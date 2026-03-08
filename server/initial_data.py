from sqlmodel import Session, select
from app.core.dbsession import engine
from app.db_models.user import User
from app.db_models.room import Room
from app.db_models.booking import Booking
from app.db_models.booking_attendee import BookingAttendee
from app.db_models.room_hold import RoomHold
from app.db_models.enums import BookingStatus
from datetime import datetime, timedelta
from app.utils.tz import IST

def seed_data():
    with Session(engine) as session:
        # 1. Create Users
        if not session.exec(select(User)).first():
            admin = User(
                employee_id="ADMIN001",
                email="admin@kaviglobal.com",
                full_name="System Admin",
                position="Director",
            )
            user1 = User(
                employee_id="DATS-1001",
                email="user1@kaviglobal.com",
                full_name="John Doe",
                position="Developer",
            )
            session.add(admin)
            session.add(user1)

        # 2. Create Rooms
        if not session.exec(select(Room)).first():
            room1 = Room(
                room_id="ROOM-001",
                capacity=100,
                amenities="Projector, Sound System, Stage",
                is_split=True,
                is_active=True
            )
            session.add(room1)
            session.flush()

            room1a = Room(
                room_id="ROOM-001A",
                capacity=50,
                amenities="Projector, Whiteboard",
                is_split=False,
                parent_room_id="ROOM-001",
                is_active=True
            )
            room1b = Room(
                room_id="ROOM-001B",
                capacity=50,
                amenities="Whiteboard, TV",
                is_split=False,
                parent_room_id="ROOM-001",
                is_active=True
            )
            session.add(room1a)
            session.add(room1b)

        session.commit()
        print("✅ Initial data seeded successfully!")

if __name__ == "__main__":
    seed_data()
