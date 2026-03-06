import { createSlice } from '@reduxjs/toolkit';

const MAX_DATA_POINTS = 60;

const telemetrySlice = createSlice({
  name: 'telemetry',
  initialState: {
    history: [],
  },
  reducers: {
    addTelemetryPoint(state, action) {
      state.history.push(action.payload);
      if (state.history.length > MAX_DATA_POINTS) {
        state.history = state.history.slice(-MAX_DATA_POINTS);
      }
    },

    clearTelemetry(state) {
      state.history = [];
    },
  },
});

export const { addTelemetryPoint, clearTelemetry } = telemetrySlice.actions;

export default telemetrySlice.reducer;
