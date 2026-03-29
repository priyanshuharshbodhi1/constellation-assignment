import { useSelector } from 'react-redux';
import { STATES } from '../../simulation/satelliteFSM';
import styles from './Header.module.css';

function formatDuration(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function deriveGlobalState(satellites) {
  if (satellites.length === 0) return STATES.NEW;
  const states = satellites.map(s => s.state);
  if (states.every(s => s === STATES.RUN)) return STATES.RUN;
  if (states.every(s => s === STATES.ORBIT)) return STATES.ORBIT;
  if (states.every(s => s === STATES.INIT)) return STATES.INIT;
  if (states.every(s => s === STATES.NEW)) return STATES.NEW;
  if (states.some(s => s === STATES.ERROR)) return STATES.ERROR;
  // Mixed or transitional
  return states.find(s => typeof s === 'string' && !Object.values(STATES).includes(s)) || states[0];
}

export default function Header({ theme, onToggleTheme }) {
  const satellites = useSelector(s => s.satellites.items);
  const constellationName = useSelector(s => s.satellites.constellationName);
  const run = useSelector(s => s.run);
  const connection = useSelector(s => s.connection);

  const globalState = deriveGlobalState(satellites);
  const runIdDisplay = run.isRunning
    ? `${run.identifier}_${run.sequence}`
    : `${run.identifier}_${run.sequence} (next)`;

  const stateClass = globalState.toLowerCase().replace(/\s+/g, '');

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <svg viewBox="0 0 32 32" className={styles.logoIcon}>
          <circle cx="16" cy="16" r="4" fill="var(--accent)" />
          <circle cx="16" cy="16" r="10" fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity="0.6" />
          <circle cx="16" cy="16" r="15" fill="none" stroke="var(--accent)" strokeWidth="1" opacity="0.3" />
          <circle cx="26" cy="10" r="2" fill="var(--state-run)" />
          <circle cx="8" cy="24" r="2" fill="var(--state-orbit)" />
          <circle cx="22" cy="26" r="2" fill="var(--state-init)" />
        </svg>
        <span className={styles.title}>Constellation</span>
      </div>

      <div className={styles.statusBar}>
        <div className={styles.field}>
          <span className={styles.label}>Constellation</span>
          <span className={styles.value}>{constellationName}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Satellites</span>
          <span className={styles.value}>{satellites.length}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>State</span>
          <span className={`${styles.value} ${styles[stateClass]}`}>{globalState}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Run Identifier</span>
          <span className={styles.value}>{runIdDisplay}</span>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Run Duration</span>
          <span className={`${styles.value} ${styles.mono}`}>
            {formatDuration(run.elapsed)}
          </span>
        </div>
      </div>

      <div className={styles.headerRight}>
        <div
          className={styles.connectionBadge}
          data-status={connection.status}
          data-mode="live"
          title={
            connection.status === 'connected'
              ? 'Connected to Constellation bridge'
              : connection.status === 'connecting'
              ? 'Connecting to bridge...'
              : 'Bridge disconnected — retrying'
          }
        >
          <span className={styles.connectionDot} />
          {connection.status === 'connected'
            ? 'Live'
            : connection.status === 'connecting'
            ? 'Connecting'
            : 'Disconnected'}
        </div>
        <button
          className={styles.themeToggle}
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  );
}
