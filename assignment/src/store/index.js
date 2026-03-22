import { configureStore } from '@reduxjs/toolkit';
import satelliteReducer from './satelliteSlice';
import logReducer from './logSlice';
import runReducer from './runSlice';
import telemetryReducer from './telemetrySlice';

export const store = configureStore({
  reducer: {
    satellites: satelliteReducer,
    logs: logReducer,
    run: runReducer,
    telemetry: telemetryReducer,
  },
});
