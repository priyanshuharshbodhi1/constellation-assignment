import { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  sendGlobalCommand,
  completeTransition,
  setConfigFile,
  shutdownAll,
  selectSatellite,
} from '../../store/satelliteSlice';
import { startRun, stopRun, setRunIdentifier, setSequence } from '../../store/runSlice';
import { STATES, ALLOWED_TRANSITIONS } from '../../simulation/satelliteFSM';
import SatelliteTable from './SatelliteTable';
import SatelliteDetail from './SatelliteDetail';
import styles from './ControlPanel.module.css';

const TRANSITION_DELAY = 800;

export default function ControlPanel() {
  const dispatch = useDispatch();
  const satellites = useSelector(s => s.satellites.items);
  const configFile = useSelector(s => s.satellites.configFile);
  const selectedId = useSelector(s => s.satellites.selectedSatelliteId);
  const run = useSelector(s => s.run);
  const [transitioning, setTransitioning] = useState(false);

  // Check if a global command is possible given current satellite states
  const canSend = useCallback((command) => {
    if (transitioning) return false;
    return satellites.some(sat => {
      const allowed = ALLOWED_TRANSITIONS[sat.state] || [];
      return allowed.includes(command);
    });
  }, [satellites, transitioning]);

  const handleGlobalCommand = useCallback((command) => {
    if (!canSend(command)) return;
    setTransitioning(true);

    if (command === 'start') {
      dispatch(startRun());
    } else if (command === 'stop') {
      dispatch(stopRun());
    }

    dispatch(sendGlobalCommand(command));

    // Simulate transition delay
    setTimeout(() => {
      dispatch(completeTransition({ command }));
      setTransitioning(false);
    }, TRANSITION_DELAY);
  }, [dispatch, canSend]);

  const handleShutdown = () => {
    if (run.isRunning) {
      dispatch(stopRun());
    }
    dispatch(shutdownAll());
  };

  const handleSelectConfig = () => {
    dispatch(setConfigFile('/tmp/test/config.toml'));
  };

  const handleDeduce = () => {
    dispatch(setConfigFile('/tmp/test/config_deduced.toml'));
  };

  const selectedSat = selectedId
    ? satellites.find(s => s.id === selectedId)
    : null;

  return (
    <div className={styles.panel}>
      <div className={styles.main}>
        {/* Configuration + control row */}
        <div className={styles.toolbar}>
          <div className={styles.configSection}>
            <div className={styles.configRow}>
              <label>Configuration:</label>
              <input
                type="text"
                value={configFile}
                readOnly
                placeholder="Configuration file not set"
                className={styles.configInput}
              />
              <button className={styles.btn} onClick={handleSelectConfig}>Select</button>
              <button className={styles.btn} onClick={handleDeduce}>Deduce</button>
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

        {/* Satellite table */}
        <SatelliteTable
          satellites={satellites}
          onSelect={id => dispatch(selectSatellite(id))}
          selectedId={selectedId}
        />
      </div>

      {/* Detail drawer */}
      {selectedSat && (
        <SatelliteDetail
          satellite={selectedSat}
          onClose={() => dispatch(selectSatellite(null))}
        />
      )}
    </div>
  );
}
