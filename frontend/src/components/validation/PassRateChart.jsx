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
          <TrendingUp size={16} style={{ color: 'var(--alert-success-border)' }} />
          Router AI Safety Pass Rate History Over Releases
        </span>
        <span className="badge badge-green mono">ACCURACY TREND</span>
      </div>

      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={runs} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1D3DA" vertical={false} />
            <XAxis
              dataKey="run"
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
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                fontFamily: 'JetBrains Mono',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(96, 36, 55, 0.1)'
              }}
            />
            <Line
              type="monotone"
              dataKey="passRate"
              name="Safety Pass Rate (%)"
              stroke="var(--color-berry-rose)"
              strokeWidth={3}
              dot={{ r: 4, fill: 'var(--color-berry-rose)' }}
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
