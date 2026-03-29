"""
CMDP log and metric listener that forwards events to the WebSocket broadcast queue.

Inherits from Constellation's MonitoringListener, which automatically discovers
satellite monitoring ports via CHIRP and subscribes to their PUB sockets.

Log interception: when a satellite is discovered, _add_satellite() creates a
ZeroMQSocketLogListener (a QueueListener subclass) that polls the satellite's
ZMQ PUB socket for LOG/* messages and dispatches them to attached handlers.
We append _BridgeLogHandler to each listener's handler list so records flow
into our asyncio.Queue.

Metric interception: override metric_callback(), which the StatListener thread
calls for every STAT/* message received.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

log = logging.getLogger(__name__)


class _BridgeLogHandler(logging.Handler):
    """Logging handler that serialises records into the asyncio event queue."""

    def __init__(self, queue: asyncio.Queue, loop: asyncio.AbstractEventLoop) -> None:
        super().__init__()
        self._queue = queue
        self._loop = loop

    def emit(self, record: logging.LogRecord) -> None:
        try:
            event = {
                "type": "log",
                "level": record.levelname,
                "sender": record.name,
                "message": record.getMessage(),
                "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            }
            self._loop.call_soon_threadsafe(self._queue.put_nowait, event)
        except Exception:
            self.handleError(record)


class BridgeMonitoringListener:
    """Wraps MonitoringListener to forward logs and metrics over WebSocket.

    Instantiated lazily so the Constellation PYTHONPATH insertion in run.py
    takes effect before the import happens.
    """

    def __init__(
        self,
        group: str,
        event_queue: asyncio.Queue,
        loop: asyncio.AbstractEventLoop,
        interface: list[str] | None = None,
    ) -> None:
        self._group = group
        self._event_queue = event_queue
        self._loop = loop
        self._interface = interface
        self._listener: Any = None
        self._bridge_handler: _BridgeLogHandler | None = None

    def start(self) -> None:
        """Initialise the listener and block until reentry() is called.

        Designed to be called inside a daemon thread.
        """
        from constellation.core.monitoring import MonitoringListener
        from constellation.core.chirp import CHIRPServiceIdentifier

        bridge_handler = _BridgeLogHandler(self._event_queue, self._loop)
        bridge_handler.setLevel(logging.INFO)
        self._bridge_handler = bridge_handler

        # Build a one-off subclass so we can inject our handler and override
        # metric_callback without shipping changes to the upstream library.
        event_queue = self._event_queue
        loop = self._loop

        class _Listener(MonitoringListener):
            def _add_satellite(self, service) -> None:  # type: ignore[override]
                super()._add_satellite(service)
                uuid = str(service.host_uuid)
                if uuid in self._log_listeners:
                    # QueueListener stores handlers as a tuple (*args), so we
                    # extend it rather than calling .append().
                    listener = self._log_listeners[uuid]
                    listener.handlers = listener.handlers + (bridge_handler,)

            def metric_callback(self, metric) -> None:  # type: ignore[override]
                try:
                    ts = metric.time.to_unix() if metric.time is not None else None
                    ev = {
                        "type": "metric",
                        "satellite": metric.sender,
                        "name": metric.name,
                        "value": metric.value,
                        "unit": metric.unit,
                        "timestamp": ts,
                    }
                    loop.call_soon_threadsafe(event_queue.put_nowait, ev)
                except Exception:
                    pass

        self._listener = _Listener(
            name="WebBridge",
            group=self._group,
            interface=self._interface,
        )
        self._listener.run_listener()

    def stop(self) -> None:
        if self._listener is not None:
            try:
                self._listener.reentry()
            except Exception:
                log.exception("Error stopping monitoring listener")

    def set_min_level(self, level_name: str) -> None:
        """Update the server-side log level filter."""
        if self._bridge_handler is None:
            return
        level = getattr(logging, level_name.upper(), logging.INFO)
        self._bridge_handler.setLevel(level)
        log.debug("Log subscription level set to %s", level_name)
