"""
Tracks connected WebSocket clients and broadcasts events to all of them.
"""

import asyncio
import logging

from fastapi import WebSocket
from starlette.websockets import WebSocketState

log = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self._clients: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._clients.add(ws)
        log.debug("Client connected (total: %d)", len(self._clients))

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(ws)
        log.debug("Client disconnected (total: %d)", len(self._clients))

    async def send(self, ws: WebSocket, message: dict) -> None:
        """Send a message to a single client, silently dropping dead connections."""
        try:
            await ws.send_json(message)
        except Exception:
            await self.disconnect(ws)

    async def broadcast(self, message: dict) -> None:
        """Send a message to every connected client."""
        if not self._clients:
            return
        async with self._lock:
            clients = list(self._clients)
        dead: list[WebSocket] = []
        for ws in clients:
            if ws.client_state == WebSocketState.CONNECTED:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)

    @property
    def count(self) -> int:
        return len(self._clients)
