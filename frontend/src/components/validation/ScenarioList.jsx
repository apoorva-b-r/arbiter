import React from 'react';
import { Play, CheckCircle2, XCircle, Clock } from 'lucide-react';

export const ScenarioList = ({ scenarios, onRunScenario, selectedScenarioId }) => {
  return (
    <div className="card scenario-list-panel">
      <div className="card-header">
        <span className="card-title">Saved Safety Scenarios</span>
        <span className="badge badge-blue mono">{scenarios.length} SCENARIOS</span>
      </div>

      <div className="scenario-items">
        {scenarios.map((scen) => (
          <div
            key={scen.id}
            className={`scenario-card ${selectedScenarioId === scen.id ? 'active-scen' : ''}`}
          >
            <div className="scen-top">
              <div>
                <span className="scen-id mono">{scen.id}</span>
                <h4 className="scen-title">{scen.name}</h4>
              </div>
              <button
                onClick={() => onRunScenario(scen.id)}
                className="btn btn-primary btn-sm"
              >
                <Play size={14} />
                <span>Run Test</span>
              </button>
            </div>

            <p className="scen-desc">{scen.description}</p>

            <div className="scen-meta">
              <div className="scen-pills">
                <span className="badge badge-purple mono">BATTERY {scen.initialBattery}%</span>
                <span className="badge badge-blue mono">{scen.linkProfile}</span>
              </div>
              <div className="scen-status">
                {scen.status === 'PASSED' ? (
                  <span className="badge badge-green">
                    <CheckCircle2 size={12} /> PASSED
                  </span>
                ) : (
                  <span className="badge badge-red">
                    <XCircle size={12} /> FAILED
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .scenario-list-panel {
          height: 100%;
        }

        .scenario-items {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .scenario-card {
          background-color: var(--bg-dark);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 0.9rem 1rem;
          transition: border-color 0.15s ease;
        }

        .scenario-card.active-scen {
          border-color: var(--accent-blue);
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.15);
        }

        .scen-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.4rem;
        }

        .scen-id {
          font-size: 0.7rem;
          color: var(--accent-blue);
          font-weight: 700;
        }

        .scen-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .scen-desc {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.4;
          margin-bottom: 0.6rem;
        }

        .scen-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border-color);
          padding-top: 0.5rem;
        }

        .scen-pills {
          display: flex;
          gap: 0.4rem;
        }
      `}</style>
    </div>
  );
};
