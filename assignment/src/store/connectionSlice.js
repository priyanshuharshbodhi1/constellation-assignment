import { createSlice } from '@reduxjs/toolkit';

const connectionSlice = createSlice({
  name: 'connection',
  initialState: {
    mode: 'live',
    status: 'disconnected',   // 'disconnected' | 'connecting' | 'connected' | 'error'
    wsUrl: 'ws://localhost:8000/ws',
    error: null,
  },
  reducers: {
    setMode(state, action) {
      state.mode = action.payload;
    },

    setStatus(state, action) {
      state.status = action.payload;
      if (action.payload === 'connected') {
        state.error = null;
      }
    },

    setWsUrl(state, action) {
      state.wsUrl = action.payload;
    },

    setError(state, action) {
      state.error = action.payload;
      state.status = 'error';
    },

    // These are intercepted by websocketMiddleware before reaching the reducer.
    // The reducer still runs to keep the Redux state consistent.
    connect(state) {
      state.status = 'connecting';
    },

    disconnect(state) {
      state.status = 'disconnected';
    },
  },
});

export const { setMode, setStatus, setWsUrl, setError, connect, disconnect } =
  connectionSlice.actions;

export default connectionSlice.reducer;
