import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelemetry } from '../../context/TelemetryContext';
import { Satellite, Lock, AlertTriangle, ArrowRight } from 'lucide-react';

export const MissionLock = ({ children }) => {
  const { missionPhase, deployment } = useTelemetry();
  const navigate = useNavigate();

  // If operational, allow full access to wrapped page content
  if (missionPhase === 'OPERATIONAL') {
    return children;
  }

  // Derive stage info for commissioning
  const stageName = deployment?.states?.[deployment.currentStateIndex]?.title || 'Checkout';

  let config = {
    title: 'SomaiyaSat not yet deployed',
    description: 'No downlink is possible until the satellite is released and commissioned.',
    buttonText: 'Go to Deployment →',
    accentColor: 'var(--color-berry-rose)',
    isAlert: false
  };

  if (missionPhase === 'COMMISSIONING') {
    config = {
      title: 'Commissioning in progress',
      description: `Current stage: ${stageName}. Data transmission begins once the satellite is operational.`,
      buttonText: 'View Deployment →',
      accentColor: 'var(--color-rose-pink, #E05780)',
      isAlert: false
    };
  } else if (missionPhase === 'CONTACT_LOST') {
    config = {
      title: 'Contact lost',
      description: 'Separation was not confirmed. Escalated to Mission Director. No data until contact is recovered.',
      buttonText: 'Go to Deployment →',
      accentColor: 'var(--color-raspberry, #B9375E)',
      isAlert: true
    };
  }

  return (
    <div className="mission-lock-container">
      <div className={`mission-lock-card card ${config.isAlert ? 'alert-border' : ''}`}>
        <div className="mission-lock-icon-box" style={{ borderColor: config.accentColor }}>
          {config.isAlert ? (
            <AlertTriangle size={36} style={{ color: config.accentColor }} />
          ) : (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Satellite size={38} style={{ color: config.accentColor }} />
              <Lock size={16} style={{ position: 'absolute', bottom: -2, right: -4, color: 'var(--color-raspberry, #B9375E)' }} />
            </div>
          )}
        </div>

        <div className="mission-lock-badge" style={{ color: config.accentColor, borderColor: config.accentColor }}>
          MISSION GATE: {missionPhase || 'PRE_DEPLOYMENT'}
        </div>

        <h2 className="mission-lock-title">{config.title}</h2>
        <p className="mission-lock-description">{config.description}</p>

        <button
          onClick={() => navigate('/deployment')}
          className="btn btn-primary mission-lock-btn"
          style={{ backgroundColor: config.isAlert ? 'var(--color-raspberry)' : 'var(--color-berry-rose)' }}
        >
          <span>{config.buttonText}</span>
          <ArrowRight size={16} />
        </button>
      </div>

      <style>{`
        .mission-lock-container {
          min-height: calc(100vh - 160px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background-color: transparent;
        }

        .mission-lock-card {
          max-width: 540px;
          width: 100%;
          text-align: center;
          padding: 3rem 2.5rem;
          background: #FFFFFF;
          border: 1px solid var(--border-color, #F1D3DA);
          border-top: 4px solid var(--color-berry-rose, #8A2846);
          border-radius: 16px;
          box-shadow: 0 16px 36px rgba(43, 15, 24, 0.22);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .mission-lock-card.alert-border {
          border-top-color: var(--alert-critical-border, #DC2626);
          border-color: rgba(220, 38, 38, 0.35);
          box-shadow: 0 16px 36px rgba(220, 38, 38, 0.15);
        }

        .mission-lock-icon-box {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          background: var(--color-soft-blush, #FFCAD4);
          border: 1px solid rgba(138, 40, 70, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .mission-lock-badge {
          font-family: var(--font-mono, monospace);
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 0.3rem 0.85rem;
          border: 1px solid;
          border-radius: 20px;
          margin-bottom: 1rem;
          background: rgba(255, 202, 212, 0.45);
        }

        .mission-lock-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary, #2B0F18);
          margin-bottom: 0.75rem;
        }

        .mission-lock-description {
          font-size: 0.95rem;
          line-height: 1.5;
          color: var(--text-muted, #8A6B75);
          margin-bottom: 2rem;
          max-width: 440px;
        }

        .mission-lock-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.75rem;
          font-size: 0.95rem;
          font-weight: 600;
          color: #FFF5F7;
          border-radius: 8px;
          transition: transform 0.15s ease, background-color 0.15s ease;
        }

        .mission-lock-btn:hover {
          transform: translateY(-1px);
          background-color: var(--color-raspberry, #B9375E) !important;
        }
      `}</style>
    </div>
  );
};
