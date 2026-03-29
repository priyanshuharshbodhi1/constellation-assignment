import { createSlice } from '@reduxjs/toolkit';

const MAX_LOG_ENTRIES = 800;

const logSlice = createSlice({
  name: 'logs',
  initialState: {
    entries: [],
    subscriptionLevel: 'INFO',
    filters: {
      level: '',
      sender: '',
      topic: '',
      text: '',
    },
    paused: false,
  },
  reducers: {
    addLogEntry(state, action) {
      if (state.paused) return;
      state.entries.push(action.payload);
      if (state.entries.length > MAX_LOG_ENTRIES) {
        state.entries = state.entries.slice(-MAX_LOG_ENTRIES);
      }
    },

    setSubscriptionLevel(state, action) {
      state.subscriptionLevel = action.payload;
    },

    setFilter(state, action) {
      const { key, value } = action.payload;
      state.filters[key] = value;
    },

    resetFilters(state) {
      state.filters = { level: '', sender: '', topic: '', text: '' };
    },

    clearLogs(state) {
      state.entries = [];
    },

    togglePause(state) {
      state.paused = !state.paused;
    },

    wsLogReceived(state, action) {
      if (state.paused) return;
      const { level, sender, message, timestamp } = action.payload;
      const entry = {
        id: Date.now() + Math.random(),
        timestamp: timestamp || new Date().toISOString(),
        level,
        sender,
        topic: sender,
        message,
      };
      state.entries.push(entry);
      if (state.entries.length > MAX_LOG_ENTRIES) {
        state.entries = state.entries.slice(-MAX_LOG_ENTRIES);
      }
    },
  },
});

export const {
  addLogEntry,
  setSubscriptionLevel,
  setFilter,
  resetFilters,
  clearLogs,
  togglePause,
  wsLogReceived,
} = logSlice.actions;

export default logSlice.reducer;
