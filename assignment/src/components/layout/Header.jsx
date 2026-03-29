import { useSelector } from 'react-redux';
import { STATES } from '../../simulation/satelliteFSM';
import styles from './Header.module.css';

function formatDuration(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// Priority order for "lowest state wins" when mixed — matches Qt behaviour.
const STATE_PRIORITY = {
  [STATES.NEW]: 0,
  [STATES.INIT]: 1,
  [STATES.ORBIT]: 2,
  [STATES.RUN]: 3,
  [STATES.ERROR]: -1,
  [STATES.SAFE]: -1,
};

// Returns { state, mixed } where mixed=true shows ≊ in the UI (Qt style).
function deriveGlobalState(satellites) {
  if (satellites.length === 0) return { state: STATES.NEW, mixed: false };

  const stableValues = new Set(Object.values(STATES));
  const stableStates = satellites.map(s => s.state).filter(s => stableValues.has(s));

  // If any are in ERROR/SAFE, report that regardless of others
  if (stableStates.some(s => s === STATES.ERROR || s === STATES.SAFE)) {
    const allError = stableStates.every(s => s === STATES.ERROR || s === STATES.SAFE);
    return { state: STATES.ERROR, mixed: !allError };
  }

  // Find the lowest stable state across all satellites
  const lowestPriority = Math.min(...stableStates.map(s => STATE_PRIORITY[s] ?? 0));
  const lowestState = Object.entries(STATE_PRIORITY).find(([, v]) => v === lowestPriority)?.[0] ?? STATES.NEW;

  // mixed = not all satellites are in the same state (includes satellites still transitioning)
  const allSame = satellites.every(s => s.state === lowestState);
  return { state: lowestState, mixed: !allSame };
}

export default function Header({ theme, onToggleTheme }) {
  const satellites = useSelector(s => s.satellites.items);
  const constellationName = useSelector(s => s.satellites.constellationName);
  const run = useSelector(s => s.run);
  const connection = useSelector(s => s.connection);

  const { state: globalState, mixed } = deriveGlobalState(satellites);
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
          <span className={`${styles.value} ${styles[stateClass]}`}>
            {globalState}{mixed && ' \u2248'}
          </span>
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
