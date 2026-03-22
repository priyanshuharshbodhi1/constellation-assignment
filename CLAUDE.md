# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` - start Vite dev server (http://localhost:5173)
- `npm run build` - production build to `dist/`
- `npm run lint` - ESLint check
- `npm run preview` - serve the production build locally

## Architecture

This is a React 18 + Vite app that simulates a web interface for [Constellation](https://constellation.pages.desy.de/), a distributed DAQ system for particle physics experiments. There is no backend - all data is generated client-side by a simulation engine.

### Core layers

**Simulation (`src/simulation/`)** - Generates all mock data. `satelliteFSM.js` defines the state machine (states: NEW -> INIT -> ORBIT -> RUN, plus ERROR/SAFE), satellite presets, and valid transitions. `logGenerator.js` and `telemetryGenerator.js` produce realistic log entries and metric data points. `useSimulation.js` is a React hook that drives all timed updates (3s heartbeats, random-interval logs, 2s telemetry ticks, 1s run timer).

**Redux store (`src/store/`)** - Four slices: `satelliteSlice` (satellite array, state transitions, selection), `logSlice` (log buffer capped at 800, filters, subscription level), `runSlice` (run identifier, sequence counter, timer), `telemetrySlice` (60-point rolling history).

**Views (`src/components/`)** - Three views switched via sidebar (no router):
- `control/` - MissionControl equivalent. `ControlPanel` has global FSM buttons; `SatelliteTable` renders the connection table with right-click context menu; `SatelliteDetail` is a slide-in drawer.
- `logs/` - Observatory equivalent. `LogPanel` shows a live log stream with multi-filter toolbar.
- `telemetry/` - New feature. `TelemetryPanel` renders Recharts area/line charts and satellite health cards.

### Styling

CSS Modules with CSS custom properties for dark/light theming. Theme is toggled via `data-theme` attribute on `<html>`. All color tokens are in `src/index.css`. State colors match the real Constellation Qt GUIs (grey=NEW, blue=INIT, orange=ORBIT, green=RUN, red=ERROR).

### Key design decisions

- The FSM enforces valid transitions - `ALLOWED_TRANSITIONS` in `satelliteFSM.js` maps each state to its permitted commands. Both global and per-satellite commands check this.
- Transitional states (initializing, launching, etc.) are simulated with a setTimeout before completing the transition, mimicking real async behavior.
- The simulation hook uses refs to avoid re-subscribing intervals when Redux state changes.
