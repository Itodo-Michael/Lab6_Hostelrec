from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Set
import json

from app.db.session import AsyncSessionLocal, get_db
from app.core.security import get_current_user, TokenPayload
from app.models import User

router = APIRouter()

# Simple in-memory connection manager (for production, use Redis or similar)
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
    
    async def broadcast(self, message: dict):
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                disconnected.add(connection)
        for conn in disconnected:
            self.active_connections.discard(conn)

manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Get user_id from username if not provided
            user_id = message_data.get("user_id")
            username = message_data.get("username", "Anonymous")
            
            # Save message to database
            async with AsyncSessionLocal() as session:
                # If user_id not provided, try to get it from username
                if not user_id and username != "Anonymous":
                    result_user = await session.execute(
                        select(User).where(User.username == username)
                    )
                    user = result_user.scalar_one_or_none()
                    if user:
                        user_id = user.id
                
                result = await session.execute(
                    text(
                        """
                        INSERT INTO chat_messages (user_id, username, message)
                        VALUES (:user_id, :username, :message)
                        RETURNING id, user_id, created_at
                        """
                    ),
                    {
                        "user_id": user_id,
                        "username": username,
                        "message": message_data.get("message", ""),
                    },
                )
                row = result.mappings().first()
                await session.commit()
            
            # Broadcast to all connected clients
            await manager.broadcast({
                "type": "message",
                "id": row["id"] if row else None,
                "user_id": row["user_id"] if row else user_id,
                "username": username,
                "message": message_data.get("message", ""),
                "timestamp": message_data.get("timestamp") or (row["created_at"].isoformat() if row else None),
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.get("/messages")
async def get_recent_messages(session: AsyncSession = Depends(get_db)):
    """Get last 50 chat messages"""
    result = await session.execute(
        text(
            """
            SELECT id, user_id, username, message, created_at
            FROM chat_messages
            ORDER BY created_at DESC
            LIMIT 50
            """
        )
    )
    rows = result.mappings().all()
    return [dict(row) for row in reversed(rows)]  # Return in chronological order


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
):
    """Delete a chat message. Users can delete their own messages, staff can delete any."""
    # Get message info
    result = await session.execute(
        text(
            """
            SELECT user_id FROM chat_messages WHERE id = :message_id
            """
        ),
        {"message_id": message_id},
    )
    message_row = result.mappings().first()
    if not message_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    
    # Check permissions: user can delete their own messages, staff can delete any
    if current.role not in ("manager", "receptionist"):
        # Get current user's ID
        user_result = await session.execute(
            text("SELECT id FROM hostel_users WHERE username = :username"),
            {"username": current.sub},
        )
        user_row = user_result.mappings().first()
        if not user_row or user_row["id"] != message_row["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="You can only delete your own messages"
            )
    
    # Delete the message
    await session.execute(
        text("DELETE FROM chat_messages WHERE id = :message_id"),
        {"message_id": message_id},
    )
    await session.commit()
    return {"id": message_id, "deleted": True}

