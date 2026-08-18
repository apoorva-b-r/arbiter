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
          <p className="tooltip-item" style={{ color: 'var(--accent-green)' }}>
            Battery: {payload[0]?.value}%
          </p>
          <p className="tooltip-item" style={{ color: 'var(--accent-blue)' }}>
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
          <Activity size={16} style={{ color: 'var(--accent-blue)' }} />
          Live Telemetry Trend (Battery vs Link Quality)
        </span>
        <span className="badge badge-green mono">REALTIME STREAM</span>
      </div>

      <div className="telemetry-summary">
        <div className="telemetry-stat telemetry-stat-green">
          <span className="telemetry-stat-label">BATTERY</span>
          <strong className="mono">{latest.battery ?? '--'}%</strong>
        </div>
        <div className="telemetry-stat telemetry-stat-blue">
          <span className="telemetry-stat-label">LINK QUALITY</span>
          <strong className="mono">{latest.linkQuality ?? '--'}%</strong>
        </div>
        <div className="telemetry-stat telemetry-stat-neutral">
          <span className="telemetry-stat-label">SIGNAL GAP</span>
          <strong className="mono">{latest.battery != null && latest.linkQuality != null ? Math.abs(latest.battery - latest.linkQuality) : '--'}%</strong>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={telemetryHistory} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="battery-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-green)" stopOpacity={0.32} />
                <stop offset="100%" stopColor="var(--accent-green)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="link-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#6b7280"
              tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke="#6b7280"
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
              stroke="var(--accent-green)"
              strokeWidth={2.5}
              fill="url(#battery-fill)"
              activeDot={{ r: 5, fill: 'var(--accent-green)' }}
            />
            <Area
              type="monotone"
              dataKey="linkQuality"
              name="Link Quality (%)"
              stroke="var(--accent-blue)"
              strokeWidth={2.5}
              fill="url(#link-fill)"
              activeDot={{ r: 5, fill: 'var(--accent-blue)' }}
            />
            <ReferenceLine y={50} stroke="var(--border-highlight)" strokeDasharray="4 4" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <style>{`
        .chart-panel {
          --card-glow: var(--accent-blue);
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
          padding: 0.55rem 0.7rem;
          background: var(--bg-dark);
          border-left: 2px solid var(--stat-color);
          border-radius: 4px;
        }

        .telemetry-stat-green { --stat-color: var(--accent-green); }
        .telemetry-stat-blue { --stat-color: var(--accent-blue); }
        .telemetry-stat-neutral { --stat-color: var(--text-muted); }
        .telemetry-stat-label { color: var(--text-muted); font-size: 0.68rem; letter-spacing: 0.08em; }
        .telemetry-stat strong { color: var(--stat-color); font-size: 1rem; }

        @media (max-width: 640px) {
          .telemetry-summary { grid-template-columns: 1fr; }
        }

        .custom-chart-tooltip {
          background-color: var(--bg-dark);
          border: 1px solid var(--border-color);
          padding: 0.6rem 0.8rem;
          border-radius: 6px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
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
