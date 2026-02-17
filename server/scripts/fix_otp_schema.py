"""
Fix User Table Schema: Add missing OTP columns (otp_code, otp_expires_at).
"""
import sys
import os
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

# Add the server directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.dbsession import engine

def fix_schema():
    print("Repairing user table schema for OTP support...")
    
    commands = [
        "ALTER TABLE users ADD COLUMN otp_code VARCHAR(10) DEFAULT NULL",
        "ALTER TABLE users ADD COLUMN otp_expires_at DATETIME DEFAULT NULL"
    ]
    
    with engine.connect() as conn:
        for cmd in commands:
            try:
                print(f"Executing: {cmd}")
                conn.execute(text(cmd))
                conn.commit()
                print("✅ Success.")
            except OperationalError as e:
                if "duplicate column" in str(e).lower() or "Duplicate column" in str(e):
                    print(f"ℹ️ Column already exists (Skipping).")
                elif "Unknown column" in str(e).lower():
                     # Sometimes happens if table doesn't exist, though unlikely here
                    print(f"❌ Error: {e}")
                else:
                    print(f"⚠️ Warning: {e}")
            except Exception as e:
                print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    fix_schema()
