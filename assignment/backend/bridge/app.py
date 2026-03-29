"""
FastAPI application factory and lifespan handler.

The lifespan context manager:
  1. Creates the ConstellationClient and starts it in a daemon thread.
  2. Creates the BridgeMonitoringListener and starts it in a daemon thread.
  3. Starts the broadcast_loop asyncio task.
  4. Waits (up to 10 s) for the controller to finish discovery.
  5. On shutdown: cancels the broadcast task and calls stop() on both services.
"""

import asyncio
import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .connection_manager import ConnectionManager
from .constellation_client import ConstellationClient
from .log_listener import BridgeMonitoringListener
from .settings import Settings
from .ws import router as ws_router

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings: Settings = app.state.settings
    loop = asyncio.get_event_loop()
    event_queue: asyncio.Queue = asyncio.Queue(maxsize=2000)

    client = ConstellationClient(
        group=settings.constellation_group,
        interface=settings.constellation_interface,
    )
    client.attach_queue(event_queue, loop)

    manager = ConnectionManager()

    listener = BridgeMonitoringListener(
        group=settings.constellation_group,
        event_queue=event_queue,
        loop=loop,
        interface=settings.constellation_interface,
    )

    app.state.constellation_client = client
    app.state.connection_manager = manager
    app.state.log_listener = listener

    ctrl_thread = threading.Thread(target=client.start, daemon=True, name="constellation-ctrl")
    ctrl_thread.start()

    listener_thread = threading.Thread(target=listener.start, daemon=True, name="constellation-mon")
    listener_thread.start()

    broadcast_task = asyncio.create_task(_broadcast_loop(event_queue, manager), name="event-broadcast")

    log.info("Waiting for Constellation controller (group: %s)...", settings.constellation_group)
    ready = await asyncio.to_thread(client.wait_ready, 10.0)
    if ready and client.is_running():
        log.info("Controller ready")
    else:
        log.warning("Controller did not become ready within 10 s — check that satellites are running")

    yield

    log.info("Shutting down bridge")
    broadcast_task.cancel()
    try:
        await broadcast_task
    except asyncio.CancelledError:
        pass

    client.stop()
    listener.stop()


async def _broadcast_loop(queue: asyncio.Queue, manager: ConnectionManager) -> None:
    """Read events from the queue and fan them out to all WebSocket clients."""
    while True:
        event = await queue.get()
        await manager.broadcast(event)
        queue.task_done()


def create_app(settings: Settings | None = None) -> FastAPI:
    if settings is None:
        settings = Settings()

    app = FastAPI(
        title="Constellation Web Bridge",
        description="WebSocket bridge connecting browsers to a Constellation DAQ network.",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.state.settings = settings

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",   # Vite dev server
            "http://localhost:4173",   # Vite preview
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(ws_router)

    @app.get("/health", tags=["infra"])
    async def health():
        """Return bridge health and connected satellite count."""
        c = app.state.constellation_client
        satellites = await asyncio.to_thread(c.get_satellite_list) if c.is_running() else []
        return {
            "status": "ok",
            "group": settings.constellation_group,
            "satellites": len(satellites),
            "ws_clients": app.state.connection_manager.count,
        }

    return app
