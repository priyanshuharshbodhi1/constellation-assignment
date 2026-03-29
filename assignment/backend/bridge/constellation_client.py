"""
Async-safe wrapper around Constellation's ScriptableController.

The Constellation library uses blocking ZMQ I/O and threading internally.
This module runs the controller in a background thread and exposes async-
compatible methods via asyncio.to_thread() for use in the FastAPI handlers.

State changes are detected by a polling loop running in the same background
thread. When a change is found, it is pushed into an asyncio.Queue that the
broadcast task reads from.
"""

import asyncio
import logging
import threading
import time
from datetime import datetime
from typing import Any

from .protocol import EVT_SATELLITE_LIST, EVT_STATE_UPDATE, satellite_to_dict, state_display

log = logging.getLogger(__name__)


class ConstellationClient:
    def __init__(self, group: str, interface: list[str] | None = None) -> None:
        self._group = group
        self._interface = interface
        self._ctrl = None
        self._event_queue: asyncio.Queue | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._stop_event = threading.Event()
        # Snapshot of last known states for change detection (canonical → display string)
        self._last_states: dict[str, str] = {}
        self._ready = threading.Event()

    def attach_queue(self, queue: asyncio.Queue, loop: asyncio.AbstractEventLoop) -> None:
        """Wire up the asyncio event queue. Must be called before start()."""
        self._event_queue = queue
        self._loop = loop

    def start(self) -> None:
        """Create the controller and run the state-polling loop.

        Blocking — designed to be called inside a daemon thread.
        """
        # Deferred import so the PYTHONPATH insertion in run.py takes effect first.
        from constellation.core.controller import ScriptableController

        log.info("Starting Constellation controller for group '%s'", self._group)
        try:
            self._ctrl = ScriptableController(
                group=self._group,
                name="WebBridge",
                interface=self._interface,
            )
        except Exception:
            log.exception("Controller initialisation failed")
            self._ready.set()
            return

        self._ready.set()
        log.info("Controller ready — polling for state changes every 500 ms")
        self._poll_loop()

    def stop(self) -> None:
        """Signal the polling loop to stop and shut down the controller."""
        self._stop_event.set()
        if self._ctrl is not None:
            try:
                self._ctrl.reentry()
            except Exception:
                log.exception("Error during controller shutdown")

    def wait_ready(self, timeout: float = 10.0) -> bool:
        """Block until start() has finished initialising (or timeout)."""
        return self._ready.wait(timeout=timeout)

    def is_running(self) -> bool:
        return self._ctrl is not None and not self._stop_event.is_set()

    # ------------------------------------------------------------------ #
    # Public sync methods — call these via asyncio.to_thread()            #
    # ------------------------------------------------------------------ #

    def get_satellite_list(self) -> list[dict]:
        """Return current satellite state snapshot."""
        if self._ctrl is None:
            return []
        return self._build_satellite_list()

    def send_command(self, satellite_id: str, command: str, payload: Any = None) -> dict:
        """Send a CSCP command to a single satellite.

        satellite_id must use "ClassName.name" format, e.g. "Sputnik.One".
        Returns a result dict with 'success', 'verb', 'msg', and 'payload'.
        """
        if self._ctrl is None:
            return {"success": False, "verb": "ERROR", "msg": "Controller not running"}

        parts = satellite_id.split(".", maxsplit=1)
        if len(parts) != 2:
            return {"success": False, "verb": "ERROR", "msg": f"Invalid satellite ID: {satellite_id!r}"}

        sat_cls, sat_name = parts
        try:
            resp = self._ctrl.command(cmd=command, sat=sat_name, satcls=sat_cls, payload=payload)
            success = getattr(resp, "success", True)
            return {
                "success": success,
                "verb": "SUCCESS" if success else "ERROR",
                "msg": getattr(resp, "msg", "") or "",
                "payload": getattr(resp, "payload", None),
            }
        except Exception as exc:
            log.warning("Command '%s' to '%s' failed: %s", command, satellite_id, exc)
            return {"success": False, "verb": "ERROR", "msg": str(exc)}

    def send_global_command(self, command: str, payload: Any = None) -> dict[str, dict]:
        """Send a CSCP command to all satellites.

        Returns a mapping of satellite_id → result dict.
        """
        if self._ctrl is None:
            return {}
        try:
            responses = self._ctrl.command(cmd=command, payload=payload)
        except Exception as exc:
            log.warning("Global command '%s' failed: %s", command, exc)
            return {}

        if not isinstance(responses, dict):
            return {}

        return {
            sat_id: {
                "success": getattr(r, "success", True),
                "verb": "SUCCESS" if getattr(r, "success", True) else "ERROR",
                "msg": getattr(r, "msg", "") or "",
            }
            for sat_id, r in responses.items()
        }

    # ------------------------------------------------------------------ #
    # Internal helpers                                                     #
    # ------------------------------------------------------------------ #

    def _build_satellite_list(self) -> list[dict]:
        from constellation.core.message.cscp1 import SatelliteState

        states_lc = self._ctrl.states          # canonical → SatelliteState
        state_changes = self._ctrl.heartbeat_state_changes
        lives_map = self._read_lives()

        result = []
        for canonical, link in self._ctrl.constellation.satellites.items():
            state_enum = states_lc.get(canonical, SatelliteState.NEW)
            state_name = state_enum.name if hasattr(state_enum, "name") else str(state_enum)
            result.append(
                satellite_to_dict(
                    canonical=canonical,
                    sat_type=link._class_name,
                    sat_name=link._name,
                    state_name=state_name,
                    lives=lives_map.get(canonical, 3),
                    last_changed=state_changes.get(canonical),
                )
            )
        return result

    def _read_lives(self) -> dict[str, int]:
        """Read per-satellite lives counters from the heartbeat checker."""
        result: dict[str, int] = {}
        try:
            for hb in self._ctrl._remote_heartbeat_states.values():
                result[hb.name] = hb.lives
        except Exception:
            pass
        return result

    def _poll_loop(self) -> None:
        """Detect state changes and push events into the asyncio queue."""
        from constellation.core.message.cscp1 import SatelliteState

        while not self._stop_event.is_set():
            time.sleep(0.5)

            if self._loop is None or self._event_queue is None:
                continue

            try:
                current_set = set(self._ctrl.constellation.satellites.keys())
                states_lc = self._ctrl.states
                lives_map = self._read_lives()

                # When the satellite set changes (arrival or departure), push a
                # full snapshot so every client has a consistent list.
                if current_set != set(self._last_states.keys()):
                    snapshot = self._build_satellite_list()
                    self._last_states = {s["id"]: s["state"] for s in snapshot}
                    self._loop.call_soon_threadsafe(
                        self._event_queue.put_nowait,
                        {"type": EVT_SATELLITE_LIST, "satellites": snapshot, "group": self._group},
                    )
                    continue

                # Satellite set unchanged — send per-satellite state_update events
                # only for satellites whose state has actually changed.
                for canonical in current_set:
                    state_enum = states_lc.get(canonical, SatelliteState.NEW)
                    state_name = state_enum.name if hasattr(state_enum, "name") else str(state_enum)
                    display = state_display(state_name)

                    if self._last_states.get(canonical) != display:
                        self._last_states[canonical] = display
                        self._loop.call_soon_threadsafe(
                            self._event_queue.put_nowait,
                            {
                                "type": EVT_STATE_UPDATE,
                                "id": canonical,
                                "state": display,
                                "lives": lives_map.get(canonical.lower(), 3),
                            },
                        )

            except Exception:
                log.exception("State poll error")
