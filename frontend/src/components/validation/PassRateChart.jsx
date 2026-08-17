import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { TrendingUp } from 'lucide-react';

export const PassRateChart = ({ runs }) => {
  return (
    <div className="card pass-rate-panel">
      <div className="card-header">
        <span className="card-title">
          <TrendingUp size={16} style={{ color: 'var(--accent-green)' }} />
          Router AI Safety Pass Rate History Over Releases
        </span>
        <span className="badge badge-green mono">ACCURACY TREND</span>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={runs} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis
              dataKey="run"
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
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-dark)',
                borderColor: 'var(--border-color)',
                fontSize: '0.8rem',
                fontFamily: 'JetBrains Mono'
              }}
            />
            <Line
              type="monotone"
              dataKey="passRate"
              name="Safety Pass Rate (%)"
              stroke="var(--accent-green)"
              strokeWidth={3}
              dot={{ r: 4, fill: 'var(--accent-green)' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <style>{`
        .pass-rate-panel {
          height: 100%;
        }

        .chart-wrapper {
          padding-top: 0.5rem;
        }
      `}</style>
    </div>
  );
};
