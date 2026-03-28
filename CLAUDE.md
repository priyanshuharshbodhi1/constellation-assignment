# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo Structure

```
constellation-assignment/
├── assignment/       ← React/Vite demo app (GSoC assignment submission)
└── constellation/    ← Constellation DAQ fork (separate git repo)
```

## Assignment App Commands
Run all npm commands from inside `assignment/`:

- `cd assignment && npm run dev` - start Vite dev server (http://localhost:5173)
- `cd assignment && npm run build` - production build to `assignment/dist/`
- `cd assignment && npm run lint` - ESLint check
- `cd assignment && npm run preview` - serve the production build locally

## Constellation Fork Remotes (inside `constellation/`)

| Remote | URL | Purpose |
|--------|-----|---------|
| `origin` | gitlab.com/priyanshuqpwp/constellation | Push branches here |
| `gitlab-desy` | gitlab.desy.de/constellation/constellation | Fetch latest upstream |
| `github` | github.com/priyanshuharshbodhi1/Constellation | GitHub mirror (PR path) |

### Contribution workflow
```bash
cd constellation
git fetch gitlab-desy && git rebase gitlab-desy/main <branch>
git push origin <branch>
# Then open MR on gitlab.com/priyanshuqpwp/constellation
# OR open PR on github.com/priyanshuharshbodhi1/Constellation (mirrors to DESY GitLab)
```

## Assignment Architecture

This is a React 18 + Vite app that simulates a web interface for [Constellation](https://constellation.pages.desy.de/), a distributed DAQ system for particle physics experiments. There is no backend - all data is generated client-side by a simulation engine.

### Core layers

**Simulation (`assignment/src/simulation/`)** - Generates all mock data. `satelliteFSM.js` defines the state machine (states: NEW -> INIT -> ORBIT -> RUN, plus ERROR/SAFE), satellite presets, and valid transitions. `logGenerator.js` and `telemetryGenerator.js` produce realistic log entries and metric data points. `useSimulation.js` is a React hook that drives all timed updates (3s heartbeats, random-interval logs, 2s telemetry ticks, 1s run timer).

**Redux store (`assignment/src/store/`)** - Four slices: `satelliteSlice` (satellite array, state transitions, selection), `logSlice` (log buffer capped at 800, filters, subscription level), `runSlice` (run identifier, sequence counter, timer), `telemetrySlice` (60-point rolling history).

**Views (`assignment/src/components/`)** - Three views switched via sidebar (no router):
- `control/` - MissionControl equivalent. `ControlPanel` has global FSM buttons; `SatelliteTable` renders the connection table with right-click context menu; `SatelliteDetail` is a slide-in drawer.
- `logs/` - Observatory equivalent. `LogPanel` shows a live log stream with multi-filter toolbar.
- `telemetry/` - New feature. `TelemetryPanel` renders Recharts area/line charts and satellite health cards.

### Styling

CSS Modules with CSS custom properties for dark/light theming. Theme is toggled via `data-theme` attribute on `<html>`. All color tokens are in `assignment/src/index.css`. State colors match the real Constellation Qt GUIs (grey=NEW, blue=INIT, orange=ORBIT, green=RUN, red=ERROR).

### Key design decisions

- The FSM enforces valid transitions - `ALLOWED_TRANSITIONS` in `satelliteFSM.js` maps each state to its permitted commands. Both global and per-satellite commands check this.
- Transitional states (initializing, launching, etc.) are simulated with a setTimeout before completing the transition, mimicking real async behavior.
- The simulation hook uses refs to avoid re-subscribing intervals when Redux state changes.
