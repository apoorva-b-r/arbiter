import React from 'react';
import { CheckCircle2, Circle, AlertCircle, PlayCircle, Play, X } from 'lucide-react';

export const StateMachineView = ({
  deploymentState,
  onSelectState,
  onClearInspection,
  onStartSequence,
  onSimulateContingency
}) => {
  const {
    currentStateIndex,
    inspectedStateIndex,
    states,
    contingencyActive,
    timeElapsedSec,
    timeoutDurationSec
  } = deploymentState;

  const isInspecting = inspectedStateIndex !== null && inspectedStateIndex !== undefined;
  const displayIndex = isInspecting ? inspectedStateIndex : currentStateIndex;

  return (
    <div className="card state-machine-panel">
      <div className="card-header">
        <span className="card-title">Deployment Handover Pipeline State Machine</span>
        <div className="pipeline-controls">
          <button
            onClick={onStartSequence}
            className="btn btn-primary btn-sm"
          >
            <Play size={14} />
            Run Launch Sequence Demo
          </button>
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
          const isInspectedNode = idx === inspectedStateIndex;

          return (
            <div key={st.id} className="pipeline-node-wrapper">
              <div
                className={`pipeline-node ${isDone ? 'node-done' : ''} ${isCurrent ? 'node-current' : ''} ${contingencyActive && isCurrent ? 'node-contingency' : ''} ${isInspectedNode ? 'node-inspected' : ''}`}
                onClick={() => onSelectState(idx)}
                title="Click stage box to inspect details without altering actual satellite state"
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
          <div className="header-badge-group">
            {isInspecting ? (
              <div className="inspect-badge-container">
                <span className="badge badge-purple mono">INSPECTING STAGE 0{inspectedStateIndex + 1}</span>
                <button
                  onClick={onClearInspection}
                  className="btn-clear-inspect mono"
                  title="Return to actual satellite state details"
                >
                  <X size={12} /> Clear ×
                </button>
              </div>
            ) : (
              <span className="badge badge-blue mono">ACTIVE STATE DETAILS</span>
            )}
          </div>
          <span className="state-timestamp mono">
            Elapsed: {timeElapsedSec}s / Timeout: {timeoutDurationSec}s
          </span>
        </div>
        <h3 className="state-name-display">{states[displayIndex]?.label}</h3>
        <p className="state-desc-display">{states[displayIndex]?.description}</p>
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
          background-color: #FFF9FA;
          border: 1px solid var(--border-color);
          padding: 0.7rem 0.9rem;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 170px;
        }

        .pipeline-node:hover {
          border-color: var(--color-berry-rose);
          transform: translateY(-2px);
        }

        .pipeline-node.node-done {
          border-color: var(--alert-success-border);
          background-color: var(--alert-success-bg);
        }

        .pipeline-node.node-current {
          border-color: var(--color-berry-rose);
          background-color: var(--color-soft-blush);
          box-shadow: 0 4px 12px rgba(138, 40, 70, 0.15);
        }

        .pipeline-node.node-contingency {
          border-color: var(--alert-warning-border);
          background-color: var(--alert-warning-bg);
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.2);
          animation: pulse-amber 1.5s infinite;
        }

        .pipeline-node.node-inspected {
          outline: 2px dashed var(--accent-purple);
          outline-offset: 2px;
        }

        .node-step {
          font-size: 0.65rem;
          color: var(--color-berry-rose);
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
          background-color: var(--alert-success-border);
        }

        .current-state-details {
          background-color: #FFF9FA;
          margin-top: 1rem;
          border-radius: 12px;
        }

        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .header-badge-group {
          display: flex;
          align-items: center;
        }

        .inspect-badge-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-clear-inspect {
          background: none;
          border: 1px solid var(--accent-purple);
          color: var(--accent-purple);
          font-size: 0.72rem;
          padding: 0.15rem 0.45rem;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.2rem;
          transition: all 0.15s ease;
        }

        .btn-clear-inspect:hover {
          background-color: var(--accent-purple);
          color: #ffffff;
        }

        .state-timestamp {
          font-size: 0.78rem;
          color: var(--color-berry-rose);
        }

        .state-name-display {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .state-desc-display {
          font-size: 0.85rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};

