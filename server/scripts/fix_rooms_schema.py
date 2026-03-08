from sqlmodel import SQLModel, Session, select, text
import sys
import os

# Add the parent directory to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.dbsession import engine
from app.db_models.room import Room
from app.db_models.booking import Booking
from app.db_models.room_hold import RoomHold
from initial_data import seed_data

def fix_schema():
    print("🛠 Starting database schema fix...")
    
    # We use raw SQL to drop tables in order to handle foreign key constraints safely
    with engine.connect() as conn:
        print("⚠️ Dropping existing tables to ensure clean state...")
        # Disable foreign key checks to allow dropping tables with relationships
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        
        # Drop tables if they exist
        tables = ["room_holds", "bookings", "rooms"]
        for table in tables:
            conn.execute(text(f"DROP TABLE IF EXISTS {table};"))
            print(f"  - Dropped table: {table}")
        
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        conn.commit()
    
    print("🏗 Recreating all tables with current models...")
    SQLModel.metadata.create_all(engine)
    print("✅ Tables recreated successfully.")

    print("🌱 Seeding initial data...")
    try:
        seed_data()
        print("✅ Data seeded successfully.")
    except Exception as e:
        print(f"❌ Error during seeding: {e}")

if __name__ == "__main__":
    fix_schema()
    print("\n✨ Database fix complete. You can now start the server.")
