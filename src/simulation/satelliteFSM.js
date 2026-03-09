export const STATES = {
  NEW: 'New',
  INIT: 'Initialized',
  ORBIT: 'Orbiting',
  RUN: 'Running',
  ERROR: 'Error',
  SAFE: 'Safe',
};

export const TRANSITIONAL = {
  initializing: 'initializing',
  launching: 'launching',
  landing: 'landing',
  starting: 'starting',
  stopping: 'stopping',
  interrupting: 'interrupting',
};

export const ALLOWED_TRANSITIONS = {
  [STATES.NEW]: ['initialize'],
  [STATES.INIT]: ['initialize', 'launch', 'shutdown'],
  [STATES.ORBIT]: ['start', 'land', 'shutdown'],
  [STATES.RUN]: ['stop', 'shutdown'],
  [STATES.ERROR]: ['initialize', 'shutdown'],
  [STATES.SAFE]: ['initialize', 'shutdown'],
};

const TRANSITION_MAP = {
  initialize: { transitional: TRANSITIONAL.initializing, target: STATES.INIT },
  launch: { transitional: TRANSITIONAL.launching, target: STATES.ORBIT },
  start: { transitional: TRANSITIONAL.starting, target: STATES.RUN },
  stop: { transitional: TRANSITIONAL.stopping, target: STATES.ORBIT },
  land: { transitional: TRANSITIONAL.landing, target: STATES.INIT },
};

export function getTransition(command) {
  return TRANSITION_MAP[command] || null;
}

export function getStateColor(state) {
  switch (state) {
    case STATES.NEW: return 'var(--state-new)';
    case STATES.INIT: return 'var(--state-init)';
    case STATES.ORBIT: return 'var(--state-orbit)';
    case STATES.RUN: return 'var(--state-run)';
    case STATES.ERROR: return 'var(--state-error)';
    case STATES.SAFE: return 'var(--state-safe)';
    default: return 'var(--text-secondary)';
  }
}

export const SATELLITE_PRESETS = [
  { type: 'Sputnik', name: 'One', role: 'DYNAMIC' },
  { type: 'Sputnik', name: 'Two', role: 'DYNAMIC' },
  { type: 'Sputnik', name: 'Three', role: 'DYNAMIC' },
  { type: 'RandomTransmitter', name: 'Sender', role: 'DYNAMIC' },
  { type: 'EudaqNativeWriter', name: 'Receiver', role: 'DYNAMIC' },
];

const COMMANDS = [
  { name: 'get_commands', desc: 'Get commands supported by satellite (returned in payload as flat MessagePack dict with strings as keys)' },
  { name: 'get_config', desc: 'Get config of satellite (returned in payload as flat MessagePack dict with strings as keys)' },
  { name: 'get_name', desc: 'Get canonical name of satellite' },
  { name: 'get_role', desc: 'Get role of satellite' },
  { name: 'get_run_id', desc: 'Current or last run identifier' },
  { name: 'get_state', desc: 'Get state of satellite' },
  { name: 'get_status', desc: 'Get status of satellite' },
  { name: 'get_version', desc: 'Get Constellation version of satellite' },
  { name: 'initialize', desc: 'Initialize satellite (payload: config as flat MessagePack dict with strings as keys)' },
  { name: 'launch', desc: 'Launch satellite to ORBIT state' },
  { name: 'land', desc: 'Land satellite back to INIT state' },
  { name: 'start', desc: 'Start a new data acquisition run' },
  { name: 'stop', desc: 'Stop the current run' },
  { name: 'shutdown', desc: 'Shut down the satellite gracefully' },
];

export function createSatellite(preset) {
  const port = 30000 + Math.floor(Math.random() * 10000);
  return {
    id: `${preset.type}.${preset.name}`,
    type: preset.type,
    name: preset.name,
    state: STATES.NEW,
    lastMessage: '',
    heartbeat: 3000,
    lives: 3,
    role: preset.role,
    connectionUri: `tcp://127.0.0.1:${port}`,
    lastHeartbeat: new Date().toISOString(),
    lastCheck: new Date().toISOString(),
    lastResponse: '',
    md5HostId: Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    version: '0.7',
    commands: COMMANDS,
  };
}
