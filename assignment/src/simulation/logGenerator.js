const LOG_LEVELS = ['TRACE', 'DEBUG', 'INFO', 'STATUS', 'WARNING', 'CRITICAL'];

// In real Constellation CMDP, the log topic is just the satellite name (e.g. "Mariner.Nine").
// There are no category topics like CSCP/CHIRP/etc.
const MESSAGE_TEMPLATES = [
  'Received command request from controller',
  'Sending response with payload attached',
  'Command execution completed successfully',
  'Processing incoming CSCP frame',
  'Broadcast discovery message sent',
  'Data frame received: {n} events',
  'Buffer utilization at {pct}%',
  'Writing data block to output stream',
  'Event rate: {rate} Hz',
  'State transition: {from} -> {to}',
  'Transition completed in {ms}ms',
  'All conditions for transition met',
  'Waiting for dependent satellites',
  'Configuration parameter updated: {key}',
  'Configuration validated successfully',
  'Applied {n} configuration parameters',
  'Memory usage: {mem}MB',
  'ZMQ socket bound to port {port}',
  'Cleanup routine completed',
  'Heartbeat interval: 3000ms',
];

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

  // In real Constellation, the CMDP topic is the satellite name itself
  const senderName = sender.id || `${sender.type}.${sender.name}`;
  const message = fillTemplate(pickRandom(MESSAGE_TEMPLATES));

  // weighted distribution
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
    sender: senderName,
    topic: senderName,
    message,
  };
}

export { LOG_LEVELS };
