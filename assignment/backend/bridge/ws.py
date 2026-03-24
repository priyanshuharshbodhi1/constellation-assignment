"""
WebSocket endpoint — one per browser tab.

On connect  → send satellite_list snapshot.
On message  → route to command handler.
On error    → log and disconnect cleanly.

A single broadcast_loop() task (started in app.py's lifespan) reads from the
shared asyncio.Queue and fans events out to every connected client, so
individual WebSocket handlers only need to read incoming browser messages.
"""

import asyncio
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from .protocol import (
    CMD_COMMAND,
    CMD_GET_SATELLITE_LIST,
    CMD_GLOBAL_COMMAND,
    CMD_SUBSCRIBE_LOGS,
    mk_command_result,
    mk_error,
)

log = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    # ws.app is the FastAPI/Starlette app — available via ws.scope["app"]
    manager = ws.app.state.connection_manager
    client = ws.app.state.constellation_client
    listener = ws.app.state.log_listener

    await manager.connect(ws)
    try:
        # Immediately send current satellite state so the UI is consistent
        # on (re)connect without waiting for the next poll cycle.
        snapshot = await asyncio.to_thread(client.get_satellite_list)
        await manager.send(ws, {
            "type": "satellite_list",
            "satellites": snapshot,
            "group": client._group,
        })

        while True:
            try:
                data = await asyncio.wait_for(ws.receive_json(), timeout=30.0)
            except asyncio.TimeoutError:
                # Keep-alive: the client should handle a ping gracefully.
                await manager.send(ws, {"type": "ping"})
                continue

            await _handle_message(data, ws, client, listener, manager)

    except WebSocketDisconnect:
        log.debug("Client disconnected normally")
    except Exception:
        log.exception("Unhandled error in WebSocket handler")
    finally:
        await manager.disconnect(ws)


async def _handle_message(msg: dict, ws: WebSocket, client, listener, manager) -> None:
    msg_type = msg.get("type")

    if msg_type == CMD_COMMAND:
        satellite = msg.get("satellite", "")
        command = msg.get("command", "")
        payload = msg.get("payload")

        if not satellite or not command:
            await manager.send(ws, mk_error("'satellite' and 'command' fields are required"))
            return

        result = await asyncio.to_thread(client.send_command, satellite, command, payload)
        await manager.broadcast(
            mk_command_result(satellite, command, result["verb"], result["msg"], result.get("payload"))
        )

    elif msg_type == CMD_GLOBAL_COMMAND:
        command = msg.get("command", "")
        payload = msg.get("payload")

        if not command:
            await manager.send(ws, mk_error("'command' field is required"))
            return

        results = await asyncio.to_thread(client.send_global_command, command, payload)
        for sat_id, result in results.items():
            await manager.broadcast(mk_command_result(sat_id, command, result["verb"], result["msg"]))

    elif msg_type == CMD_SUBSCRIBE_LOGS:
        min_level = msg.get("min_level", "INFO")
        if listener is not None:
            listener.set_min_level(min_level)

    elif msg_type == CMD_GET_SATELLITE_LIST:
        snapshot = await asyncio.to_thread(client.get_satellite_list)
        await manager.send(ws, {
            "type": "satellite_list",
            "satellites": snapshot,
            "group": client._group,
        })

    else:
        log.debug("Unrecognised message type: %r", msg_type)
