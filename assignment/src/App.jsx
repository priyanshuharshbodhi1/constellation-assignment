import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import ControlPanel from './components/control/ControlPanel';
import LogPanel from './components/logs/LogPanel';
import TelemetryPanel from './components/telemetry/TelemetryPanel';
import { connect } from './store/connectionSlice';
import { tickTimer } from './store/runSlice';
import styles from './App.module.css';

export default function App() {
  const dispatch = useDispatch();
  const [activeView, setActiveView] = useState('control');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('constellation-theme') || 'dark';
  });

  useEffect(() => {
    dispatch(connect());
  }, [dispatch]);

  // Run timer — tick every second so elapsed display stays current
  useEffect(() => {
    const id = setInterval(() => dispatch(tickTimer()), 1000);
    return () => clearInterval(id);
  }, [dispatch]);

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
