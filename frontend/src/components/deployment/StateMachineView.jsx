import React from 'react';
import { CheckCircle2, Circle, AlertCircle, PlayCircle, Clock } from 'lucide-react';

export const StateMachineView = ({ deploymentState, onSelectState, onSimulateContingency }) => {
  const { currentStateIndex, states, contingencyActive } = deploymentState;

  return (
    <div className="card state-machine-panel">
      <div className="card-header">
        <span className="card-title">Deployment Handover Pipeline State Machine</span>
        <div className="pipeline-controls">
          <button
            onClick={onSimulateContingency}
            className="btn btn-warning btn-sm"
            disabled={contingencyActive}
          >
            <AlertCircle size={14} />
            Simulate Timeout Contingency
          </button>
        </div>
      </div>

      <div className="state-pipeline">
        {states.map((st, idx) => {
          const isDone = idx < currentStateIndex;
          const isCurrent = idx === currentStateIndex;
          const isFuture = idx > currentStateIndex;

          return (
            <div key={st.id} className="pipeline-node-wrapper">
              <div
                className={`pipeline-node ${isDone ? 'node-done' : ''} ${isCurrent ? 'node-current' : ''} ${contingencyActive && isCurrent ? 'node-contingency' : ''}`}
                onClick={() => onSelectState(idx)}
              >
                <div className="node-icon">
                  {isDone && <CheckCircle2 size={20} className="text-green" />}
                  {isCurrent && !contingencyActive && <PlayCircle size={20} className="text-blue" />}
                  {isCurrent && contingencyActive && <AlertCircle size={20} className="text-amber" />}
                  {isFuture && <Circle size={20} className="text-muted" />}
                </div>
                <div className="node-info">
                  <span className="node-step mono">STEP 0{idx + 1}</span>
                  <h4 className="node-label">{st.label.split('. ')[1]}</h4>
                </div>
              </div>

              {idx < states.length - 1 && (
                <div className={`pipeline-connector ${isDone ? 'connector-done' : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="current-state-details card">
        <div className="details-header">
          <span className="badge badge-blue mono">ACTIVE STATE DETAILS</span>
          <span className="state-timestamp mono">Elapsed: {deploymentState.timeElapsedSec}s / Timeout: {deploymentState.timeoutDurationSec}s</span>
        </div>
        <h3 className="state-name-display">{states[currentStateIndex]?.label}</h3>
        <p className="state-desc-display">{states[currentStateIndex]?.description}</p>
      </div>

      <style>{`
        .state-machine-panel {
          margin-bottom: 1.5rem;
        }

        .pipeline-controls {
          display: flex;
          gap: 0.5rem;
        }

        .state-pipeline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 0.5rem;
          overflow-x: auto;
        }

        .pipeline-node-wrapper {
          display: flex;
          align-items: center;
          flex: 1;
        }

        .pipeline-node {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background-color: var(--bg-dark);
          border: 1px solid var(--border-color);
          padding: 0.7rem 0.9rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 170px;
        }

        .pipeline-node:hover {
          border-color: var(--accent-blue);
          transform: translateY(-2px);
        }

        .pipeline-node.node-done {
          border-color: rgba(16, 185, 129, 0.4);
          background-color: rgba(16, 185, 129, 0.05);
        }

        .pipeline-node.node-current {
          border-color: var(--accent-blue);
          background-color: rgba(59, 130, 246, 0.1);
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.2);
        }

        .pipeline-node.node-contingency {
          border-color: var(--accent-amber);
          background-color: rgba(245, 158, 11, 0.12);
          box-shadow: 0 0 12px rgba(245, 158, 11, 0.3);
          animation: pulse-amber 1.5s infinite;
        }

        .node-step {
          font-size: 0.65rem;
          color: var(--text-muted);
          display: block;
          font-weight: 700;
        }

        .node-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .pipeline-connector {
          flex: 1;
          height: 2px;
          background-color: var(--border-color);
          margin: 0 0.5rem;
          min-width: 20px;
        }

        .pipeline-connector.connector-done {
          background-color: var(--accent-green);
        }

        .current-state-details {
          background-color: var(--bg-dark);
          margin-top: 1rem;
        }

        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .state-timestamp {
          font-size: 0.78rem;
          color: var(--text-secondary);
        }

        .state-name-display {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .state-desc-display {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
};
