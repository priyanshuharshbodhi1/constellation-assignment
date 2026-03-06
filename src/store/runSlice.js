import { createSlice } from '@reduxjs/toolkit';

const runSlice = createSlice({
  name: 'run',
  initialState: {
    identifier: 'run',
    sequence: 0,
    isRunning: false,
    startTime: null,
    elapsed: 0, // seconds
  },
  reducers: {
    setRunIdentifier(state, action) {
      state.identifier = action.payload;
    },

    startRun(state) {
      state.isRunning = true;
      state.startTime = Date.now();
      state.elapsed = 0;
    },

    stopRun(state) {
      state.isRunning = false;
      state.startTime = null;
      state.sequence += 1;
    },

    tickTimer(state) {
      if (state.isRunning && state.startTime) {
        state.elapsed = Math.floor((Date.now() - state.startTime) / 1000);
      }
    },

    setSequence(state, action) {
      state.sequence = action.payload;
    },
  },
});

export const {
  setRunIdentifier,
  startRun,
  stopRun,
  tickTimer,
  setSequence,
} = runSlice.actions;

export default runSlice.reducer;
