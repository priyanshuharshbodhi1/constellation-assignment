let baseEventRate = 0;
let baseThroughput = 0;

export function generateTelemetryTick(isRunning) {
  const now = new Date();
  const timeLabel = now.toLocaleTimeString('en-GB', { hour12: false });

  if (isRunning) {
    baseEventRate = Math.min(baseEventRate + Math.random() * 50, 800) + (Math.random() - 0.5) * 40;
    baseThroughput = Math.min(baseThroughput + Math.random() * 2, 25) + (Math.random() - 0.5) * 3;
  } else {
    baseEventRate = Math.max(baseEventRate * 0.85, 0);
    baseThroughput = Math.max(baseThroughput * 0.85, 0);
  }

  return {
    time: timeLabel,
    eventRate: Math.max(0, Math.round(baseEventRate)),
    throughput: Math.max(0, parseFloat(baseThroughput.toFixed(1))),
    bufferUsage: isRunning ? Math.floor(Math.random() * 40 + 20) : 0,
  };
}

export function resetTelemetry() {
  baseEventRate = 0;
  baseThroughput = 0;
}
