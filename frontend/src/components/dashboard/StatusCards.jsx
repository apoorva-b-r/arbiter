import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { Battery, Signal, Radio, ShieldAlert } from 'lucide-react';

export const StatusCards = () => {
  const { telemetry } = useTelemetry();

  const getBatteryColor = (val) => {
    if (val > 60) return 'var(--accent-green)';
    if (val > 30) return 'var(--accent-amber)';
    return 'var(--accent-red)';
  };

  return (
    <div className="status-cards-grid">
      {/* Battery Status Card */}
      <div className="card status-card status-card-green">
        <div className="status-card-header">
          <span className="card-label">SUBSYSTEM EPS</span>
          <div className="icon-badge" style={{ color: getBatteryColor(telemetry.battery) }}>
            <Battery size={20} />
          </div>
        </div>
        <div className="status-card-body">
          <div className="status-val-group">
            <span className="status-val mono">{telemetry.battery}%</span>
            <span className="status-subtext mono">3.75V nominal</span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{
                width: `${telemetry.battery}%`,
                backgroundColor: getBatteryColor(telemetry.battery)
              }}
            />
          </div>
        </div>
        <div className="status-card-footer">
          <span className="badge badge-green">SOLAR CHARGING</span>
          <span className="mono text-muted text-xs">BUS: 5.0V OK</span>
        </div>
      </div>

      {/* Link Quality Status Card */}
      <div className="card status-card status-card-red">
        <div className="status-card-header">
          <span className="card-label">RF LINK QUALITY</span>
          <div className="icon-badge" style={{ color: 'var(--accent-red)' }}>
            <Signal size={20} />
          </div>
        </div>
        <div className="status-card-body">
          <div className="status-val-group">
            <span className="status-val mono">{telemetry.linkQuality}%</span>
            <span className="status-subtext mono">SNR {telemetry.snr} dB</span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{
                width: `${telemetry.linkQuality}%`,
                backgroundColor: 'var(--accent-red)'
              }}
            />
          </div>
        </div>
        <div className="status-card-footer">
          <span className="badge badge-red">UHF 437.500 MHz</span>
          <span className="mono text-muted text-xs">-92 dBm RSSI</span>
        </div>
      </div>

      {/* Active Transmission Mode Card */}
      <div className="card status-card status-card-purple">
        <div className="status-card-header">
          <span className="card-label">ACTIVE TRANSMISSION MODE</span>
          <div className="icon-badge" style={{ color: 'var(--accent-purple)' }}>
            <Radio size={20} />
          </div>
        </div>
        <div className="status-card-body">
          <div className="status-val-group">
            <span className="status-val mode-text mono">{telemetry.activeMode}</span>
            <span className="status-subtext">
              {telemetry.activeMode === 'TTC' && 'Telemetry & Command Beacon'}
              {telemetry.activeMode === 'SSTV' && 'Slow Scan TV Camera Frame'}
              {telemetry.activeMode === 'Codec2' && 'Low Bitrate Digital Voice'}
              {telemetry.activeMode === 'M17' && 'M17 Protocol Data Stream'}
            </span>
          </div>
        </div>
        <div className="status-card-footer">
          <span className="badge badge-purple">AI ROUTED</span>
          <span className="mono text-muted text-xs">9600 Baud AX.25</span>
        </div>
      </div>

      <style>{`
        .status-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.25rem;
        }

        .status-card {
          --card-glow: var(--accent-blue);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
        }

        .status-card-green { --card-glow: var(--accent-green); }
        .status-card-red { --card-glow: var(--accent-red); }
        .status-card-purple { --card-glow: var(--accent-purple); }

        .status-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .card-label {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }

        .icon-badge {
          background-color: var(--bg-dark);
          padding: 0.4rem;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          display: flex;
        }

        .status-card-body {
          margin-bottom: 1rem;
        }

        .status-val-group {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .status-val {
          font-size: 2rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1;
        }

        .mode-text {
          color: var(--accent-purple);
        }

        .status-subtext {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .progress-bar-container {
          height: 6px;
          background-color: var(--bg-dark);
          border-radius: 3px;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.4s ease, background-color 0.4s ease;
        }

        .status-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-color);
        }

        .text-xs {
          font-size: 0.72rem;
        }
      `}</style>
    </div>
  );
};
