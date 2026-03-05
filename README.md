# Constellation Web Interface

A browser-based control and monitoring interface for [Constellation](https://constellation.pages.desy.de/), the autonomous DAQ system for dynamic experimental setups. Built as a demo/prototype showing how MissionControl and Observatory could work as a unified web application.

## What is this?

Constellation is a distributed control and data acquisition framework used at DESY for small-scale particle physics experiments. Currently it ships with two Qt-based GUIs:

- **MissionControl** — controls the satellite state machine (initialize, launch, start runs, stop, land)
- **Observatory** — monitors log messages from satellites in real time

This project reimagines both tools as a single web interface, adding real-time telemetry charts and satellite health monitoring on top.

## Features

### Control Panel (MissionControl equivalent)
- Global state machine controls: Initialize → Launch → Start → Stop → Land → Shutdown
- Satellite connection table with live state, last message, heartbeat and lives
- Right-click any satellite to send individual commands
- Click a satellite to open its detail drawer (connection info, available commands)
- Configuration file management and run identifier with auto-incrementing sequence

### Log Monitor (Observatory equivalent)
- Live scrolling log stream with color-coded severity levels
- Filter by level, sender satellite, topic and free text search
- Adjustable subscription level (only receive messages above a threshold)
- Pause/resume and clear controls
- Message counter in the status bar

### Telemetry (new — not in the Qt apps)
- Real-time event rate and data throughput charts
- Buffer usage monitoring
- Per-satellite health indicators with heartbeat status

### General
- Dark/light theme toggle with persistent preference
- All data is simulated — a mock WebSocket-style engine generates realistic satellite heartbeats, log messages and telemetry data at runtime
- The satellite FSM enforces the same state transitions as the real Constellation protocol

## Getting started

```bash
# install dependencies
npm install

# start the dev server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

### Quick walkthrough

1. Open the **Control** tab (default view)
2. Click **Initialize** — satellites transition from `New` → `Initialized`
3. Click **Launch** — satellites move to `Orbiting`
4. Click **Start** — satellites enter `Running` state and the run timer begins
5. Switch to the **Logs** tab to see live messages flowing in
6. Switch to **Telemetry** to see event rate and throughput graphs climbing
7. Back on Control, click **Stop** then **Land** to bring satellites back down
8. Right-click any satellite row for per-satellite commands
9. Click a satellite row to open its detail drawer

## Tech stack

- React 18 + Vite
- Redux Toolkit for state management
- Recharts for telemetry graphs
- CSS Modules with CSS custom properties for theming
- No UI framework — all components are custom

## Project structure

```
src/
  simulation/         # mock data generators and simulation hook
    satelliteFSM.js   # state machine, transitions, satellite factory
    logGenerator.js   # realistic log message generation
    telemetryGenerator.js
    useSimulation.js  # hook that drives all timed updates
  store/              # redux toolkit slices
    satelliteSlice.js
    logSlice.js
    runSlice.js
    telemetrySlice.js
  components/
    layout/           # header, sidebar
    control/          # satellite table, detail drawer, control buttons
    logs/             # log panel with filters
    telemetry/        # charts and health indicators
```

## How the simulation works

Instead of connecting to a real Constellation backend via WebSocket, a `useSimulation` hook runs several intervals:

- **Heartbeats** — every 3 seconds, satellite timestamps update (matching real Constellation's 3s heartbeat)
- **Logs** — at random intervals (faster during a run), realistic log entries are generated with appropriate levels, senders and topics
- **Telemetry** — every 2 seconds, event rate and throughput data points are produced. Values ramp up during a run and decay when idle
- **Timer** — the run duration ticks every second while a run is active

State transitions are enforced — you can't start a run without launching first, and you can't launch without initializing. This matches the real Constellation FSM: `NEW → INIT → ORBIT → RUN`.
