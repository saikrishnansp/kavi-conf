import re
from datetime import datetime


def validate_email_domain(v: str) -> str:
    if not (v.endswith("@kaviglobal.com") or v.endswith("@kavisoftware.com")):
        raise ValueError("Kindly enter a valid email id please!")
    return v


def validate_employee_id(v: str) -> str:
    """
    Validates employee ID format.
    Allowed patterns:
    - DATS- followed by numbers (e.g., DATS-1001)
    - TEST_ or TEST- followed by numbers (e.g., TEST_005)
    - ADMIN followed by numbers (e.g., ADMIN001)
    """
    pattern = r"^(DATS-|TEST[-_])\d+$|^ADMIN\d+$"
    if not re.match(pattern, v):
        raise ValueError(
            "Invalid Employee ID format. Must be DATS-123, TEST-123, TEST_123, or ADMIN123."
        )
    return v


def ensure_tz_aware(v: datetime) -> datetime:
    """
    Ensures that the given datetime is timezone-aware and converted to IST.
    If naive, it's assumed to be IST already (as per project conventions) 
    and just given the IST timezone info.
    """
    from app.utils.tz import IST
    if v.tzinfo is None:
        return v.replace(tzinfo=IST)
    return v.astimezone(IST)


def validate_booking_times(start_time: datetime, end_time: datetime) -> None:
# ...
    from app.utils.tz import IST

    now = datetime.now(IST)

    # Ensure timezone awareness for comparison
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=IST)
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=IST)

    if start_time <= now.replace(minute=now.minute - 5 if now.minute >= 5 else 0):
        # Allow 5 mins grace for network latency/server processing
        if start_time <= now.replace(second=0, microsecond=0) - timedelta(minutes=5):
             raise ValueError("Booking start time must be in the future")

    if end_time <= start_time:
        raise ValueError("End time must be after start time")


def validate_db_name(v: str) -> str:
# ... (existing code)
    return v


def validate_room_hierarchy(rooms_data: list[dict]) -> list[str]:
    """
    Checks for cycles in room hierarchy given a list of rooms with 'id' and 'parent_room_id'.
    Returns a list of room IDs that are part of a cycle.
    """
    adj = {r["id"]: r["parent_room_id"] for r in rooms_data}
    cycles = []
    
    for start_node in adj:
        visited = set()
        curr = start_node
        path = []
        
        while curr and curr not in visited:
            visited.add(curr)
            path.append(curr)
            curr = adj.get(curr)
            
            if curr == start_node:
                cycles.extend(path)
                break
                
    return list(set(cycles))
