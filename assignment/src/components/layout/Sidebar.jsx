import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { id: 'control', label: 'Control', icon: '⊞' },
  { id: 'logs', label: 'Logs', icon: '☰' },
  { id: 'telemetry', label: 'Telemetry', icon: '⊿' },
];

export default function Sidebar({ activeView, onNavigate }) {
  return (
    <nav className={styles.sidebar}>
      <div className={styles.nav}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`${styles.navItem} ${activeView === item.id ? styles.active : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.footer}>
        <span className={styles.version}>v0.7 (Reticulum)</span>
      </div>
    </nav>
  );
}
