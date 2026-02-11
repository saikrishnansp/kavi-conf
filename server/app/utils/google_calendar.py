import uuid
from datetime import datetime
from typing import List, Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app.core.config import get_settings
from app.utils.logging import logger

settings = get_settings()

SCOPES = ['https://www.googleapis.com/auth/calendar']

def get_calendar_service(user_token: str):
    """
    Initializes and returns the Google Calendar API service using a user's OAuth token.
    """
    try:
        creds = Credentials(token=user_token)
        return build('calendar', 'v3', credentials=creds)
    except Exception as e:
        logger.error(f"Failed to initialize Google Calendar service: {e}")
        return None

def create_google_calendar_event(
    subject: str,
    start_time: datetime,
    end_time: datetime,
    attendees_emails: List[str],
    user_token: str,
    description: Optional[str] = None,
):
    """
    Creates a Google Calendar event and returns the Meet link and HTML link.
    """
    service = get_calendar_service(user_token)
    if not service:
        logger.error("Could not initialize Google Calendar service (token likely expired or invalid)")
        return None, None

    # Deduplicate and format attendees
    attendees = [{"email": email} for email in sorted(list(set(attendees_emails)))]

    event = {
        'summary': subject,
        'description': description or "",
        'start': {
            'dateTime': start_time.isoformat(),
            'timeZone': 'Asia/Kolkata', # Default project timezone
        },
        'end': {
            'dateTime': end_time.isoformat(),
            'timeZone': 'Asia/Kolkata',
        },
        'attendees': attendees,
        'conferenceData': {
            'createRequest': {
                'requestId': str(uuid.uuid4()),
                'conferenceSolutionKey': {'type': 'hangoutsMeet'}
            }
        }
    }

    try:
        created_event = service.events().insert(
            calendarId=settings.GOOGLE_CALENDAR_ID,
            body=event,
            conferenceDataVersion=1,
            sendUpdates='all' 
        ).execute()

        # Improved Meet link extraction: search for 'video' entry point
        meet_link = None
        conference_data = created_event.get('conferenceData', {})
        entry_points = conference_data.get('entryPoints', [])
        
        for entry in entry_points:
            if entry.get('entryPointType') == 'video':
                meet_link = entry.get('uri')
                break
        
        # Fallback to first entry point if no video type found
        if not meet_link and entry_points:
            meet_link = entry_points[0].get('uri')
            
        html_link = created_event.get('htmlLink')

        logger.info(f"Successfully created Google Calendar event: {html_link}")
        return meet_link, html_link
    except Exception as e:
        logger.error(f"Google Calendar API Error: {str(e)}")
        return None, None
