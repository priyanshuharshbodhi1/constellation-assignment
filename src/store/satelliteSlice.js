import { createSlice } from '@reduxjs/toolkit';
import { SATELLITE_PRESETS, createSatellite, STATES, getTransition, ALLOWED_TRANSITIONS } from '../simulation/satelliteFSM';

const initialSatellites = SATELLITE_PRESETS.map(createSatellite);

const satelliteSlice = createSlice({
  name: 'satellites',
  initialState: {
    items: initialSatellites,
    constellationName: 'edda',
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
  },
});

export const {
  setConfigFile,
  sendGlobalCommand,
  completeTransition,
  sendSatelliteCommand,
  completeSatelliteTransition,
  triggerError,
  updateHeartbeats,
  selectSatellite,
  shutdownAll,
} = satelliteSlice.actions;

export default satelliteSlice.reducer;
