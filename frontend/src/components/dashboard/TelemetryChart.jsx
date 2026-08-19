import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { Activity } from 'lucide-react';

export const TelemetryChart = () => {
  const { telemetryHistory } = useTelemetry();
  const latest = telemetryHistory[telemetryHistory.length - 1] || {};

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-chart-tooltip mono">
          <p className="tooltip-time">{label}</p>
          <p className="tooltip-item" style={{ color: 'var(--color-raspberry)' }}>
            Battery: {payload[0]?.value}%
          </p>
          <p className="tooltip-item" style={{ color: 'var(--color-rose-pink)' }}>
            Link Quality: {payload[1]?.value}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card chart-panel">
      <div className="card-header">
        <span className="card-title">
          <Activity size={16} style={{ color: 'var(--color-rose-pink)' }} />
          Live Telemetry Trend (Battery vs Link Quality)
        </span>
        <span className="badge badge-rose mono">REALTIME STREAM</span>
      </div>

      <div className="telemetry-summary">
        <div className="telemetry-stat telemetry-stat-raspberry">
          <span className="telemetry-stat-label">BATTERY</span>
          <strong className="mono">{latest.battery ?? '--'}%</strong>
        </div>
        <div className="telemetry-stat telemetry-stat-rose">
          <span className="telemetry-stat-label">LINK QUALITY</span>
          <strong className="mono">{latest.linkQuality ?? '--'}%</strong>
        </div>
        <div className="telemetry-stat telemetry-stat-berry">
          <span className="telemetry-stat-label">SIGNAL GAP</span>
          <strong className="mono">{latest.battery != null && latest.linkQuality != null ? Math.round(Math.abs(latest.battery - latest.linkQuality)) : '--'}%</strong>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={telemetryHistory} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="battery-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-raspberry)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-raspberry)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="link-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-rose-pink)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-rose-pink)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1D3DA" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#8A6B75"
              tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#8A6B75"
              tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', fontFamily: 'Inter', paddingTop: '10px' }}
            />
            <Area
              type="monotone"
              dataKey="battery"
              name="Battery Level (%)"
              stroke="var(--color-raspberry)"
              strokeWidth={2.5}
              fill="url(#battery-fill)"
              activeDot={{ r: 5, fill: 'var(--color-raspberry)' }}
            />
            <Area
              type="monotone"
              dataKey="linkQuality"
              name="Link Quality (%)"
              stroke="var(--color-rose-pink)"
              strokeWidth={2.5}
              fill="url(#link-fill)"
              activeDot={{ r: 5, fill: 'var(--color-rose-pink)' }}
            />
            <ReferenceLine y={50} stroke="var(--border-color)" strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <style>{`
        .chart-panel {
          --card-glow: var(--color-rose-pink);
          grid-column: 1 / -1;
        }

        .chart-container {
          width: 100%;
          padding-top: 0.5rem;
        }

        .telemetry-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.75rem;
          margin-bottom: 0.35rem;
        }

        .telemetry-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.6rem 0.8rem;
          background: var(--color-soft-blush);
          border-left: 3px solid var(--stat-color);
          border-radius: 8px;
        }

        .telemetry-stat-raspberry { --stat-color: var(--color-raspberry); }
        .telemetry-stat-rose { --stat-color: var(--color-rose-pink); }
        .telemetry-stat-berry { --stat-color: var(--color-berry-rose); }
        .telemetry-stat-label { color: var(--text-muted); font-size: 0.68rem; letter-spacing: 0.08em; font-weight: 700; }
        .telemetry-stat strong { color: var(--stat-color); font-size: 1rem; }

        @media (max-width: 640px) {
          .telemetry-summary { grid-template-columns: 1fr; }
        }

        .custom-chart-tooltip {
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          padding: 0.6rem 0.8rem;
          border-radius: 10px;
          box-shadow: 0 4px 16px rgba(96, 36, 55, 0.12);
          font-size: 0.78rem;
        }

        .tooltip-time {
          color: var(--text-muted);
          margin-bottom: 0.3rem;
        }

        .tooltip-item {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};
