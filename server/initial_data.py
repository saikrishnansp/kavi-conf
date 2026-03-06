from sqlmodel import Session, select
from app.core.database import engine, init_db
from app.db_models.user import User
from app.db_models.room import Room

def seed_data():
    init_db()
    with Session(engine) as session:
        # Seed Admin User
        admin_email = "admin@company.com"
        admin = session.exec(select(User).where(User.email == admin_email)).first()
        if not admin:
            admin = User(
                employee_id="ADM-001",
                email=admin_email,
                full_name="System Admin",
                position="Director" # This makes them admin in this system
            )
            session.add(admin)
            session.commit()
            print(f"Admin user created: {admin_email}")

        # Seed Rooms
        grand_hall_id = "ROOM-001"
        grand_hall = session.exec(select(Room).where(Room.room_id == grand_hall_id)).first()
        if not grand_hall:
            grand_hall = Room(
                room_id=grand_hall_id,
                name="Grand Hall",
                capacity=100,
                is_split=True
            )
            session.add(grand_hall)
            session.commit()
            session.refresh(grand_hall)
            
            # Sections A/B
            section_a = Room(
                room_id="ROOM-001A",
                name="Grand Hall Section A",
                capacity=50,
                is_split=False,
                parent_room_id=grand_hall.id
            )
            section_b = Room(
                room_id="ROOM-001B",
                name="Grand Hall Section B",
                capacity=50,
                is_split=False,
                parent_room_id=grand_hall.id
            )
            session.add(section_a)
            session.add(section_b)
            session.commit()
            print("Rooms seeded: Grand Hall + Sections A/B")

if __name__ == "__main__":
    seed_data()
