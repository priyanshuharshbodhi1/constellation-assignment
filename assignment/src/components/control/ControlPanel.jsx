import { useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  sendGlobalCommand,
  setConfigFile,
  shutdownAll,
  selectSatellite,
} from '../../store/satelliteSlice';
import { setRunIdentifier, setSequence } from '../../store/runSlice';
import { setSubscriptionLevel } from '../../store/logSlice';
import { ALLOWED_TRANSITIONS } from '../../simulation/satelliteFSM';
import SatelliteTable from './SatelliteTable';
import SatelliteDetail from './SatelliteDetail';
import ConfigEditor from './ConfigEditor';
import styles from './ControlPanel.module.css';

const LOG_LEVELS = ['TRACE', 'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL', 'STATUS'];

function deduceConfig(satellites) {
  return satellites.map(sat => {
    const lines = [`[${sat.type}.${sat.name}]`];
    lines.push(`state = "${sat.state}"`);
    lines.push(`role = "${sat.role}"`);
    lines.push(`connection_uri = "${sat.connectionUri}"`);
    lines.push(`heartbeat = ${sat.heartbeat}`);
    if (sat.type === 'EudaqNativeWriter') {
      lines.push(`_data.receive_from = "RandomTransmitter.Sender"`);
      lines.push(`file_pattern = "run{run_id}_{sequence}.raw"`);
    }
    if (sat.type === 'RandomTransmitter') {
      lines.push(`event_size = 1024`);
      lines.push(`frequency = 500`);
    }
    if (sat.type === 'Sputnik') {
      lines.push(`_data.receive_from = "RandomTransmitter.Sender"`);
      lines.push(`threshold = 100`);
    }
    return lines.join('\n');
  }).join('\n\n') + '\n';
}

export default function ControlPanel() {
  const dispatch = useDispatch();
  const satellites = useSelector(s => s.satellites.items);
  const configFile = useSelector(s => s.satellites.configFile);
  const selectedId = useSelector(s => s.satellites.selectedSatelliteId);
  const run = useSelector(s => s.run);
  const subscriptionLevel = useSelector(s => s.logs.subscriptionLevel);
  const [configContent, setConfigContent] = useState('');
  const fileInputRef = useRef(null);

  const canSend = useCallback((command) => {
    return satellites.some(sat => {
      const allowed = ALLOWED_TRANSITIONS[sat.state] || [];
      return allowed.includes(command);
    });
  }, [satellites]);

  const handleGlobalCommand = useCallback((command) => {
    if (!canSend(command)) return;
    dispatch(sendGlobalCommand(command));
  }, [dispatch, canSend]);

  const handleShutdown = () => {
    dispatch(sendGlobalCommand('shutdown'));
  };

  const handleSelectConfig = () => fileInputRef.current?.click();

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setConfigContent(ev.target.result);
      dispatch(setConfigFile(file.name));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeduce = () => {
    const deduced = deduceConfig(satellites);
    setConfigContent(deduced);
    dispatch(setConfigFile('config_deduced.toml'));
  };

  const selectedSat = selectedId ? satellites.find(s => s.id === selectedId) : null;

  return (
    <div className={styles.panel}>
      <div className={styles.main}>

        {/* ── Configuration + Control ────────────────────────────────── */}
        <div className={styles.toolbar}>

          <div className={styles.configSection}>
            <div className={styles.sectionLabel}>Configuration</div>

            <div className={styles.configRow}>
              <label>Configuration:</label>
              <input
                type="text"
                value={configFile}
                readOnly
                placeholder="Configuration file not set"
                className={`${styles.configInput} ${!configFile ? styles.configInputEmpty : ''}`}
              />
              <button className={styles.btn} onClick={handleSelectConfig}>Select</button>
              <button className={styles.btn} onClick={handleDeduce} disabled={satellites.length === 0}>Deduce</button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".toml,.ini,.cfg,.conf,.txt"
                onChange={handleFileSelected}
                style={{ display: 'none' }}
              />
            </div>

            <div className={styles.configRow}>
              <label>Log:</label>
              <input
                type="text"
                readOnly
                placeholder="(log path)"
                className={styles.configInput}
              />
              <select
                value={subscriptionLevel}
                onChange={e => dispatch(setSubscriptionLevel(e.target.value))}
                className={styles.logLevelSelect}
              >
                {LOG_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <button className={styles.btn}>Log</button>
            </div>

            <div className={styles.configRow}>
              <label>Run Identifier:</label>
              <input
                type="text"
                value={run.identifier}
                onChange={e => dispatch(setRunIdentifier(e.target.value))}
                className={styles.runInput}
              />
              <label className={styles.seqLabel}>Sequence:</label>
              <input
                type="number"
                value={run.sequence}
                onChange={e => dispatch(setSequence(Number(e.target.value)))}
                className={styles.seqInput}
                min={0}
              />
            </div>
          </div>

          <div className={styles.controlButtons}>
            <div className={styles.sectionLabel}>Control</div>
            <div className={styles.btnRow}>
              <button
                className={`${styles.cmdBtn} ${styles.initBtn}`}
                disabled={!canSend('initialize')}
                onClick={() => handleGlobalCommand('initialize')}
              >
                Initialize
              </button>
              <button
                className={`${styles.cmdBtn} ${styles.shutdownBtn}`}
                onClick={handleShutdown}
              >
                Shutdown
              </button>
            </div>
            <div className={styles.btnRow}>
              <button
                className={`${styles.cmdBtn} ${styles.launchBtn}`}
                disabled={!canSend('launch')}
                onClick={() => handleGlobalCommand('launch')}
              >
                Launch
              </button>
              <button
                className={`${styles.cmdBtn} ${styles.landBtn}`}
                disabled={!canSend('land')}
                onClick={() => handleGlobalCommand('land')}
              >
                Land
              </button>
            </div>
            <div className={styles.btnRow}>
              <button
                className={`${styles.cmdBtn} ${styles.startBtn}`}
                disabled={!canSend('start')}
                onClick={() => handleGlobalCommand('start')}
              >
                Start
              </button>
              <button
                className={`${styles.cmdBtn} ${styles.stopBtn}`}
                disabled={!canSend('stop')}
                onClick={() => handleGlobalCommand('stop')}
              >
                Stop
              </button>
            </div>
          </div>
        </div>

        <ConfigEditor configContent={configContent} onContentChange={setConfigContent} />

        <SatelliteTable
          satellites={satellites}
          onSelect={id => dispatch(selectSatellite(id))}
          selectedId={selectedId}
        />
      </div>

      {selectedSat && (
        <SatelliteDetail
          satellite={selectedSat}
          onClose={() => dispatch(selectSatellite(null))}
        />
      )}
    </div>
  );
}
