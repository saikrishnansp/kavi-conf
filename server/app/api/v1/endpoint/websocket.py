from typing import Annotated
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, status
from app.core.websocket import manager
from app.core.security import settings
from app.utils.logging import logger
import jwt
import json

router = APIRouter()

async def get_ws_user_id(
    token: Annotated[str | None, Query()] = None
) -> str | None:
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload.get("sub")
    except Exception:
        return None

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: Annotated[str | None, Depends(get_ws_user_id)]
):
    if not user_id:
        logger.warning("Rejected WebSocket connection: No valid token provided.")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(websocket, user_id)
