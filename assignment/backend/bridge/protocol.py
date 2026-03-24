"""
WebSocket message types and serialization helpers.

Browser → Backend:
  {"type": "command",        "satellite": "Sputnik.One", "command": "launch"}
  {"type": "global_command", "command": "initialize"}
  {"type": "subscribe_logs", "min_level": "WARNING"}
  {"type": "get_satellite_list"}

Backend → Browser:
  {"type": "satellite_list",  "satellites": [...]}
  {"type": "state_update",    "id": "Sputnik.One", "state": "Orbiting", "lives": 3}
  {"type": "command_result",  "satellite": "...", "command": "...", "verb": "SUCCESS", "msg": "..."}
  {"type": "log",             "level": "INFO", "sender": "...", "message": "...", "timestamp": "..."}
  {"type": "metric",          "satellite": "...", "name": "...", "value": ..., "unit": "..."}
  {"type": "error",           "message": "..."}
"""

from datetime import datetime, timezone


# Inbound (browser → backend)
CMD_COMMAND = "command"
CMD_GLOBAL_COMMAND = "global_command"
CMD_SUBSCRIBE_LOGS = "subscribe_logs"
CMD_GET_SATELLITE_LIST = "get_satellite_list"

# Outbound (backend → browser)
EVT_SATELLITE_LIST = "satellite_list"
EVT_STATE_UPDATE = "state_update"
EVT_COMMAND_RESULT = "command_result"
EVT_LOG = "log"
EVT_METRIC = "metric"
EVT_ERROR = "error"

# Maps SatelliteState enum names to the display strings the frontend expects.
# Frontend STATES object uses these exact strings.
_STATE_DISPLAY: dict[str, str] = {
    "NEW": "New",
    "INIT": "Initialized",
    "ORBIT": "Orbiting",
    "RUN": "Running",
    "ERROR": "Error",
    "SAFE": "Safe",
    "DEAD": "Error",
    # Transitional states (lowercase in the Constellation enum)
    "initializing": "initializing",
    "launching": "launching",
    "landing": "landing",
    "starting": "starting",
    "stopping": "stopping",
    "interrupting": "interrupting",
    "reconfiguring": "reconfiguring",
}


def state_display(state_name: str) -> str:
    """Convert a SatelliteState enum name to a frontend display string."""
    return _STATE_DISPLAY.get(state_name, state_name)


def satellite_to_dict(
    canonical: str,
    sat_type: str,
    sat_name: str,
    state_name: str,
    lives: int,
    last_changed: datetime | None,
    connection_uri: str = "",
    version: str = "0.7",
) -> dict:
    return {
        "id": canonical,
        "type": sat_type,
        "name": sat_name,
        "state": state_display(state_name),
        "lives": lives,
        "lastHeartbeat": datetime.now(timezone.utc).isoformat(),
        "lastChanged": last_changed.isoformat() if last_changed else None,
        "connectionUri": connection_uri,
        "version": version,
        "lastMessage": None,
        "lastResponse": None,
    }


def mk_command_result(satellite: str, command: str, verb: str, msg: str, payload=None) -> dict:
    return {
        "type": EVT_COMMAND_RESULT,
        "satellite": satellite,
        "command": command,
        "verb": verb,
        "msg": msg,
        "payload": payload,
    }


def mk_error(message: str) -> dict:
    return {"type": EVT_ERROR, "message": message}
