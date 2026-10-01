"""
HarvestLink AI — WebSocket Connection Manager

Manages real-time connections and broadcasts events to all connected clients.
Events drive the frontend to re-fetch data from the backend (single source of truth).
"""
from typing import Dict, List, Any
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # role -> list of WebSocket connections
        self.connections: Dict[str, List[WebSocket]] = {
            "farmer": [],
            "buyer": [],
            "admin": [],
            "all": [],
        }

    async def connect(self, websocket: WebSocket, role: str = "all"):
        await websocket.accept()
        if role not in self.connections:
            role = "all"
        self.connections[role].append(websocket)
        self.connections["all"].append(websocket)
        logger.info(f"WebSocket connected: role={role}, total={len(self.connections['all'])}")

    def disconnect(self, websocket: WebSocket, role: str = "all"):
        for key in self.connections:
            if websocket in self.connections[key]:
                self.connections[key].remove(websocket)
        logger.info(f"WebSocket disconnected: role={role}")

    async def broadcast(self, event: str, data: Dict[str, Any], roles: List[str] = None):
        """Broadcast an event to all connections (or filtered by role)."""
        message = json.dumps({"event": event, "data": data})
        targets = set()

        if roles:
            for role in roles:
                for ws in self.connections.get(role, []):
                    targets.add(ws)
        else:
            for ws in self.connections["all"]:
                targets.add(ws)

        dead = []
        for ws in targets:
            try:
                await ws.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send to WebSocket: {e}")
                dead.append(ws)

        # Clean up dead connections
        for ws in dead:
            self.disconnect(ws)

    async def broadcast_to_all(self, event: str, data: Dict[str, Any]):
        await self.broadcast(event, data, roles=None)

    async def broadcast_to_farmer(self, event: str, data: Dict[str, Any]):
        await self.broadcast(event, data, roles=["farmer"])

    async def broadcast_to_buyer(self, event: str, data: Dict[str, Any]):
        await self.broadcast(event, data, roles=["buyer"])

    async def broadcast_to_farmer_and_buyer(self, event: str, data: Dict[str, Any]):
        await self.broadcast(event, data, roles=["farmer", "buyer"])


# Global singleton — imported by routes
manager = ConnectionManager()
