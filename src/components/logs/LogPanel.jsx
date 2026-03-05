import { useEffect, useRef, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setSubscriptionLevel,
  setFilter,
  resetFilters,
  clearLogs,
  togglePause,
} from '../../store/logSlice';
import { LOG_LEVELS, TOPICS } from '../../simulation/logGenerator';
import styles from './LogPanel.module.css';

const LEVEL_PRIORITY = Object.fromEntries(LOG_LEVELS.map((l, i) => [l, i]));

function LogEntry({ entry }) {
  const levelClass = entry.level.toLowerCase();
  return (
    <div className={`${styles.entry} ${styles[levelClass]}`}>
      <span className={styles.timestamp}>
        {new Date(entry.timestamp).toLocaleTimeString('en-GB', { hour12: false })}
      </span>
      <span className={`${styles.level} ${styles[levelClass]}`}>{entry.level}</span>
      <span className={styles.sender}>{entry.sender}</span>
      <span className={styles.topic}>{entry.topic}</span>
      <span className={styles.message}>{entry.message}</span>
    </div>
  );
}

export default function LogPanel() {
  const dispatch = useDispatch();
  const { entries, subscriptionLevel, filters, paused } = useSelector(s => s.logs);
  const satellites = useSelector(s => s.satellites.items);
  const listRef = useRef(null);
  const autoScrollRef = useRef(true);

  // Get unique senders from current satellites
  const senderOptions = useMemo(() => {
    return satellites.map(s => s.id);
  }, [satellites]);

  // Apply filters on the client side
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (filters.level && entry.level !== filters.level) return false;
      if (filters.sender && entry.sender !== filters.sender) return false;
      if (filters.topic && entry.topic !== filters.topic) return false;
      if (filters.text && !entry.message.toLowerCase().includes(filters.text.toLowerCase())) return false;
      return true;
    });
  }, [entries, filters]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScrollRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [filteredEntries.length]);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 40;
  };

  return (
    <div className={styles.panel}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <div className={styles.filterItem}>
            <label>Level</label>
            <select
              value={filters.level}
              onChange={e => dispatch(setFilter({ key: 'level', value: e.target.value }))}
            >
              <option value="">All</option>
              {LOG_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className={styles.filterItem}>
            <label>Sender</label>
            <select
              value={filters.sender}
              onChange={e => dispatch(setFilter({ key: 'sender', value: e.target.value }))}
            >
              <option value="">All</option>
              {senderOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className={styles.filterItem}>
            <label>Topic</label>
            <select
              value={filters.topic}
              onChange={e => dispatch(setFilter({ key: 'topic', value: e.target.value }))}
            >
              <option value="">All</option>
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className={styles.filterItem}>
            <label>Search</label>
            <input
              type="text"
              placeholder="Filter messages..."
              value={filters.text}
              onChange={e => dispatch(setFilter({ key: 'text', value: e.target.value }))}
              className={styles.searchInput}
            />
          </div>

          <button className={styles.filterBtn} onClick={() => dispatch(resetFilters())}>
            Reset
          </button>
        </div>

        <div className={styles.toolbarRight}>
          <div className={styles.filterItem}>
            <label>Subscribe</label>
            <select
              value={subscriptionLevel}
              onChange={e => dispatch(setSubscriptionLevel(e.target.value))}
            >
              {LOG_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <button
            className={`${styles.filterBtn} ${paused ? styles.pauseActive : ''}`}
            onClick={() => dispatch(togglePause())}
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>

          <button className={styles.filterBtn} onClick={() => dispatch(clearLogs())}>
            Clear
          </button>
        </div>
      </div>

      {/* Log list */}
      <div className={styles.logList} ref={listRef} onScroll={handleScroll}>
        {filteredEntries.length === 0 ? (
          <div className={styles.emptyState}>
            {entries.length === 0 ? 'Waiting for log messages...' : 'No messages match current filters'}
          </div>
        ) : (
          filteredEntries.map(entry => <LogEntry key={entry.id} entry={entry} />)
        )}
      </div>

      {/* Status bar */}
      <div className={styles.statusBar}>
        <span>
          {filteredEntries.length !== entries.length
            ? `Showing ${filteredEntries.length} of ${entries.length}`
            : `${entries.length} messages`}
        </span>
        {paused && <span className={styles.pauseBadge}>PAUSED</span>}
      </div>
    </div>
  );
}
