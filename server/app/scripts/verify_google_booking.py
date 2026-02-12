"""
Verification Script for Google Calendar Integration (sendUpdates & Organizer check).
"""
import sys
import os
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta

# Add parent directory to path to import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.api.v1.endpoint.bookings import create_booking
from app.db_models.user import User
from app.db_models.booking import Booking
from app.db_models.enums import BookingStatus
from app.schema.booking import BookingCreate

def verify_google_logic():
    print("🚀 Verifying Google Calendar Notification Logic...")
    
    # 1. Setup Mocks
    mock_session = MagicMock()
    mock_current_user = User(
        employee_id="EMP001",
        email="organizer@example.com",
        full_name="Organizer Name",
        position="Manager",
        is_admin=False
    )
    mock_background_tasks = MagicMock()

    # Mock all internal dependencies of the endpoint
    with (
        patch('app.api.v1.crud.room.get_room_by_id') as mock_get_room,
        patch('app.api.v1.crud.room.get_room_hierarchy') as mock_get_hierarchy,
        patch('app.api.v1.crud.room_hold.is_room_held') as mock_is_held,
        patch('app.api.v1.crud.room_hold.create_hold'),
        patch('app.api.v1.crud.room_hold.delete_hold'),
        patch('app.api.v1.crud.booking.resolve_attendees') as mock_resolve,
        patch('app.api.v1.crud.booking.check_availability') as mock_check_avail,
        patch('app.api.v1.crud.booking.check_attendee_availability') as mock_check_attendee,
        patch('app.api.v1.crud.booking.create_booking') as mock_create_db_booking,
        patch('app.api.v1.crud.booking.hydrate_attendees') as mock_hydrate,
        patch('app.utils.google_calendar.get_calendar_service') as mock_get_service,
        patch('app.core.dbsession.transaction_scope'),
        patch('app.core.websocket.manager.broadcast')
    ):
        # Setup mock returns
        mock_room = MagicMock()
        mock_room.room_id = "ROOM1"
        mock_room.is_active = True
        mock_room.capacity = 10
        mock_get_room.return_value = mock_room
        mock_get_hierarchy.return_value = ["ROOM1"]
        mock_is_held.return_value = False
        mock_resolve.return_value = [{"email": "attendee@example.com", "employee_id": "EMP002", "full_name": "Attendee", "position": "Dev"}]
        mock_check_avail.return_value = True
        mock_check_attendee.return_value = []
        mock_hydrate.return_value = []
        
        # Mock Google response
        service_mock = MagicMock()
        mock_get_service.return_value = service_mock
        events_mock = service_mock.events.return_value
        insert_mock = events_mock.insert.return_value
        insert_mock.execute.return_value = {
            "id": "event_123",
            "htmlLink": "http://calendar",
            "conferenceData": {"entryPoints": [{"entryPointType": "video", "uri": "http://meet"}]}
        }

        # Mock DB booking return
        mock_db_booking = Booking(
            id=1,
            room_id="ROOM1",
            user_id="EMP001",
            start_time=datetime.now(),
            end_time=datetime.now() + timedelta(hours=1),
            subject="Verification Meeting",
            attendee_count=1,
            status=BookingStatus.CONFIRMED,
            created_at=datetime.now(),
            google_event_id="event_123"
        )
        mock_db_booking.attendees_list = []
        mock_create_db_booking.return_value = mock_db_booking

        # 2. Execute call
        booking_in = BookingCreate(
            room_id="ROOM1",
            start_time=datetime.now() + timedelta(hours=1),
            end_time=datetime.now() + timedelta(hours=2),
            subject="Verification Meeting",
            attendees=["attendee@example.com"]
        )

        create_booking(
            booking_in=booking_in,
            session=mock_session,
            current_user=mock_current_user,
            background_tasks=mock_background_tasks,
            x_google_token="fake-google-token"
        )

        # 3. Assertions
        
        # A. Verify sendUpdates='all'
        assert events_mock.insert.called, "Google API insert was not called"
        call_args = events_mock.insert.call_args
        assert call_args.kwargs.get('sendUpdates') == 'all', "sendUpdates='all' was NOT passed to Google API"
        print("✅ Assertion Passed: sendUpdates='all' was passed to Google API.")

        # B. Verify Organizer Inclusion
        body = call_args.kwargs.get('body', {})
        attendees = body.get('attendees', [])
        emails = [a['email'] for a in attendees]
        assert mock_current_user.email in emails, f"Organizer {mock_current_user.email} was NOT included in attendees sent to Google"
        print(f"✅ Assertion Passed: Organizer {mock_current_user.email} included in Google attendees.")

    print("\n✨ GOOGLE LOGIC VERIFICATION SUCCESSFUL! ✨")

if __name__ == "__main__":
    try:
        verify_google_logic()
    except Exception as e:
        print(f"❌ Verification Failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
