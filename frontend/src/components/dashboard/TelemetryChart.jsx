import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { Activity } from 'lucide-react';

export const TelemetryChart = () => {
  const { telemetryHistory } = useTelemetry();

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

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={telemetryHistory} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
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
            <Line
              type="monotone"
              dataKey="battery"
              name="Battery Level (%)"
              stroke="var(--accent-green)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: 'var(--accent-green)' }}
            />
            <Line
              type="monotone"
              dataKey="linkQuality"
              name="Link Quality (%)"
              stroke="var(--accent-blue)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: 'var(--accent-blue)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <style>{`
        .chart-panel {
          grid-column: 1 / -1;
        }

        .chart-container {
          width: 100%;
          padding-top: 0.5rem;
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
