import React, { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { useTelemetry } from '../context/TelemetryContext';
import { Sliders, Save, CheckCircle, RotateCcw } from 'lucide-react';

export const Settings = () => {
  const { settings, saveRouterSettings } = useTelemetry();

  const [weights, setWeights] = useState(settings.baseWeights);
  const [ttcTimeout, setTtcTimeout] = useState(settings.ttcStarvationTimeoutSec);
  const [savedAck, setSavedAck] = useState(false);

  const handleWeightChange = (type, val) => {
    setWeights(w => ({ ...w, [type]: Number(val) }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveRouterSettings({
      ...settings,
      baseWeights: weights,
      ttcStarvationTimeoutSec: Number(ttcTimeout)
    });
    setSavedAck(true);
    setTimeout(() => setSavedAck(false), 2500);
  };

  const handleReset = () => {
    setWeights({ TTC: 100, SSTV: 60, Codec2: 40, M17: 30 });
    setTtcTimeout(120);
  };

  return (
    <PageContainer
      title="AI ROUTER SCHEDULER SETTINGS"
      subtitle="Tune base priority weights per payload type and configure TT&C starvation timeout bounds"
    >
      <form onSubmit={handleSave} className="settings-grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <Sliders size={16} style={{ color: 'var(--accent-blue)' }} />
              Base Priority Weight Configuration Sliders
            </span>
            <span className="badge badge-blue mono">ROUTER ALGORITHM</span>
          </div>

          <div className="sliders-list">
            <div className="slider-group">
              <div className="slider-header">
                <div>
                  <span className="badge badge-red">TTC</span>
                  <span className="slider-name">Telemetry & Command Beacon Base Weight</span>
                </div>
                <span className="slider-val mono">{weights.TTC}</span>
              </div>
              <input
                type="range"
                min="50"
                max="200"
                value={weights.TTC}
                onChange={(e) => handleWeightChange('TTC', e.target.value)}
                className="slider-input"
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <div>
                  <span className="badge badge-purple">SSTV</span>
                  <span className="slider-name">Earth Observation Camera SSTV Weight</span>
                </div>
                <span className="slider-val mono">{weights.SSTV}</span>
              </div>
              <input
                type="range"
                min="10"
                max="150"
                value={weights.SSTV}
                onChange={(e) => handleWeightChange('SSTV', e.target.value)}
                className="slider-input"
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <div>
                  <span className="badge badge-blue">Codec2</span>
                  <span className="slider-name">Compressed Voice Beacon Stream Weight</span>
                </div>
                <span className="slider-val mono">{weights.Codec2}</span>
              </div>
              <input
                type="range"
                min="10"
                max="150"
                value={weights.Codec2}
                onChange={(e) => handleWeightChange('Codec2', e.target.value)}
                className="slider-input"
              />
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <div>
                  <span className="badge badge-green">M17</span>
                  <span className="slider-name">Digital Voice Protocol Stream Weight</span>
                </div>
                <span className="slider-val mono">{weights.M17}</span>
              </div>
              <input
                type="range"
                min="10"
                max="150"
                value={weights.M17}
                onChange={(e) => handleWeightChange('M17', e.target.value)}
                className="slider-input"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Safety Thresholds & Timeouts</span>
          </div>

          <div className="form-group">
            <label className="form-label">TT&C Starvation Safety Override Timeout (Seconds)</label>
            <p className="form-help text-muted text-xs mb-2">
              If TT&C telemetry has been pending longer than this threshold, the AI router forces TT&C dispatch regardless of candidate weights.
            </p>
            <input
              type="number"
              min="30"
              max="300"
              value={ttcTimeout}
              onChange={(e) => setTtcTimeout(e.target.value)}
              className="form-input mono"
            />
          </div>

          <div className="settings-actions">
            <button type="button" onClick={handleReset} className="btn btn-outline">
              <RotateCcw size={14} />
              Reset Defaults
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={14} />
              Apply Weight Parameters
            </button>
          </div>

          {savedAck && (
            <div className="save-ack-banner mono">
              <CheckCircle size={14} />
              <span>ROUTER PARAMETERS UPDATED AND SYNCED TO ENGINE</span>
            </div>
          )}
        </div>
      </form>

      <style>{`
        .settings-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .sliders-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .slider-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.4rem;
        }

        .slider-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-left: 0.5rem;
        }

        .slider-val {
          font-weight: 800;
          font-size: 1.1rem;
          color: var(--accent-blue);
        }

        .slider-input {
          width: 100%;
          accent-color: var(--accent-blue);
          cursor: pointer;
        }

        .settings-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
        }

        .save-ack-banner {
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
    </PageContainer>
  );
};
