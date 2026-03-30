/**
 * Redux middleware that bridges the store with the WebSocket service.
 *
 * Responsibilities:
 *   1. Intercept connection/connect → call wsService.connect()
 *   2. Intercept connection/disconnect → call wsService.disconnect()
 *   3. In live mode: intercept outgoing command actions → send over WebSocket
 *      instead of running the client-side simulation logic.
 *   4. Handle ws/messageReceived → translate server events into slice actions.
 */

import wsService from '../services/websocket';

const FSM_CMDS = new Set(['initialize', 'launch', 'land', 'start', 'stop', 'shutdown']);

// Build the correct payload for each Constellation command.
// initialize → config dict (empty is valid for demo satellites)
// start      → run identifier string  e.g. "run_0"
// everything else → no payload
function _commandPayload(command, run) {
  if (command === 'initialize') return {};
  if (command === 'start') return `${run.identifier}_${run.sequence}`;
  return undefined;
}
import { satellitesReceived, satelliteStateUpdated, commandResultReceived, setConstellationName, setQueryResult } from './satelliteSlice';
import { wsLogReceived } from './logSlice';
import { startRun, stopRun } from './runSlice';

const websocketMiddleware = store => next => action => {
  const { connection } = store.getState();

  // --- Connection lifecycle ---

  if (action.type === 'connection/connect') {
    next(action);
    wsService.connect(connection.wsUrl, store.dispatch);
    return;
  }

  if (action.type === 'connection/disconnect') {
    wsService.disconnect();
    return next(action);
  }

  // --- Inbound: translate server events into slice actions ---

  if (action.type === 'ws/messageReceived') {
    const msg = action.payload;

    switch (msg.type) {
      case 'satellite_list':
        store.dispatch(satellitesReceived(msg.satellites));
        if (msg.group) store.dispatch(setConstellationName(msg.group));
        break;

      case 'state_update':
        store.dispatch(satelliteStateUpdated(msg));
        break;

      case 'command_result':
        store.dispatch(commandResultReceived(msg));
        // Only toggle run state once (not per-satellite result)
        if (msg.command === 'start' && msg.verb === 'SUCCESS' && !store.getState().run.isRunning) {
          store.dispatch(startRun());
        }
        if (msg.command === 'stop' && msg.verb === 'SUCCESS' && store.getState().run.isRunning) {
          store.dispatch(stopRun());
        }
        // Show modal for query commands (non-FSM)
        if (!FSM_CMDS.has(msg.command) && (msg.msg || msg.payload != null)) {
          let result = msg.msg || '';
          // Append payload data (e.g. get_commands list, get_config dict)
          if (msg.payload != null) {
            const formatted = typeof msg.payload === 'object'
              ? JSON.stringify(msg.payload, null, 2)
              : String(msg.payload);
            result = result ? `${result}\n\n${formatted}` : formatted;
          }
          store.dispatch(setQueryResult({
            satelliteId: msg.satellite,
            command: msg.command,
            result,
          }));
        }
        break;

      case 'log':
        store.dispatch(wsLogReceived(msg));
        break;

      // ping and metric messages are currently handled at the component level
    }
    return;
  }

  // --- Outbound: send commands over WebSocket ---

  if (connection.status === 'connected') {
    if (action.type === 'satellites/sendGlobalCommand') {
      const command = action.payload;
      const { run } = store.getState();
      const payload = _commandPayload(command, run);
      wsService.send({ type: 'global_command', command, payload });
      // Fall through so the reducer applies optimistic transitional states,
      // giving immediate visual feedback. The server's response will
      // override with the real final state when it arrives.
    }

    if (action.type === 'satellites/sendSatelliteCommand') {
      const { satelliteId, command } = action.payload;
      const { run } = store.getState();
      const payload = _commandPayload(command, run);
      wsService.send({ type: 'command', satellite: satelliteId, command, payload });
    }

    if (action.type === 'logs/setSubscriptionLevel') {
      wsService.send({ type: 'subscribe_logs', min_level: action.payload });
    }
  }

  return next(action);
};

export default websocketMiddleware;
