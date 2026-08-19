import React, { useState } from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { ShieldAlert, Send, CheckCircle } from 'lucide-react';

export const OverridePanel = () => {
  const { issueOverride, telemetry } = useTelemetry();
  const [selectedMode, setSelectedMode] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  const handleOverride = async (mode) => {
    setSelectedMode(mode);
    await issueOverride(mode);
    setStatusMsg(`COMMAND ACK: Force ${mode} override executed.`);
    setTimeout(() => {
      setSelectedMode(null);
      setStatusMsg('');
    }, 2500);
  };

  return (
    <div className="card override-panel">
      <div className="card-header">
        <span className="card-title">
          <ShieldAlert size={16} style={{ color: 'var(--accent-red)' }} />
          Manual Operator Override Console
        </span>
        <span className="badge badge-amber mono">AI BYPASS</span>
      </div>

      <p className="override-desc">
        Command immediate payload transmission mode. Overrides the AI priority scheduler logic for the current ground pass cycle.
      </p>

      <div className="override-buttons-grid">
        <button
          onClick={() => handleOverride('TTC')}
          className={`override-btn btn-ttc ${telemetry.activeMode === 'TTC' ? 'active-mode' : ''}`}
        >
          <div className="btn-header">
            <span className="mono">TTC</span>
            <Send size={14} />
          </div>
          <span className="btn-sub">Telemetry & Beacon</span>
        </button>

        <button
          onClick={() => handleOverride('SSTV')}
          className={`override-btn btn-sstv ${telemetry.activeMode === 'SSTV' ? 'active-mode' : ''}`}
        >
          <div className="btn-header">
            <span className="mono">SSTV</span>
            <Send size={14} />
          </div>
          <span className="btn-sub">Camera Imaging Frame</span>
        </button>

        <button
          onClick={() => handleOverride('Codec2')}
          className={`override-btn btn-codec2 ${telemetry.activeMode === 'Codec2' ? 'active-mode' : ''}`}
        >
          <div className="btn-header">
            <span className="mono">Codec2</span>
            <Send size={14} />
          </div>
          <span className="btn-sub">Voice Telemetry Stream</span>
        </button>

        <button
          onClick={() => handleOverride('M17')}
          className={`override-btn btn-m17 ${telemetry.activeMode === 'M17' ? 'active-mode' : ''}`}
        >
          <div className="btn-header">
            <span className="mono">M17</span>
            <Send size={14} />
          </div>
          <span className="btn-sub">Digital Voice Data</span>
        </button>
      </div>

      {statusMsg && (
        <div className="override-ack-banner mono">
          <CheckCircle size={14} />
          <span>{statusMsg}</span>
        </div>
      )}

      <style>{`
        .override-panel {
          grid-column: 1 / -1;
        }

        .override-desc {
          font-size: 0.83rem;
          color: var(--text-secondary);
          margin-bottom: 1rem;
        }

        .override-buttons-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.8rem;
        }

        .override-btn {
          --override-color: var(--accent-blue);
          background-color: var(--bg-dark);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 0.8rem 1rem;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
          color: var(--text-primary);
        }

        .override-btn:hover {
          border-color: var(--override-color);
          box-shadow: 0 0 14px color-mix(in srgb, var(--override-color) 28%, transparent);
          transform: translateY(-1px);
        }

        .btn-ttc { --override-color: var(--accent-red); }
        .btn-sstv { --override-color: var(--accent-purple); }
        .btn-codec2 { --override-color: var(--accent-blue); }
        .btn-m17 { --override-color: var(--accent-green); }

        .btn-ttc .btn-header { color: var(--accent-red); }
        .btn-sstv .btn-header { color: var(--accent-purple); }
        .btn-codec2 .btn-header { color: var(--accent-blue); }
        .btn-m17 .btn-header { color: var(--accent-green); }

        .override-btn.active-mode {
          border-color: var(--override-color);
          background-color: color-mix(in srgb, var(--override-color) 10%, var(--bg-dark));
          box-shadow: 0 0 10px color-mix(in srgb, var(--override-color) 24%, transparent);
        }

        .btn-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 700;
          font-size: 1.05rem;
          margin-bottom: 0.2rem;
        }

        .btn-sub {
          font-size: 0.75rem;
          color: var(--text-secondary);
          display: block;
        }

        .override-ack-banner {
          margin-top: 1rem;
          background-color: var(--accent-green-bg);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--accent-green);
          padding: 0.6rem 0.9rem;
          border-radius: 6px;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
};
