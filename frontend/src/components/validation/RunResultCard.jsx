import React from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Terminal, AlertTriangle } from 'lucide-react';

export const RunResultCard = ({ result }) => {
  if (!result) return null;

  const isPassed = result.status === 'PASSED';

  return (
    <div className="card run-result-card">
      <div className="card-header">
        <span className="card-title">
          <ShieldCheck size={16} style={{ color: isPassed ? 'var(--accent-green)' : 'var(--accent-red)' }} />
          Simulation Run Result Engine Execution
        </span>
        <span className={`badge ${isPassed ? 'badge-green' : 'badge-red'} mono`}>
          {isPassed ? 'ALL SAFETY CONSTRAINTS VERIFIED' : 'SAFETY RULE ASSERTION FAILED'}
        </span>
      </div>

      <div className="result-summary-bar">
        <div className="summary-metric">
          <span className="metric-label">SCENARIO ID</span>
          <span className="metric-val mono">{result.scenarioId}</span>
        </div>
        <div className="summary-metric">
          <span className="metric-label">ASSERTION SCORE</span>
          <span className="metric-val mono">{result.scorePercentage}%</span>
        </div>
        <div className="summary-metric">
          <span className="metric-label">STATUS</span>
          <span className={`metric-val mono ${isPassed ? 'text-green' : 'text-red'}`}>
            {result.status}
          </span>
        </div>
      </div>

      <h4 className="rules-heading">Safety Constraints Check Matrix</h4>
      <div className="rules-list">
        {result.rulesChecked?.map((rule, idx) => (
          <div key={idx} className="rule-item">
            <div className="rule-status-icon">
              {rule.status === 'PASS' ? (
                <CheckCircle2 size={16} className="text-green" />
              ) : (
                <XCircle size={16} className="text-red" />
              )}
            </div>
            <div className="rule-details">
              <span className="rule-name">{rule.name}</span>
              <span className="rule-info mono">{rule.details}</span>
            </div>
            <span className={`badge ${rule.status === 'PASS' ? 'badge-green' : 'badge-red'} mono`}>
              {rule.status}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        .run-result-card {
          border-left: 4px solid ${isPassed ? 'var(--accent-green)' : 'var(--accent-red)'};
        }

        .result-summary-bar {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          background-color: var(--bg-dark);
          padding: 0.8rem 1rem;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          margin-bottom: 1.2rem;
        }

        .summary-metric {
          display: flex;
          flex-direction: column;
        }

        .metric-label {
          font-size: 0.68rem;
          color: var(--text-muted);
          font-weight: 700;
        }

        .metric-val {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .text-green { color: var(--accent-green); }
        .text-red { color: var(--accent-red); }

        .rules-heading {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.6rem;
        }

        .rules-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .rule-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background-color: var(--bg-dark);
          padding: 0.6rem 0.8rem;
          border-radius: 6px;
          border: 1px solid var(--border-color);
        }

        .rule-details {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .rule-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .rule-info {
          font-size: 0.73rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};
