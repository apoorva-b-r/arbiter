import React from 'react';
import { AlertTriangle, RefreshCw, CheckSquare, ShieldAlert } from 'lucide-react';

export const ContingencyBanner = ({ message, onResolve }) => {
  return (
    <div className="contingency-banner-card">
      <div className="banner-content">
        <div className="alert-icon-box">
          <AlertTriangle size={24} />
        </div>
        <div className="banner-text">
          <div className="banner-title">
            <span>CONTINGENCY EVENT DETECTED — HANDOVER STALLED</span>
            <span className="badge badge-amber mono">ACTION REQUIRED</span>
          </div>
          <p className="banner-msg mono">{message}</p>
        </div>
      </div>

      <div className="banner-actions">
        <button onClick={() => onResolve('RETRY')} className="btn btn-outline btn-sm">
          <RefreshCw size={14} />
          Retry Telemetry Check
        </button>
        <button onClick={() => onResolve('FORCE_CONFIRM')} className="btn btn-warning btn-sm">
          <CheckSquare size={14} />
          Manually Mark Confirmed
        </button>
        <button onClick={() => onResolve('ESCALATE')} className="btn btn-danger btn-sm">
          <ShieldAlert size={14} />
          Escalate to Mission Director
        </button>
      </div>

      <style>{`
        .contingency-banner-card {
          background-color: rgba(245, 158, 11, 0.12);
          border: 2px solid var(--accent-amber);
          border-radius: 8px;
          padding: 1.2rem 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.2);
          animation: pulse-border 2s infinite;
        }

        @keyframes pulse-border {
          0% { border-color: rgba(245, 158, 11, 0.6); }
          50% { border-color: rgba(245, 158, 11, 1); }
          100% { border-color: rgba(245, 158, 11, 0.6); }
        }

        .banner-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .alert-icon-box {
          background-color: var(--accent-amber);
          color: #000;
          padding: 0.6rem;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .banner-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 800;
          font-size: 0.95rem;
          color: var(--accent-amber);
          margin-bottom: 0.2rem;
        }

        .banner-msg {
          font-size: 0.85rem;
          color: var(--text-primary);
        }

        .banner-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          border-top: 1px solid rgba(245, 158, 11, 0.3);
          padding-top: 0.8rem;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
};
