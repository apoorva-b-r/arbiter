import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { Cpu, UserCheck, CheckCircle2 } from 'lucide-react';

export const DecisionLog = () => {
  const { decisions } = useTelemetry();

  return (
    <div className="card decision-panel">
      <div className="card-header">
        <span className="card-title">
          <Cpu size={16} style={{ color: 'var(--accent-green)' }} />
          AI Priority Router Decision Log
        </span>
        <span className="badge badge-green mono">LIVE LOGS</span>
      </div>

      <div className="decision-scroll-list">
        {decisions.map((dec) => (
          <div
            key={dec.id}
            className={`decision-card ${dec.isOverridden ? 'override-card' : ''}`}
          >
            <div className="decision-header">
              <div className="decision-title-group">
                {dec.isOverridden ? (
                  <span className="badge badge-red">
                    <UserCheck size={12} />
                    OPERATOR OVERRIDE
                  </span>
                ) : (
                  <span className="badge badge-purple">
                    <Cpu size={12} />
                    AUTO SCHEDULER
                  </span>
                )}
                <span className="decision-type-badge mono">{dec.selectedType} DISPATCHED</span>
              </div>
              <span className="decision-time mono">{dec.timestamp}</span>
            </div>

            <p className="decision-reasoning">{dec.reasoning}</p>

            <div className="decision-footer mono">
              <span>ID: {dec.id}</span>
              <span>Pass: {dec.passId}</span>
              {!dec.isOverridden && <span>Router Score: {dec.score}</span>}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .decision-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .decision-scroll-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          overflow-y: auto;
          max-height: 380px;
          padding-right: 0.2rem;
        }

        .decision-card {
          background-color: var(--bg-dark);
          border: 1px solid var(--border-color);
          border-left: 4px solid var(--accent-purple);
          padding: 0.8rem 1rem;
          border-radius: 6px;
        }

        .decision-card.override-card {
          border-left-color: var(--accent-red);
          background-color: rgba(239, 68, 68, 0.04);
        }

        .decision-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.4rem;
        }

        .decision-title-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .decision-type-badge {
          font-weight: 700;
          font-size: 0.82rem;
          color: var(--text-primary);
        }

        .decision-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .decision-reasoning {
          font-size: 0.84rem;
          color: var(--text-secondary);
          line-height: 1.4;
          margin-bottom: 0.5rem;
        }

        .decision-footer {
          display: flex;
          gap: 1rem;
          font-size: 0.7rem;
          color: var(--text-muted);
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          padding-top: 0.35rem;
        }
      `}</style>
    </div>
  );
};
