import { useDispatch } from 'react-redux';
import { sendSatelliteCommand } from '../../store/satelliteSlice';
import { ALLOWED_TRANSITIONS } from '../../simulation/satelliteFSM';
import styles from './SatelliteDetail.module.css';

const FSM_COMMANDS = new Set(['initialize', 'launch', 'land', 'start', 'stop', 'shutdown']);

export default function SatelliteDetail({ satellite, onClose }) {
  const dispatch = useDispatch();

  const connectionFields = [
    ['Connection URI', satellite.connectionUri],
    ['Heartbeat', `${satellite.heartbeat}ms`],
    ['Last Check', satellite.lastCheck ? new Date(satellite.lastCheck).toISOString() : '—'],
    ['Last heartbeat', satellite.lastHeartbeat ? new Date(satellite.lastHeartbeat).toISOString() : '—'],
    ['Last message', satellite.lastMessage || '—'],
    ['Last response', satellite.lastResponse || '—'],
    ['Lives', satellite.lives],
    ['MD5 host ID', satellite.md5HostId || '—'],
    ['Name', satellite.name],
    ['Role', satellite.role],
    ['State', satellite.state],
    ['Type', satellite.type],
  ];

  const allowedFsm = new Set(ALLOWED_TRANSITIONS[satellite.state] || []);

  const handleCmd = (cmdName) => {
    dispatch(sendSatelliteCommand({ satelliteId: satellite.id, command: cmdName }));
  };

  return (
    <div className={styles.drawer}>
      <div className={styles.header}>
        <h3>Satellite Connection Details</h3>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
      </div>

      <div className={styles.identity}>
        <div className={styles.idField}>
          <span className={styles.idLabel}>Satellite</span>
          <span className={styles.idValue}>{satellite.id}</span>
        </div>
        <div className={styles.idField}>
          <span className={styles.idLabel}>State</span>
          <span className={styles.idValue}>{satellite.state}</span>
        </div>
      </div>

      <div className={styles.section}>
        <h4>Connection</h4>
        <table className={styles.detailTable}>
          <tbody>
            {connectionFields.map(([key, val]) => (
              <tr key={key}>
                <td className={styles.fieldKey}>{key}</td>
                <td className={styles.fieldVal}>{String(val)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.section}>
        <h4>Available Commands</h4>
        <table className={styles.detailTable}>
          <thead>
            <tr>
              <th>Command</th>
              <th>Description</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {satellite.commands.map(cmd => {
              const isFsm = FSM_COMMANDS.has(cmd.name);
              const canRun = isFsm && allowedFsm.has(cmd.name);
              return (
                <tr key={cmd.name}>
                  <td className={styles.cmdName}>{cmd.name}</td>
                  <td className={styles.cmdDesc}>{cmd.desc}</td>
                  <td className={styles.cmdAction}>
                    {isFsm ? (
                      <button
                        className={`${styles.cmdBtn} ${canRun ? styles.cmdBtnActive : ''}`}
                        disabled={!canRun}
                        onClick={() => handleCmd(cmd.name)}
                        title={canRun ? `Send ${cmd.name}` : 'Not allowed in current state'}
                      >
                        Send
                      </button>
                    ) : (
                      <button
                        className={styles.cmdBtn}
                        onClick={() => handleCmd(cmd.name)}
                        title={`Query: ${cmd.name}`}
                      >
                        Send
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.actions}>
        <button className={styles.closeAction} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
