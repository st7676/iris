"""
Tracks live WebSocket connections per incident, so other parts of the app
(e.g. the /investigate endpoint) can push a server-initiated update to
whoever is watching an incident -- not just respond to a message the
client explicitly sent on the socket.
"""

from collections import defaultdict
from typing import Dict, List

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: Dict[str, List[WebSocket]] = defaultdict(list)

    async def connect(self, incident_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections[incident_id].append(websocket)

    def disconnect(self, incident_id: str, websocket: WebSocket) -> None:
        if websocket in self._connections.get(incident_id, []):
            self._connections[incident_id].remove(websocket)

    async def broadcast(self, incident_id: str, message: dict) -> None:
        for websocket in list(self._connections.get(incident_id, [])):
            try:
                await websocket.send_json(message)
            except Exception:
                self.disconnect(incident_id, websocket)


manager = ConnectionManager()
