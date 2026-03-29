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
import { satellitesReceived, satelliteStateUpdated, commandResultReceived, setConstellationName } from './satelliteSlice';
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
        // Keep the run slice in sync when start/stop commands succeed
        if (msg.command === 'start' && msg.verb === 'SUCCESS') {
          store.dispatch(startRun());
        }
        if (msg.command === 'stop' && msg.verb === 'SUCCESS') {
          store.dispatch(stopRun());
        }
        break;

      case 'log':
        store.dispatch(wsLogReceived(msg));
        break;

      // ping and metric messages are currently handled at the component level
    }
    return;
  }

  // --- Outbound: intercept commands in live mode ---

  if (connection.mode === 'live' && connection.status === 'connected') {
    if (action.type === 'satellites/sendGlobalCommand') {
      wsService.send({ type: 'global_command', command: action.payload });
      // Do NOT call next(action) — we don't want the simulation reducer to run.
      return;
    }

    if (action.type === 'satellites/sendSatelliteCommand') {
      wsService.send({
        type: 'command',
        satellite: action.payload.satelliteId,
        command: action.payload.command,
      });
      return;
    }

    if (action.type === 'logs/setSubscriptionLevel') {
      wsService.send({ type: 'subscribe_logs', min_level: action.payload });
      // Fall through so the local Redux state is also updated
    }
  }

  return next(action);
};

export default websocketMiddleware;
