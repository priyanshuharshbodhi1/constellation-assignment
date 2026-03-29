import { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { STATES, ALLOWED_TRANSITIONS, getTransition } from '../../simulation/satelliteFSM';
import {
  sendSatelliteCommand,
  completeSatelliteTransition,
  setQueryResult,
  clearQueryResult,
} from '../../store/satelliteSlice';

const FSM_CMDS = new Set(['initialize', 'launch', 'land', 'start', 'stop', 'shutdown']);

function simulateQueryResponse(cmd, satellite, run) {
  switch (cmd) {
    case 'get_name':    return satellite.id;
    case 'get_version': return `v${satellite.version || '0.7'} (Reticulum)`;
    case 'get_state':   return satellite.state;
    case 'get_role':    return satellite.role;
    case 'get_status':  return `${satellite.id} is operational`;
    case 'get_run_id':  return run?.identifier ? `${run.identifier}_${run.sequence}` : 'N/A';
    case 'get_config':  return `[${satellite.id}]\nconnection_uri = "${satellite.connectionUri}"\nheartbeat = ${satellite.heartbeat}`;
    case 'get_commands': return satellite.commands?.map(c => c.name).join(', ') || 'N/A';
    default: return `Response for ${cmd}`;
  }
}

function QueryResultModal({ result, onClose }) {
  if (!result) return null;
  return (
    <>
      <div className={styles.modalBackdrop} onClick={onClose} />
      <div className={styles.queryModal}>
        <div className={styles.queryModalHeader}>
          <span className={styles.queryModalCmd}>{result.command}</span>
          <span className={styles.queryModalSat}>{result.satelliteId}</span>
          <button className={styles.queryModalClose} onClick={onClose}>×</button>
        </div>
        <pre className={styles.queryModalBody}>{result.result}</pre>
      </div>
    </>
  );
}
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
  const run = useSelector(s => s.run);
  const mode = useSelector(s => s.connection.mode);

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
    dispatch(sendSatelliteCommand({ satelliteId: satellite.id, command: cmd.name }));
    const transition = getTransition(cmd.name);
    if (transition) {
      setTimeout(() => {
        dispatch(completeSatelliteTransition({ satelliteId: satellite.id, command: cmd.name }));
      }, 600);
    }
    // For query commands in simulation mode, show response modal immediately
    if (!FSM_CMDS.has(cmd.name) && mode !== 'live') {
      const result = simulateQueryResponse(cmd.name, satellite, run);
      dispatch(setQueryResult({ satelliteId: satellite.id, command: cmd.name, result }));
    }
    // In live mode the WS response triggers setQueryResult via middleware
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
  const dispatch = useDispatch();
  const queryResult = useSelector(s => s.satellites.queryResult);
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
              <th className={styles.msgHeader}>Last message</th>
              <th>Heartbeat</th>
              <th>Lives</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(sat => {
              const dotClass = STATE_DOT_CLASS[sat.state] || 'dotNew';
              const stateKey = Object.entries(STATES).find(([, v]) => v === sat.state)?.[0]?.toLowerCase() || sat.state;

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
                    <span className={styles.msgText}>{sat.lastMessage || '—'}</span>
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

      <QueryResultModal
        result={queryResult}
        onClose={() => dispatch(clearQueryResult())}
      />
    </div>
  );
}
