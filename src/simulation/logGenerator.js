// Generates realistic log messages mimicking what Observatory would show

const LOG_LEVELS = ['TRACE', 'DEBUG', 'INFO', 'STATUS', 'WARNING', 'CRITICAL'];

const TOPICS = ['CSCP', 'CHIRP', 'DATA', 'FSM', 'HEARTBEAT', 'CONFIG', 'SYSTEM'];

// Pool of realistic messages for each topic
const MESSAGE_TEMPLATES = {
  CSCP: [
    'Received command request from controller',
    'Sending response with payload attached',
    'Command execution completed successfully',
    'Processing incoming CSCP frame',
  ],
  CHIRP: [
    'Broadcast discovery message sent',
    'New satellite discovered on network',
    'Satellite departure detected',
    'Network topology updated',
    'Service announcement received',
  ],
  DATA: [
    'Data frame received: {n} events',
    'Buffer utilization at {pct}%',
    'Writing data block to output stream',
    'Payload checksum verified',
    'Event rate: {rate} Hz',
  ],
  FSM: [
    'State transition: {from} → {to}',
    'Transition completed in {ms}ms',
    'All conditions for transition met',
    'Waiting for dependent satellites',
  ],
  HEARTBEAT: [
    'Heartbeat received from {sat}',
    'Lives remaining: {lives}',
    'Heartbeat interval: 3000ms',
    'Extrasystole detected, resetting counter',
  ],
  CONFIG: [
    'Configuration parameter updated: {key}',
    'Loading configuration from payload',
    'Configuration validated successfully',
    'Applied {n} configuration parameters',
  ],
  SYSTEM: [
    'Memory usage: {mem}MB',
    'Thread pool active: {threads} workers',
    'ZMQ socket bound to port {port}',
    'Cleanup routine completed',
  ],
};

let msgCounter = 0;

function fillTemplate(template) {
  return template
    .replace('{n}', Math.floor(Math.random() * 500 + 10))
    .replace('{pct}', Math.floor(Math.random() * 60 + 20))
    .replace('{rate}', Math.floor(Math.random() * 1000 + 100))
    .replace('{from}', 'ORBIT')
    .replace('{to}', 'RUN')
    .replace('{ms}', Math.floor(Math.random() * 200 + 50))
    .replace('{sat}', 'Sputnik.One')
    .replace('{lives}', '3')
    .replace('{key}', 'output_directory')
    .replace('{mem}', Math.floor(Math.random() * 256 + 64))
    .replace('{threads}', Math.floor(Math.random() * 4 + 2))
    .replace('{port}', Math.floor(Math.random() * 10000 + 30000));
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateLogEntry(satellites) {
  const sender = satellites.length > 0
    ? pickRandom(satellites)
    : { id: 'System', type: 'System', name: 'Core' };

  const topic = pickRandom(TOPICS);
  const templates = MESSAGE_TEMPLATES[topic];
  const message = fillTemplate(pickRandom(templates));

  // Weight towards INFO/STATUS, less WARNING/CRITICAL
  let level;
  const roll = Math.random();
  if (roll < 0.05) level = 'CRITICAL';
  else if (roll < 0.12) level = 'WARNING';
  else if (roll < 0.35) level = 'STATUS';
  else if (roll < 0.65) level = 'INFO';
  else if (roll < 0.85) level = 'DEBUG';
  else level = 'TRACE';

  msgCounter++;

  return {
    id: msgCounter,
    timestamp: new Date().toISOString(),
    level,
    sender: sender.id || `${sender.type}.${sender.name}`,
    topic,
    message,
  };
}

export { LOG_LEVELS, TOPICS };
