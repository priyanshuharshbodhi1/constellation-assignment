import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { STATES, ALLOWED_TRANSITIONS, getTransition } from '../../simulation/satelliteFSM';
import {
  sendSatelliteCommand,
  completeSatelliteTransition,
  triggerError,
} from '../../store/satelliteSlice';
import styles from './SatelliteTable.module.css';

const STATE_DOT_CLASS = {
  [STATES.NEW]: 'dotNew',
  [STATES.INIT]: 'dotInit',
  [STATES.ORBIT]: 'dotOrbit',
  [STATES.RUN]: 'dotRun',
  [STATES.ERROR]: 'dotError',
  [STATES.SAFE]: 'dotSafe',
};

function ContextMenu({ satellite, position, onClose }) {
  const dispatch = useDispatch();

  const commands = [
    { name: 'initialize', type: 'transition' },
    { name: 'launch', type: 'transition' },
    { name: 'land', type: 'transition' },
    { name: 'start', type: 'transition' },
    { name: 'stop', type: 'transition' },
    { name: 'shutdown', type: 'transition' },
    null, // separator
    { name: 'get_name', type: 'query' },
    { name: 'get_version', type: 'query' },
    { name: 'get_commands', type: 'query' },
    { name: 'get_state', type: 'query' },
    { name: 'get_role', type: 'query' },
    { name: 'get_status', type: 'query' },
    { name: 'get_config', type: 'query' },
    { name: 'get_run_id', type: 'query' },
  ];

  const handleCommand = (cmd) => {
    const transition = getTransition(cmd.name);
    if (transition) {
      dispatch(sendSatelliteCommand({ satelliteId: satellite.id, command: cmd.name }));
      setTimeout(() => {
        dispatch(completeSatelliteTransition({ satelliteId: satellite.id, command: cmd.name }));
      }, 600);
    }
    onClose();
  };

  return (
    <>
      <div className={styles.menuBackdrop} onClick={onClose} />
      <div
        className={styles.contextMenu}
        style={{ top: position.y, left: position.x }}
      >
        {commands.map((cmd, i) => {
          if (!cmd) return <div key={i} className={styles.menuSeparator} />;
          const allowed = ALLOWED_TRANSITIONS[satellite.state] || [];
          const isTransition = cmd.type === 'transition';
          const disabled = isTransition && !allowed.includes(cmd.name);

          return (
            <button
              key={cmd.name}
              className={`${styles.menuItem} ${disabled ? styles.menuDisabled : ''}`}
              onClick={() => !disabled && handleCommand(cmd)}
              disabled={disabled}
            >
              {isTransition && <span className={styles.menuDot} data-cmd={cmd.name} />}
              {cmd.name}
            </button>
          );
        })}
      </div>
    </>
  );
}

export default function SatelliteTable({ satellites, onSelect, selectedId }) {
  const [contextMenu, setContextMenu] = useState(null);
  const [sortField, setSortField] = useState('type');
  const [sortAsc, setSortAsc] = useState(true);

  const handleContextMenu = useCallback((e, sat) => {
    e.preventDefault();
    setContextMenu({
      satellite: sat,
      position: { x: e.clientX, y: e.clientY },
    });
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sorted = [...satellites].sort((a, b) => {
    const va = a[sortField] || '';
    const vb = b[sortField] || '';
    const cmp = va.localeCompare ? va.localeCompare(vb) : va - vb;
    return sortAsc ? cmp : -cmp;
  });

  return (
    <div className={styles.container}>
      <div className={styles.tableHeader}>Satellite connections</div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {['type', 'name', 'state'].map(col => (
                <th key={col} onClick={() => handleSort(col)} className={styles.sortable}>
                  {col.charAt(0).toUpperCase() + col.slice(1)}
                  {sortField === col && <span className={styles.sortArrow}>{sortAsc ? ' ▲' : ' ▼'}</span>}
                </th>
              ))}
              <th>Last message</th>
              <th>Heartbeat</th>
              <th>Lives</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(sat => {
              const dotClass = STATE_DOT_CLASS[sat.state] || 'dotNew';
              const stateKey = Object.entries(STATES).find(([, v]) => v === sat.state)?.[0]?.toLowerCase() || '';

              return (
                <tr
                  key={sat.id}
                  className={`${styles.row} ${selectedId === sat.id ? styles.selected : ''}`}
                  onClick={() => onSelect(sat.id)}
                  onContextMenu={e => handleContextMenu(e, sat)}
                >
                  <td>{sat.type}</td>
                  <td>{sat.name}</td>
                  <td>
                    <span className={`${styles.stateText} ${styles[stateKey]}`}>
                      {sat.state}
                    </span>
                  </td>
                  <td className={styles.msgCell}>
                    <span className={`${styles.msgDot} ${styles[dotClass]}`} />
                    {sat.lastMessage}
                  </td>
                  <td className={styles.mono}>{sat.state !== STATES.NEW ? `${sat.heartbeat}ms` : ''}</td>
                  <td className={styles.mono}>{sat.state !== STATES.NEW ? sat.lives : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {contextMenu && (
        <ContextMenu
          satellite={contextMenu.satellite}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
