import { createSlice } from '@reduxjs/toolkit';
import { STATES, getTransition, ALLOWED_TRANSITIONS } from '../simulation/satelliteFSM';

const satelliteSlice = createSlice({
  name: 'satellites',
  initialState: {
    items: [],
    constellationName: '',
    configFile: '',
    selectedSatelliteId: null,
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
          sat.lastMessage = `${command} command sent`;
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
        sat.lastMessage = `${command} command sent`;
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

    // --- WebSocket event reducers ---

    satellitesReceived(state, action) {
      // Replace the satellite list with the server snapshot, mapping each
      // server-side field to the shape the UI components expect.
      state.items = action.payload.map(s => ({
        id: s.id,
        type: s.type,
        name: s.name,
        state: s.state,
        lastMessage: s.lastMessage || '',
        heartbeat: 3000,
        lives: s.lives ?? 3,
        role: s.role || 'DYNAMIC',
        connectionUri: s.connectionUri || '',
        lastHeartbeat: s.lastHeartbeat || new Date().toISOString(),
        lastCheck: s.lastChanged || new Date().toISOString(),
        lastResponse: s.lastResponse || '',
        md5HostId: '',
        version: s.version || '0.7',
        commands: [],
      }));
    },

    satelliteStateUpdated(state, action) {
      const { id, state: newState, lives } = action.payload;
      const sat = state.items.find(s => s.id === id);
      if (sat) {
        sat.state = newState;
        if (lives !== undefined) sat.lives = lives;
        sat.lastHeartbeat = new Date().toISOString();
      }
    },

    commandResultReceived(state, action) {
      const { satellite, verb, msg } = action.payload;
      if (!satellite) return;
      const sat = state.items.find(s => s.id === satellite);
      if (sat) {
        sat.lastMessage = msg || '';
        sat.lastResponse = verb;
        sat.lastCheck = new Date().toISOString();
      }
    },
  },
});

export const {
  setConfigFile,
  setConstellationName,
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
