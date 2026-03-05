import { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import ControlPanel from './components/control/ControlPanel';
import LogPanel from './components/logs/LogPanel';
import TelemetryPanel from './components/telemetry/TelemetryPanel';
import { useSimulation } from './simulation/useSimulation';
import styles from './App.module.css';

export default function App() {
  const [activeView, setActiveView] = useState('control');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('constellation-theme') || 'dark';
  });

  // Start the simulation (heartbeats, logs, telemetry)
  useSimulation();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('constellation-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const renderView = () => {
    switch (activeView) {
      case 'control': return <ControlPanel />;
      case 'logs': return <LogPanel />;
      case 'telemetry': return <TelemetryPanel />;
      default: return <ControlPanel />;
    }
  };

  return (
    <div className={styles.app}>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <div className={styles.body}>
        <Sidebar activeView={activeView} onNavigate={setActiveView} />
        <main className={styles.content}>
          {renderView()}
        </main>
      </div>
    </div>
  );
}
