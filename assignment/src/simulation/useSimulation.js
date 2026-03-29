import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateHeartbeats } from '../store/satelliteSlice';
import { addLogEntry } from '../store/logSlice';
import { tickTimer } from '../store/runSlice';
import { addTelemetryPoint } from '../store/telemetrySlice';
import { generateLogEntry, LOG_LEVELS } from './logGenerator';
import { generateTelemetryTick } from './telemetryGenerator';

const LEVEL_PRIORITY = Object.fromEntries(LOG_LEVELS.map((l, i) => [l, i]));

export function useSimulation() {
  const dispatch = useDispatch();
  const mode = useSelector(s => s.connection.mode);
  const satellites = useSelector(s => s.satellites.items);
  const isRunning = useSelector(s => s.run.isRunning);
  const subLevel = useSelector(s => s.logs.subscriptionLevel);
  const individualSubs = useSelector(s => s.logs.individualSubscriptions);
  const satellitesRef = useRef(satellites);
  const isRunningRef = useRef(isRunning);
  const subLevelRef = useRef(subLevel);
  const individualSubsRef = useRef(individualSubs);

  // Keep refs in sync without causing re-subscriptions
  useEffect(() => { satellitesRef.current = satellites; }, [satellites]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { subLevelRef.current = subLevel; }, [subLevel]);
  useEffect(() => { individualSubsRef.current = individualSubs; }, [individualSubs]);

  useEffect(() => {
    if (mode !== 'simulation') return;
    // Heartbeat ticker - every 3s like real Constellation
    const heartbeatInterval = setInterval(() => {
      dispatch(updateHeartbeats());
    }, 3000);

    // Log generator - random interval, faster when running
    let logTimeout;
    const scheduleLog = () => {
      const delay = isRunningRef.current
        ? 500 + Math.random() * 1500
        : 1000 + Math.random() * 4000;

      logTimeout = setTimeout(() => {
        const entry = generateLogEntry(satellitesRef.current);
        const globalPriority = LEVEL_PRIORITY[subLevelRef.current] ?? 0;
        const individualLevel = individualSubsRef.current[entry.sender];
        // Individual subs can only increase verbosity (lower threshold), not decrease it
        const effectivePriority = individualLevel != null
          ? Math.min(globalPriority, LEVEL_PRIORITY[individualLevel] ?? globalPriority)
          : globalPriority;
        if (LEVEL_PRIORITY[entry.level] >= effectivePriority) {
          dispatch(addLogEntry(entry));
        }
        scheduleLog();
      }, delay);
    };
    scheduleLog();

    // Telemetry ticker - every 2s
    const telemetryInterval = setInterval(() => {
      const point = generateTelemetryTick(isRunningRef.current);
      dispatch(addTelemetryPoint(point));
    }, 2000);

    // Run timer - every second
    const timerInterval = setInterval(() => {
      dispatch(tickTimer());
    }, 1000);

    return () => {
      clearInterval(heartbeatInterval);
      clearTimeout(logTimeout);
      clearInterval(telemetryInterval);
      clearInterval(timerInterval);
    };
  }, [dispatch, mode]);
}
