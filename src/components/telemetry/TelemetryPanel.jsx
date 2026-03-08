import { useSelector } from 'react-redux';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { STATES } from '../../simulation/satelliteFSM';
import styles from './TelemetryPanel.module.css';

function ChartCard({ title, children }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>{title}</h3>
      <div className={styles.chartWrap}>
        {children}
      </div>
    </div>
  );
}

function SatelliteHealth({ satellites }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Satellite Health</h3>
      <div className={styles.healthGrid}>
        {satellites.map(sat => {
          const isOk = sat.state === STATES.RUN || sat.state === STATES.ORBIT;
          const isErr = sat.state === STATES.ERROR;

          return (
            <div key={sat.id} className={styles.healthItem}>
              <div className={`${styles.healthDot} ${isErr ? styles.healthError : isOk ? styles.healthOk : styles.healthIdle}`} />
              <div className={styles.healthInfo}>
                <span className={styles.healthName}>{sat.id}</span>
                <span className={styles.healthState}>{sat.state}</span>
              </div>
              <div className={styles.healthMeta}>
                <span>{sat.heartbeat}ms</span>
                <span>♥ {sat.lives}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const chartColors = {
  grid: 'var(--border)',
  text: 'var(--text-muted)',
};

export default function TelemetryPanel() {
  const history = useSelector(s => s.telemetry.history);
  const satellites = useSelector(s => s.satellites.items);
  const run = useSelector(s => s.run);

  const latest = history.length > 0 ? history[history.length - 1] : null;

  return (
    <div className={styles.panel}>
      {/* Summary cards */}
      <div className={styles.summaryRow}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Event Rate</span>
          <span className={styles.metricValue}>{latest ? latest.eventRate : 0} <small>Hz</small></span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Data Throughput</span>
          <span className={styles.metricValue}>{latest ? latest.throughput : 0} <small>MB/s</small></span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Buffer Usage</span>
          <span className={styles.metricValue}>{latest ? latest.bufferUsage : 0}<small>%</small></span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Run Status</span>
          <span className={`${styles.metricValue} ${run.isRunning ? styles.runActive : ''}`}>
            {run.isRunning ? 'ACTIVE' : 'IDLE'}
          </span>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <ChartCard title="Event Rate (Hz)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: chartColors.text }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: chartColors.text }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="eventRate"
                stroke="#4caf50"
                fill="#4caf50"
                fillOpacity={0.15}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Data Throughput (MB/s)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: chartColors.text }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: chartColors.text }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="throughput"
                stroke="#5b9bd5"
                fill="#5b9bd5"
                fillOpacity={0.15}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Buffer Usage (%)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: chartColors.text }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: chartColors.text }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="bufferUsage"
                stroke="#e8a838"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <SatelliteHealth satellites={satellites} />
      </div>
    </div>
  );
}
