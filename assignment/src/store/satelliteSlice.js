import { createSlice } from '@reduxjs/toolkit';
import { STATES, TRANSITIONAL, getTransition, ALLOWED_TRANSITIONS, COMMANDS } from '../simulation/satelliteFSM';

const STABLE_STATES = new Set(Object.values(STATES));
const TRANSITIONAL_STATES = new Set(Object.values(TRANSITIONAL));

const satelliteSlice = createSlice({
  name: 'satellites',
  initialState: {
    items: [],
    constellationName: '',
    configFile: '',
    selectedSatelliteId: null,
    queryResult: null, // { satelliteId, command, result } shown in modal
  },
  reducers: {
    setConfigFile(state, action) {
      state.configFile = action.payload;
    },

    sendGlobalCommand(state, action) {
      const command = action.payload;
      const transition = getTransition(command);
      if (!transition) return;

      state.items.forEach(sat => {
        const allowed = ALLOWED_TRANSITIONS[sat.state] || [];
        if (allowed.includes(command)) {
          sat.state = transition.transitional;
          sat.lastMessage = 'transitioning';
        }
      });
    },

    completeTransition(state, action) {
      const { command } = action.payload;
      const transition = getTransition(command);
      if (!transition) return;

      state.items.forEach(sat => {
        if (sat.state === transition.transitional) {
          sat.state = transition.target;
          sat.lastCheck = new Date().toISOString();

          switch (command) {
            case 'initialize':
              sat.lastMessage = 'Configuration attached in payload';
              sat.lastResponse = 'SUCCESS';
              break;
            case 'launch':
              sat.lastMessage = 'Satellite launched successfully';
              sat.lastResponse = 'SUCCESS';
              break;
            case 'start':
              sat.lastMessage = 'RUN';
              sat.lastResponse = 'SUCCESS';
              break;
            case 'stop':
              sat.lastMessage = 'Run stopped';
              sat.lastResponse = 'SUCCESS';
              break;
            case 'land':
              sat.lastMessage = 'Satellite landed';
              sat.lastResponse = 'SUCCESS';
              break;
          }
        }
      });
    },

    sendSatelliteCommand(state, action) {
      const { satelliteId, command } = action.payload;
      const sat = state.items.find(s => s.id === satelliteId);
      if (!sat) return;

      const transition = getTransition(command);
      if (transition) {
        sat.state = transition.transitional;
        sat.lastMessage = 'transitioning';
      }
    },

    completeSatelliteTransition(state, action) {
      const { satelliteId, command } = action.payload;
      const sat = state.items.find(s => s.id === satelliteId);
      if (!sat) return;

      const transition = getTransition(command);
      if (transition && sat.state === transition.transitional) {
        sat.state = transition.target;
        sat.lastMessage = `Transition to ${transition.target} complete`;
        sat.lastResponse = 'SUCCESS';
      }
    },

    triggerError(state, action) {
      const sat = state.items.find(s => s.id === action.payload);
      if (sat) {
        sat.state = STATES.ERROR;
        sat.lastMessage = 'Communication with device lost';
        sat.lastResponse = 'ERROR';
      }
    },

    updateHeartbeats(state) {
      const now = new Date().toISOString();
      state.items.forEach(sat => {
        if (sat.state !== STATES.NEW) {
          sat.lastHeartbeat = now;
        }
      });
    },

    selectSatellite(state, action) {
      state.selectedSatelliteId = action.payload;
    },

    shutdownAll(state) {
      state.items.forEach(sat => {
        sat.state = STATES.NEW;
        sat.lastMessage = 'Shutdown complete';
        sat.lastResponse = 'SUCCESS';
      });
    },

    setConstellationName(state, action) {
      state.constellationName = action.payload;
    },

    setQueryResult(state, action) {
      state.queryResult = action.payload; // { satelliteId, command, result }
    },

    clearQueryResult(state) {
      state.queryResult = null;
    },

    // --- WebSocket event reducers ---

    satellitesReceived(state, action) {
      // Merge the server snapshot with existing items so that fields the
      // server doesn't track (like lastMessage from command_result) are preserved.
      const existingById = Object.fromEntries(state.items.map(s => [s.id, s]));
      state.items = action.payload.map(s => {
        const existing = existingById[s.id];
        return {
          id: s.id,
          type: s.type,
          name: s.name,
          state: s.state,
          lastMessage: s.lastMessage ?? existing?.lastMessage ?? '',
          heartbeat: 3000,
          lives: s.lives ?? 3,
          role: s.role ?? 'DYNAMIC',
          connectionUri: s.connectionUri ?? '',
          lastHeartbeat: s.lastHeartbeat ?? new Date().toISOString(),
          lastCheck: s.lastChanged ?? new Date().toISOString(),
          lastResponse: s.lastResponse ?? existing?.lastResponse ?? '',
          md5HostId: '',
          version: s.version || '0.7',
          commands: s.commands ?? COMMANDS,
        };
      });
    },

    satelliteStateUpdated(state, action) {
      const { id, state: newState, lives } = action.payload;
      const sat = state.items.find(s => s.id === id);
      if (sat) {
        const wasTransitioning = TRANSITIONAL_STATES.has(sat.state);
        sat.state = newState;
        if (lives !== undefined) sat.lives = lives;
        sat.lastHeartbeat = new Date().toISOString();
        // When a satellite finishes transitioning into a stable state,
        // update lastMessage so it doesn't stay stuck on "transitioning".
        if (wasTransitioning && STABLE_STATES.has(newState)) {
          sat.lastMessage = newState;
        }
      }
    },

    commandResultReceived(state, action) {
      const { satellite, verb, msg } = action.payload;
      if (!satellite) return;
      const sat = state.items.find(s => s.id === satellite);
      if (sat) {
        // Only update lastMessage if the server sent a non-empty msg;
        // otherwise keep the current value (e.g. "transitioning") and let
        // satelliteStateUpdated replace it when the transition completes.
        if (msg) sat.lastMessage = msg;
        sat.lastResponse = verb;
        sat.lastCheck = new Date().toISOString();
      }
    },
  },
});

export const {
  setConfigFile,
  setConstellationName,
  setQueryResult,
  clearQueryResult,
  sendGlobalCommand,
  completeTransition,
  sendSatelliteCommand,
  completeSatelliteTransition,
  triggerError,
  updateHeartbeats,
  selectSatellite,
  shutdownAll,
  satellitesReceived,
  satelliteStateUpdated,
  commandResultReceived,
} = satelliteSlice.actions;

export default satelliteSlice.reducer;
