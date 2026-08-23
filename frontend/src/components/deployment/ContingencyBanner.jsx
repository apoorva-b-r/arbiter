import React from 'react';
import { AlertTriangle, RefreshCw, Radio, CheckSquare, ShieldAlert } from 'lucide-react';

export const ContingencyBanner = ({
  message,
  contingencyStatus,
  retryCount = 0,
  secondaryBeaconData,
  onRetry,
  onCheckSecondary,
  onEscalate,
  onForceConfirm,
  onResolve
}) => {
  const isEscalated = contingencyStatus === 'ESCALATED';

  const handleAction = (actionKey, callback) => {
    if (callback) callback();
    else if (onResolve) onResolve(actionKey);
  };

  return (
    <div className={`contingency-banner-card ${isEscalated ? 'banner-escalated' : ''}`}>
      <div className="banner-content">
        <div className="alert-icon-box">
          <AlertTriangle size={24} />
        </div>
        <div className="banner-text">
          <div className="banner-title">
            <span>
              {isEscalated ? 'CONTINGENCY ESCALATED: MISSION HANDOVER ON HOLD' : 'CONTINGENCY EVENT DETECTED: HANDOVER STALLED'}
            </span>
            <span className={`badge ${isEscalated ? 'badge-danger' : 'badge-amber'} mono`}>
              {isEscalated ? 'ESCALATED' : 'ACTION REQUIRED'}
            </span>
          </div>
          <p className="banner-msg mono">{message}</p>
        </div>
      </div>

      {secondaryBeaconData && (
        <div className="secondary-beacon-card mono">
          <div className="secondary-header">
            <Radio size={14} className="text-purple" />
            <span>SECONDARY BEACON & TELEMETRY SWEEP RESULTS</span>
          </div>
          <div className="secondary-grid">
            <div className="secondary-item">
              <span className="text-muted">Beacon:</span> <strong>{secondaryBeaconData.beacon}</strong>
            </div>
            <div className="secondary-item">
              <span className="text-muted">RF Signal:</span> <strong>{secondaryBeaconData.rfCarrier}</strong>
            </div>
            <div className="secondary-item">
              <span className="text-muted">EPS Telemetry:</span> <strong>{secondaryBeaconData.battery}</strong>
            </div>
          </div>
          <div className="secondary-note text-amber">
            {secondaryBeaconData.note}
          </div>
        </div>
      )}

      <div className="banner-actions">
        <button
          onClick={() => handleAction('RETRY', onRetry)}
          className="btn btn-outline btn-sm"
          disabled={isEscalated}
        >
          <RefreshCw size={14} />
          Retry Verification {retryCount > 0 ? `(#${retryCount})` : ''}
        </button>

        <button
          onClick={() => handleAction('CHECK_SECONDARY', onCheckSecondary)}
          className="btn btn-outline btn-sm"
          disabled={isEscalated}
        >
          <Radio size={14} />
          Check Secondary Beacon
        </button>

        <button
          onClick={() => handleAction('ESCALATE', onEscalate)}
          className="btn btn-danger btn-sm"
          disabled={isEscalated}
        >
          <ShieldAlert size={14} />
          {isEscalated ? 'Escalated to Director' : 'Escalate to Mission Director'}
        </button>

        <button
          onClick={() => handleAction('FORCE_CONFIRM', onForceConfirm)}
          className="btn btn-warning btn-sm"
        >
          <CheckSquare size={14} />
          Manually Confirm Separation
        </button>
      </div>

      <style>{`
        .contingency-banner-card {
          background-color: var(--alert-warning-bg);
          border: 2px solid var(--alert-warning-border);
          border-radius: 12px;
          padding: 1.2rem 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 16px rgba(217, 119, 6, 0.2);
          animation: pulse-border 2s infinite;
        }

        .contingency-banner-card.banner-escalated {
          background-color: #FFF5F5;
          border-color: #EF4444;
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.2);
          animation: none;
        }

        @keyframes pulse-border {
          0% { border-color: rgba(217, 119, 6, 0.6); }
          50% { border-color: var(--alert-warning-border); }
          100% { border-color: rgba(217, 119, 6, 0.6); }
        }

        .banner-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .alert-icon-box {
          background-color: var(--alert-warning-border);
          color: #fff;
          padding: 0.6rem;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .banner-escalated .alert-icon-box {
          background-color: #EF4444;
        }

        .banner-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 800;
          font-size: 0.95rem;
          color: var(--alert-warning-text);
          margin-bottom: 0.2rem;
        }

        .banner-escalated .banner-title {
          color: #991B1B;
        }

        .banner-msg {
          font-size: 0.85rem;
          color: var(--alert-warning-text);
          font-weight: 600;
        }

        .banner-escalated .banner-msg {
          color: #991B1B;
        }

        .secondary-beacon-card {
          background-color: #FFFFFF;
          border: 1px dashed var(--accent-purple);
          border-radius: 8px;
          padding: 0.8rem 1rem;
          margin-bottom: 1rem;
          font-size: 0.8rem;
        }

        .secondary-header {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-weight: 700;
          color: var(--accent-purple);
          margin-bottom: 0.5rem;
        }

        .secondary-grid {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 0.4rem;
          flex-wrap: wrap;
        }

        .secondary-item {
          color: var(--text-primary);
        }

        .secondary-note {
          font-size: 0.76rem;
          font-weight: 600;
        }

        .banner-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          border-top: 1px solid rgba(217, 119, 6, 0.3);
          padding-top: 0.8rem;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
};

