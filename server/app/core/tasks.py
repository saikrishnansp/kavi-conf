import asyncio
from sqlmodel import Session
from app.core.dbsession import engine
from app.api.v1.crud.booking import update_completed_bookings
from app.api.v1.crud.room_hold import cleanup_expired_holds
from app.utils.logging import logger
from app.core.websocket import manager

async def system_maintenance_monitor(interval_seconds: int = 60):
    """
    Background task to periodically perform system maintenance:
    1. Update booking statuses to COMPLETED.
    2. Cleanup expired room holds.
    """
    logger.info(f"Starting system maintenance monitor (interval: {interval_seconds}s)")
    while True:
        try:
            # Run sync DB operations in a thread to avoid blocking the event loop
            def do_maintenance():
                with Session(engine) as session:
                    # 1. Update stale bookings
                    updated_bookings = update_completed_bookings(session, commit=True)
                    # Extract necessary info before session closes to avoid detached instance errors
                    booking_info = [
                        {
                            "id": b.id,
                            "room_id": b.room_id,
                            "user_id": b.user_id,
                            "status": b.status
                        }
                        for b in updated_bookings
                    ]
                    # 2. Cleanup expired holds
                    released_room_ids = cleanup_expired_holds(session, commit=True)
                    return booking_info, released_room_ids

            booking_info, released_room_ids = await asyncio.to_thread(do_maintenance)
            
            if booking_info:
                logger.info(f"Auto-completed {len(booking_info)} bookings.")
                for b in booking_info:
                    await manager.broadcast({
                        "type": "booking_completed",
                        "data": {
                            "booking_id": b["id"],
                            "room_id": b["room_id"],
                            "user_id": b["user_id"],
                            "status": b["status"]
                        }
                    })

            if released_room_ids:
                logger.info(f"Released {len(released_room_ids)} expired holds.")
                for room_id in released_room_ids:
                    await manager.broadcast({
                        "type": "hold_released",
                        "data": {
                            "room_id": room_id,
                            "reason": "expired"
                        }
                    })
                
            # logger.debug("System maintenance completed.")
        except Exception as e:
            logger.error(f"Error in system maintenance monitor: {e}")
        
        await asyncio.sleep(interval_seconds)
