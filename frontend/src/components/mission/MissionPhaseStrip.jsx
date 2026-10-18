import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { Check, AlertTriangle } from 'lucide-react';

export const MissionPhaseStrip = () => {
  const { missionPhase } = useTelemetry();

  // If CONTACT_LOST, render compact red alert indicator
  if (missionPhase === 'CONTACT_LOST') {
    return (
      <div className="phase-strip-container contact-lost">
        <span className="phase-indicator-dot red-pulse"></span>
        <AlertTriangle size={13} style={{ color: '#ff5252' }} />
        <span className="phase-label">CONTACT LOST</span>
        <style>{`
          .phase-strip-container.contact-lost {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.25rem 0.65rem;
            border-radius: 20px;
            background: rgba(255, 82, 82, 0.15);
            border: 1px solid rgba(255, 82, 82, 0.45);
            color: #ff5252;
            font-family: monospace;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.05em;
          }
          .red-pulse {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background-color: #ff5252;
            box-shadow: 0 0 8px #ff5252;
            animation: pulse-red 1.5s infinite ease-in-out;
          }
          @keyframes pulse-red {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.85); }
          }
        `}</style>
      </div>
    );
  }

  const steps = [
    { key: 'PRE_DEPLOYMENT', label: 'Deployed' },
    { key: 'COMMISSIONING', label: 'Commissioned' },
    { key: 'OPERATIONAL', label: 'Operational' }
  ];

  const getStepStatus = (stepKey) => {
    if (missionPhase === 'OPERATIONAL') {
      if (stepKey === 'OPERATIONAL') return 'active';
      return 'completed';
    }
    if (missionPhase === 'COMMISSIONING') {
      if (stepKey === 'PRE_DEPLOYMENT') return 'completed';
      if (stepKey === 'COMMISSIONING') return 'active';
      return 'upcoming';
    }
    // PRE_DEPLOYMENT default
    if (stepKey === 'PRE_DEPLOYMENT') return 'active';
    return 'upcoming';
  };

  return (
    <div className="phase-strip-container" title={`Mission Phase: ${missionPhase || 'PRE_DEPLOYMENT'}`}>
      {steps.map((step, idx) => {
        const status = getStepStatus(step.key);
        return (
          <React.Fragment key={step.key}>
            {idx > 0 && <span className={`phase-separator ${status !== 'upcoming' ? 'active' : ''}`}>→</span>}
            <div className={`phase-step ${status}`}>
              {status === 'completed' ? (
                <span className="phase-check-icon">
                  <Check size={11} strokeWidth={3} />
                </span>
              ) : status === 'active' ? (
                <span className="phase-active-dot"></span>
              ) : (
                <span className="phase-inactive-dot"></span>
              )}
              <span className="phase-text">{step.label}</span>
            </div>
          </React.Fragment>
        );
      })}

      <style>{`
        .phase-strip-container {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.25rem 0.65rem;
          border-radius: 20px;
          background: rgba(42, 8, 69, 0.45);
          border: 1px solid rgba(255, 202, 212, 0.25);
          font-family: monospace;
          font-size: 0.75rem;
          white-space: nowrap;
        }

        .phase-step {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          color: rgba(255, 202, 212, 0.45);
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .phase-step.completed {
          color: #a5d6a7;
          font-weight: 600;
        }

        .phase-step.active {
          color: var(--color-soft-blush, #FFCAD4);
          font-weight: 700;
        }

        .phase-separator {
          color: rgba(255, 202, 212, 0.25);
          font-size: 0.75rem;
          user-select: none;
        }

        .phase-separator.active {
          color: rgba(255, 202, 212, 0.6);
        }

        .phase-check-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: rgba(76, 175, 80, 0.25);
          color: #81c784;
        }

        .phase-active-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: var(--color-soft-blush, #FFCAD4);
          box-shadow: 0 0 8px var(--color-rose-pink, #E05780);
          animation: phase-pulse 1.6s infinite ease-in-out;
        }

        .phase-inactive-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: rgba(255, 202, 212, 0.25);
        }

        @keyframes phase-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
};
