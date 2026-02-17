import uuid
from datetime import datetime
from typing import List, Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app.core.config import get_settings
from app.utils.logging import logger

settings = get_settings()

SCOPES = ['https://www.googleapis.com/auth/calendar']

FOOTER_ADDRESS = """

📍 LOCATION:
1st floor, Hari Krupa, 71/1, McNichols Rd, Dasspuram, Chetpet, Chennai, Tamil Nadu 600031.
[https://maps.app.goo.gl/vTe7542HSt37uQrS7](https://maps.app.goo.gl/vTe7542HSt37uQrS7)"""

def get_calendar_service(user_token: str, refresh_token: Optional[str] = None):
    """
    Initializes and returns the Google Calendar API service.
    If refresh_token is provided, it handles automatic token refreshing.
    """
    try:
        creds = Credentials(
            token=user_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
        )
        return build('calendar', 'v3', credentials=creds)
    except Exception as e:
        logger.error(f"Failed to initialize Google Calendar service: {e}")
        return None

def create_event(
    subject: str,
    start_time: datetime,
    end_time: datetime,
    attendees_emails: List[str],
    user_token: str,
    refresh_token: Optional[str] = None,
    description: Optional[str] = None,
    send_updates: str = "all",
    additional_dates: Optional[List[datetime]] = None,
):
    """
    Creates a Google Calendar event and returns the Meet link and HTML link.
    If additional_dates is provided, it creates a recurring event using RDATE.
    """
    service = get_calendar_service(user_token, refresh_token)
    if not service:
        logger.error("Could not initialize Google Calendar service (token likely expired or invalid)")
        return None, None, None

    # Deduplicate and format attendees
    attendees = [{"email": email} for email in sorted(list(set(attendees_emails)))]

    # Append footer to description
    full_description = (description or "") + FOOTER_ADDRESS

    event = {
        'summary': subject,
        'description': full_description,
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

    # Handle Multi-date using RDATE
    if additional_dates:
        # RDATE format: RDATE;TZID=Asia/Kolkata:YYYYMMDDTHHMMSS
        # We include the original start_time as well if needed, but RDATE usually 
        # defines additional instances besides the one defined by 'start'.
        rdate_values = []
        for d in additional_dates:
            # Sync the time parts from the primary start_time
            dt_to_add = d.replace(
                hour=start_time.hour, 
                minute=start_time.minute, 
                second=start_time.second, 
                microsecond=0
            )
            rdate_values.append(dt_to_add.strftime("%Y%m%dT%H%M%S"))
        
        if rdate_values:
            event['recurrence'] = [f"RDATE;TZID=Asia/Kolkata:{','.join(rdate_values)}"]

    try:
        created_event = service.events().insert(
            calendarId=settings.GOOGLE_CALENDAR_ID,
            body=event,
            conferenceDataVersion=1,
            sendUpdates=send_updates
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
        event_id = created_event.get('id')

        logger.info(f"Successfully created Google Calendar event: {html_link}")
        return meet_link, html_link, event_id
    except Exception as e:
        logger.error(f"Google Calendar API Error: {str(e)}")
        return None, None, None

def update_event(
    event_id: str,
    subject: str,
    start_time: datetime,
    end_time: datetime,
    attendees_emails: List[str],
    user_token: str,
    refresh_token: Optional[str] = None,
    description: Optional[str] = None,
    send_updates: str = "all",
):
    """
    Updates a Google Calendar event.
    """
    service = get_calendar_service(user_token, refresh_token)
    if not service:
        logger.error("Could not initialize Google Calendar service")
        return False

    # Get current event to preserve conference data if any
    try:
        event = service.events().get(calendarId=settings.GOOGLE_CALENDAR_ID, eventId=event_id).execute()
    except Exception as e:
        logger.error(f"Failed to fetch event for update: {e}")
        return False

    attendees = [{"email": email} for email in sorted(list(set(attendees_emails)))]

    event.update({
        'summary': subject,
        'description': description or "",
        'start': {
            'dateTime': start_time.isoformat(),
            'timeZone': 'Asia/Kolkata',
        },
        'end': {
            'dateTime': end_time.isoformat(),
            'timeZone': 'Asia/Kolkata',
        },
        'attendees': attendees,
    })

    try:
        service.events().update(
            calendarId=settings.GOOGLE_CALENDAR_ID,
            eventId=event_id,
            body=event,
            sendUpdates=send_updates
        ).execute()
        logger.info(f"Successfully updated Google Calendar event: {event_id}")
        return True
    except Exception as e:
        logger.error(f"Google Calendar API Update Error: {str(e)}")
        return False

def delete_event(
    event_id: str,
    user_token: str,
    refresh_token: Optional[str] = None,
    send_updates: str = "all",
    booking_start_time: Optional[datetime] = None,
):
    """
    Deletes a Google Calendar event.
    If booking_start_time is provided and the event is a series (using RDATE),
    it removes just that specific instance from the series.
    """
    service = get_calendar_service(user_token, refresh_token)
    if not service:
        logger.error("Could not initialize Google Calendar service")
        return False

    try:
        if booking_start_time:
            # Fetch the existing event to check for recurrence
            event = service.events().get(
                calendarId=settings.GOOGLE_CALENDAR_ID,
                eventId=event_id
            ).execute()
            
            recurrence = event.get('recurrence', [])
            rdate_rule = next((r for r in recurrence if r.startswith("RDATE")), None)
            
            if rdate_rule:
                # Event is a series. Handle RDATE removal.
                # Format: RDATE;TZID=Asia/Kolkata:YYYYMMDDTHHMMSS,YYYYMMDDTHHMMSS...
                prefix, datetimes_str = rdate_rule.split(":")
                dates_list = datetimes_str.split(",")
                
                # Check if this specific instance is the primary start_time
                event_start_iso = event.get('start', {}).get('dateTime')
                # Simple check: compare date parts
                target_rdate_str = booking_start_time.strftime("%Y%m%dT%H%M%S")
                
                # Filter out the target date
                new_dates_list = [d for d in dates_list if d != target_rdate_str]
                
                if not new_dates_list:
                    # No more RDATEs left. 
                    # Is the target also the primary event start?
                    # If it's the only one left, or we're deleting the primary 
                    # and there are no RDATEs, just delete.
                    # Actually, if new_dates_list is empty, we just remove the 'recurrence' field or delete.
                    event.pop('recurrence', None)
                    # If we just removed the only recurrence, and the primary date matches, 
                    # we should delete the whole thing.
                    # For simplicity, if no RDATEs remain, we keep it as a single event 
                    # unless it's specifically being canceled too.
                    # However, if it's the LAST instance being canceled, we delete.
                    # Let's check if the primary start matches the target.
                    from app.utils.validation import ensure_tz_aware
                    primary_start = ensure_tz_aware(datetime.fromisoformat(event_start_iso.replace('Z', '+00:00')))
                    if abs((primary_start - booking_start_time).total_seconds()) < 60:
                        # It's the primary instance and no more RDATEs. Delete everything.
                        service.events().delete(
                            calendarId=settings.GOOGLE_CALENDAR_ID,
                            eventId=event_id,
                            sendUpdates=send_updates
                        ).execute()
                        logger.info(f"Successfully deleted entire Google event: {event_id}")
                    else:
                        # It's not the primary, but we've removed all RDATEs. 
                        # Update the event to remove recurrence.
                        service.events().patch(
                            calendarId=settings.GOOGLE_CALENDAR_ID,
                            eventId=event_id,
                            body=event,
                            sendUpdates=send_updates
                        ).execute()
                        logger.info(f"Removed recurrence from Google event: {event_id}")
                else:
                    # Update with new RDATE list
                    event['recurrence'] = [f"{prefix}:{','.join(new_dates_list)}"]
                    service.events().patch(
                        calendarId=settings.GOOGLE_CALENDAR_ID,
                        eventId=event_id,
                        body=event,
                        sendUpdates=send_updates
                    ).execute()
                    logger.info(f"Removed {target_rdate_str} from RDATE series: {event_id}")
                return True

        # Normal full deletion
        service.events().delete(
            calendarId=settings.GOOGLE_CALENDAR_ID,
            eventId=event_id,
            sendUpdates=send_updates
        ).execute()
        logger.info(f"Successfully deleted Google Calendar event: {event_id}")
        return True
    except Exception as e:
        logger.error(f"Google Calendar API Delete Error: {str(e)}")
        return False

def list_events(
    user_token: str,
    start_time: datetime,
    end_time: datetime,
    refresh_token: Optional[str] = None,
) -> List[dict]:
    """
    Lists Google Calendar events for a given time range.
    """
    service = get_calendar_service(user_token, refresh_token)
    if not service:
        logger.error("Could not initialize Google Calendar service")
        return []

    try:
        events_result = service.events().list(
            calendarId=settings.GOOGLE_CALENDAR_ID,
            timeMin=start_time.isoformat(),
            timeMax=end_time.isoformat(),
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        formatted_events = []
        for event in events:
            formatted_events.append({
                'id': event.get('id'),
                'summary': event.get('summary', '(No title)'),
                'start': event.get('start', {}).get('dateTime') or event.get('start', {}).get('date'),
                'end': event.get('end', {}).get('dateTime') or event.get('end', {}).get('date'),
                'location': event.get('location'),
                'htmlLink': event.get('htmlLink')
            })
        return formatted_events
    except Exception as e:
        logger.error(f"Google Calendar API List Error: {str(e)}")
        return []
