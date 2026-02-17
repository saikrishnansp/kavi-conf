import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from app.core.config import get_settings
from app.utils.logging import setup_logging, logger
from app.api.v1.endpoint import auth, rooms, bookings, websocket, users
from app.core.tasks import system_maintenance_monitor
from app.core.dbsession import engine
from app.db_models.room import Room
from app.utils.validation import validate_room_hierarchy

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: 1. Verify Hierarchy Integrity
    try:
        with Session(engine) as session:
            rooms_list = session.exec(select(Room)).all()
            rooms_data = [{"id": r.room_id, "parent_room_id": r.parent_room_id} for r in rooms_list]
            cycle_ids = validate_room_hierarchy(rooms_data)
            if cycle_ids:
                logger.error(f"CRITICAL: Room hierarchy cycles detected at startup for IDs: {cycle_ids}")
            else:
                logger.info("Room hierarchy integrity verified (No cycles).")
    except Exception as e:
        logger.error(f"Failed to verify hierarchy integrity at startup: {e}")

    # Startup: 2. Start background tasks
    task = asyncio.create_task(system_maintenance_monitor(interval_seconds=60))
    yield
    # Shutdown: Clean up background tasks
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        logger.info("Background task 'system_maintenance_monitor' cancelled.")

app = FastAPI(lifespan=lifespan)
setup_logging()

# Security Headers Middleware (using a simpler approach)
@app.middleware("http")
async def add_security_headers(request: Request, call_next):    
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Add CORS middleware LAST (Outermost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
# --- Include Routers ---
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(rooms.router, prefix="/api/v1/rooms", tags=["rooms"])
app.include_router(bookings.router, prefix="/api/v1/bookings", tags=["bookings"])
app.include_router(websocket.router, tags=["websocket"])

@app.get("/")
async def read_root():
    return {"message": "Conference room booking API is running."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
