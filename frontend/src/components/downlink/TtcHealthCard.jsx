import React from 'react';
import {
  BatteryCharging,
  Thermometer,
  Sun,
  Radio,
  Clock,
  Cpu,
  Activity
} from 'lucide-react';

export const TtcHealthCard = ({ payload = {}, compact = false }) => {
  const {
    batteryVoltage = 3.95,
    batteryPercent = 78,
    boardTempC = 22.4,
    solarCurrentmA = 240,
    rssiDbm = -85,
    uptimeSec = 86400,
    mode = 'NOMINAL'
  } = payload;

  const formatUptime = (seconds) => {
    if (typeof seconds !== 'number' || isNaN(seconds)) return '--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs}h ${mins}m ${secs}s`;
  };

  // Health evaluations
  const getBatteryStatus = (pct) => {
    if (pct < 30) return { label: 'CRITICAL', colorClass: 'val-critical' };
    if (pct < 50) return { label: 'WARNING', colorClass: 'val-warning' };
    return { label: 'NOMINAL', colorClass: 'val-nominal' };
  };

  const getTempStatus = (temp) => {
    if (temp < -5 || temp > 50) return { label: 'CRITICAL', colorClass: 'val-critical' };
    if (temp < 5 || temp > 40) return { label: 'WARNING', colorClass: 'val-warning' };
    return { label: 'NOMINAL', colorClass: 'val-nominal' };
  };

  const getSolarStatus = (current) => {
    if (current < 20) return { label: 'ECLIPSE / LOW', colorClass: 'val-warning' };
    return { label: 'CHARGING', colorClass: 'val-nominal' };
  };

  const getRssiStatus = (rssi) => {
    if (rssi < -110) return { label: 'POOR', colorClass: 'val-critical' };
    if (rssi < -95) return { label: 'FAIR', colorClass: 'val-warning' };
    return { label: 'STRONG', colorClass: 'val-nominal' };
  };

  const battStatus = getBatteryStatus(batteryPercent);
  const tempStatus = getTempStatus(boardTempC);
  const solarStatus = getSolarStatus(solarCurrentmA);
  const rssiStatus = getRssiStatus(rssiDbm);

  return (
    <div className={`ttc-health-container ${compact ? 'compact' : ''}`}>
      <div className="health-grid">
        {/* Battery */}
        <div className={`health-item ${battStatus.colorClass}`}>
          <div className="health-item-header">
            <span className="health-label">
              <BatteryCharging size={14} />
              BATTERY
            </span>
            <span className="status-tag mono">{battStatus.label}</span>
          </div>
          <div className="health-value-group">
            <span className="health-primary-val mono">
              {typeof batteryPercent === 'number' ? batteryPercent.toFixed(1) : batteryPercent}%
            </span>
            <span className="health-sub-val mono">
              {typeof batteryVoltage === 'number' ? batteryVoltage.toFixed(2) : batteryVoltage} V
            </span>
          </div>
        </div>

        {/* Board Temperature */}
        <div className={`health-item ${tempStatus.colorClass}`}>
          <div className="health-item-header">
            <span className="health-label">
              <Thermometer size={14} />
              BOARD TEMP
            </span>
            <span className="status-tag mono">{tempStatus.label}</span>
          </div>
          <div className="health-value-group">
            <span className="health-primary-val mono">
              {typeof boardTempC === 'number' ? boardTempC.toFixed(1) : boardTempC}°C
            </span>
            <span className="health-sub-val mono">
              {boardTempC > 40 ? 'HIGH HEAT' : boardTempC < 5 ? 'CHILLED' : 'THERMAL STABLE'}
            </span>
          </div>
        </div>

        {/* Solar Current */}
        <div className={`health-item ${solarStatus.colorClass}`}>
          <div className="health-item-header">
            <span className="health-label">
              <Sun size={14} />
              SOLAR ARRAY
            </span>
            <span className="status-tag mono">{solarStatus.label}</span>
          </div>
          <div className="health-value-group">
            <span className="health-primary-val mono">
              {solarCurrentmA} mA
            </span>
            <span className="health-sub-val mono">
              {solarCurrentmA > 150 ? 'PEAK IRRADIANCE' : 'PARTIAL EXPOSURE'}
            </span>
          </div>
        </div>

        {/* RSSI Signal */}
        <div className={`health-item ${rssiStatus.colorClass}`}>
          <div className="health-item-header">
            <span className="health-label">
              <Radio size={14} />
              CARRIER RSSI
            </span>
            <span className="status-tag mono">{rssiStatus.label}</span>
          </div>
          <div className="health-value-group">
            <span className="health-primary-val mono">
              {rssiDbm} dBm
            </span>
            <span className="health-sub-val mono">
              UHF GROUND LINK
            </span>
          </div>
        </div>

        {/* Uptime */}
        <div className="health-item val-neutral">
          <div className="health-item-header">
            <span className="health-label">
              <Clock size={14} />
              SYSTEM UPTIME
            </span>
            <span className="status-tag mono">CLOCK</span>
          </div>
          <div className="health-value-group">
            <span className="health-primary-val mono" style={{ fontSize: '1rem' }}>
              {formatUptime(uptimeSec)}
            </span>
            <span className="health-sub-val mono">
              CONTINUOUS RUN
            </span>
          </div>
        </div>

        {/* Mode */}
        <div className="health-item val-neutral">
          <div className="health-item-header">
            <span className="health-label">
              <Cpu size={14} />
              BEACON MODE
            </span>
            <span className="status-tag mono">SYS</span>
          </div>
          <div className="health-value-group">
            <span className="health-primary-val mono" style={{ color: 'var(--color-berry-rose)', fontSize: '1.05rem' }}>
              {mode}
            </span>
            <span className="health-sub-val mono">
              ACTIVE PROFILE
            </span>
          </div>
        </div>
      </div>

      <style>{`
        .ttc-health-container {
          background-color: #FFF9FA;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1rem;
        }

        .ttc-health-container.compact {
          padding: 0.75rem;
          background: transparent;
          border: none;
        }

        .health-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.75rem;
        }

        .ttc-health-container.compact .health-grid {
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .health-item {
          background-color: #FFFFFF;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 0.75rem 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          box-shadow: 0 1px 4px rgba(96, 36, 55, 0.04);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .health-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(96, 36, 55, 0.08);
        }

        .health-item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .health-label {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: var(--text-muted);
        }

        .health-label svg {
          color: var(--color-raspberry);
        }

        .status-tag {
          font-size: 0.65rem;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          font-weight: 700;
        }

        .health-value-group {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .health-primary-val {
          font-size: 1.15rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .health-sub-val {
          font-size: 0.68rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        /* Value color themes */
        .val-nominal .status-tag {
          background-color: var(--alert-success-bg);
          color: var(--alert-success-text);
          border: 1px solid var(--alert-success-border);
        }
        .val-nominal .health-primary-val {
          color: var(--alert-success-text);
        }

        .val-warning {
          border-color: var(--alert-warning-border);
          background-color: #FFFDF7;
        }
        .val-warning .status-tag {
          background-color: var(--alert-warning-bg);
          color: var(--alert-warning-text);
          border: 1px solid var(--alert-warning-border);
        }
        .val-warning .health-primary-val {
          color: var(--alert-warning-border);
        }

        .val-critical {
          border-color: var(--alert-critical-border);
          background-color: #FFF5F5;
        }
        .val-critical .status-tag {
          background-color: var(--alert-critical-bg);
          color: var(--alert-critical-text);
          border: 1px solid var(--alert-critical-border);
        }
        .val-critical .health-primary-val {
          color: var(--alert-critical-border);
        }

        .val-neutral .status-tag {
          background-color: var(--color-soft-blush);
          color: var(--color-berry-rose);
          border: 1px solid var(--border-color);
        }
        .val-neutral .health-primary-val {
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
};

export default TtcHealthCard;
