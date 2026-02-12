"""
E2E Booking Verification Script using FastAPI TestClient.
"""
import sys
import os
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta

# Add parent directory to path to import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from main import app
from app.core.security import get_current_user, get_google_token
from app.db_models.user import User
from app.db_models.enums import BookingStatus

client = TestClient(app)

def verify_e2e():
    print("🚀 Starting E2E Booking Verification (API Level)...")
    
    # 1. Setup - Mock Auth
    mock_user = User(
        employee_id="TEST-001",
        email="test-organizer@kaviglobal.com",
        full_name="Test Organizer",
        position="Developer",
        is_admin=False
    )
    
    def override_get_current_user():
        return mock_user
    
    def override_get_google_token():
        return "fake-google-token"

    app.dependency_overrides[get_current_user] = override_get_current_user
    app.dependency_overrides[get_google_token] = override_get_google_token

    # 2. Mock Google Calendar Service
    with patch('app.utils.google_calendar.get_calendar_service') as mock_get_service:
        service_mock = MagicMock()
        mock_get_service.return_value = service_mock
        events_mock = service_mock.events.return_value
        insert_mock = events_mock.insert.return_value
        insert_mock.execute.return_value = {
            "id": "google_event_123",
            "htmlLink": "https://calendar/link",
            "conferenceData": {
                "entryPoints": [{"entryPointType": "video", "uri": "https://meet/link"}]
            }
        }

        # 3. Prepare Payload
        import random
        random_hour = random.randint(10, 500)
        start_time = datetime.now() + timedelta(hours=random_hour)
        end_time = start_time + timedelta(hours=1)
        
        payload = {
            "room_id": "101-Conf",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "subject": "E2E Verification Meeting",
            "description": "Testing Meet link and attendee notification logic",
            "attendees": ["attendee1@kaviglobal.com"]
        }

        # 4. Execute POST Request
        print(f"Creating booking via API for {mock_user.email}...")
        response = client.post("/api/v1/bookings", json=payload, headers={"x-google-token": "fake-token"})
        
        # 5. Assertions
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        print(f"✅ Booking Created with ID: {data['id']}")
        
        assert data["meet_link"] == "https://meet/link", "Meet link was not saved!"
        assert data["calendar_link"] == "https://calendar/link", "Calendar link was not saved!"
        assert data["google_event_id"] == "google_event_123", "google_event_id was not saved!"
        
        print("✅ Assertion Passed: Meet, Calendar links & google_event_id found in response.")
        
        # Verify attendees count (1 provided + 1 organizer)
        assert len(data["attendees"]) == 2, f"Expected 2 attendees, found {len(data['attendees'])}"
        emails = [a["email"] for a in data["attendees"]]
        assert mock_user.email in emails, "Organizer missing from attendees!"
        
        print("✅ Assertion Passed: Organizer automatically included in attendees.")
        print("\n✨ E2E API VERIFICATION SUCCESSFUL! ✨")

    # Clean up overrides
    app.dependency_overrides.clear()

if __name__ == "__main__":
    try:
        verify_e2e()
    except Exception as e:
        print(f"❌ Verification Failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
