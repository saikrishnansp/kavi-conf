import httpx
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"

def verify_google_booking():
    print("🚀 Google Calendar Integration Verification")
    
    # Step 1: Login to get JWT
    login_data = {
        "email": "ceo@kaviglobal.com", # Using CEO as per seed availability, or adjust as needed
        "password": "Password123!@"
    }
    
    with httpx.Client() as client:
        print(f"Logging in as {login_data['email']}...")
        response = client.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code != 200:
            print(f"❌ Login failed: {response.text}")
            return
        
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 2: Prompt for Google Token
        print("
Prerequisite: You must have a valid Google Access Token (with 'https://www.googleapis.com/auth/calendar.events' scope).")
        google_token = input("Paste a valid Google Access Token: ").strip()
        
        if not google_token:
            print("❌ Google token is required.")
            return

        # Step 3: Send Booking Request
        # Get a valid room first
        rooms_resp = client.get(f"{BASE_URL}/rooms/", headers=headers)
        if not rooms_resp.json().get("items"):
            print("❌ No rooms available to book.")
            return
        
        room_id = rooms_resp.json()["items"][0]["room_id"]
        
        start_time = (datetime.now() + timedelta(days=2)).replace(hour=10, minute=0, second=0, microsecond=0)
        end_time = start_time + timedelta(hours=1)
        
        booking_payload = {
            "room_id": room_id,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "subject": "E2E Validation Meeting",
            "description": "Validating Google Calendar Integration via Script",
            "attendees": ["sreerag.mahesh@kaviglobal.com"]
        }
        
        print(f"
Creating booking for room '{room_id}'...")
        headers["x-google-token"] = google_token
        
        response = client.post(f"{BASE_URL}/bookings/", json=booking_payload, headers=headers)
        
        # Step 4: Validate Response
        if response.status_code == 201:
            data = response.json()
            meet_link = data.get("meet_link")
            calendar_link = data.get("calendar_link")
            
            print("
✅ Booking Created Successfully!")
            print(f"   Booking ID: {data.get('id')}")
            print(f"   Meet Link: {meet_link}")
            print(f"   Calendar Link: {calendar_link}")
            
            if meet_link and meet_link.startswith("https://meet.google.com/"):
                print("
🌟 VALIDATION PASSED: Google Meet link generated correctly.")
            else:
                print("
⚠️ VALIDATION FAILED: Meet link is missing or invalid.")
        else:
            print(f"
❌ Booking failed with status {response.status_code}:")
            print(response.text)

if __name__ == "__main__":
    verify_google_booking()
