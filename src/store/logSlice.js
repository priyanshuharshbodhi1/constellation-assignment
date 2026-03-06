import { createSlice } from '@reduxjs/toolkit';

const MAX_LOG_ENTRIES = 800;

const logSlice = createSlice({
  name: 'logs',
  initialState: {
    entries: [],
    subscriptionLevel: 'INFO', // minimum level to receive
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
      // Keep buffer from growing unbounded
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
  },
});

export const {
  addLogEntry,
  setSubscriptionLevel,
  setFilter,
  resetFilters,
  clearLogs,
  togglePause,
} = logSlice.actions;

export default logSlice.reducer;
