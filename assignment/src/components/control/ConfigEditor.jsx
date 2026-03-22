import { useState } from 'react';
import { useSelector } from 'react-redux';
import styles from './ConfigEditor.module.css';

export default function ConfigEditor({ configContent, onContentChange }) {
  const configFile = useSelector(s => s.satellites.configFile);
  const [open, setOpen] = useState(false);

  if (!configFile || !configContent) return null;

  return (
    <div className={styles.editor}>
      <button className={styles.toggle} onClick={() => setOpen(!open)}>
        <span className={styles.arrow}>{open ? '▾' : '▸'}</span>
        Configuration: {configFile}
      </button>
      {open && (
        <div className={styles.editorBody}>
          <textarea
            className={styles.textarea}
            value={configContent}
            onChange={e => onContentChange(e.target.value)}
            spellCheck={false}
          />
          <div className={styles.hint}>
            TOML format - section headers use [SatelliteType.SatelliteName] convention
          </div>
        </div>
      )}
    </div>
  );
}
