import React, { useState, useEffect } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { useTelemetry } from '../context/TelemetryContext';
import { Sliders, Save, CheckCircle, RotateCcw } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function getAuthHeaders() {
  try {
    const raw = sessionStorage.getItem('arbiter_user');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed?.token ? { 'Authorization': `Bearer ${parsed.token}` } : {};
  } catch {
    return {};
  }
}

const DEFAULT_SETTINGS = {
  baseWeights: { TTC: 100, SSTV: 60, Codec2: 40, M17: 30 },
  ttcStarvationTimeoutSec: 120,
  batteryThresholdLow: 30,
  linkQualityThresholdLow: 35
};

// Explicit mapping helper across backend/frontend layers
function mapBackendSettings(data, fallback) {
  if (!data) return fallback;
  const raw = data.settings || data;
  const rawWeights = raw.baseWeights || raw.weights || {};

  const prevWeights = fallback?.baseWeights || DEFAULT_SETTINGS.baseWeights;
  const mappedWeights = {
    TTC: typeof rawWeights.TTC === 'number'
      ? rawWeights.TTC
      : (typeof rawWeights['TT&C'] === 'number' ? rawWeights['TT&C'] : prevWeights.TTC),
    SSTV: typeof rawWeights.SSTV === 'number'
      ? rawWeights.SSTV
      : prevWeights.SSTV,
    Codec2: typeof rawWeights.Codec2 === 'number'
      ? rawWeights.Codec2
      : (typeof rawWeights.CODE2 === 'number' ? rawWeights.CODE2 : prevWeights.Codec2),
    M17: typeof rawWeights.M17 === 'number'
      ? rawWeights.M17
      : prevWeights.M17
  };

  const rawTimeout = raw.ttcStarvationTimeoutSec !== undefined
    ? raw.ttcStarvationTimeoutSec
    : raw.ttcStarvationTimeout;
  const mappedTimeout = (typeof rawTimeout === 'number' && !isNaN(rawTimeout))
    ? rawTimeout
    : (fallback?.ttcStarvationTimeoutSec ?? 120);

  const rawBattery = raw.batteryThresholdLow;
  const mappedBattery = (typeof rawBattery === 'number' && !isNaN(rawBattery))
    ? rawBattery
    : (fallback?.batteryThresholdLow ?? 30);

  return {
    ...fallback,
    ...raw,
    baseWeights: mappedWeights,
    ttcStarvationTimeoutSec: mappedTimeout,
    batteryThresholdLow: mappedBattery
  };
}

// Client-side validation function
function validateAll(weights, timeout) {
  const errs = {};
  ['TTC', 'SSTV', 'Codec2', 'M17'].forEach(type => {
    const val = weights?.[type];
    if (val === '' || val === undefined || val === null) {
      errs[type] = `${type} weight is required.`;
    } else {
      const num = Number(val);
      if (isNaN(num) || !isFinite(num)) {
        errs[type] = `${type} weight must be a number.`;
      } else if (num < 10 || num > 200) {
        errs[type] = `${type} weight must be between 10 and 200.`;
      }
    }
  });

  if (timeout === '' || timeout === undefined || timeout === null) {
    errs.ttcStarvationTimeoutSec = 'TT&C starvation timeout is required.';
  } else {
    const num = Number(timeout);
    if (isNaN(num) || !isFinite(num)) {
      errs.ttcStarvationTimeoutSec = 'Must be a valid number.';
    } else if (!Number.isInteger(num)) {
      errs.ttcStarvationTimeoutSec = 'Must be a whole number (no decimals).';
    } else if (num < 30 || num > 300) {
      errs.ttcStarvationTimeoutSec = 'Must be between 30 and 300 seconds.';
    }
  }

  return errs;
}

export const Settings = () => {
  const { settings, saveRouterSettings } = useTelemetry();

  // Local draft state
  const [weights, setWeights] = useState(() => settings?.baseWeights || DEFAULT_SETTINGS.baseWeights);
  const [ttcTimeout, setTtcTimeout] = useState(() => settings?.ttcStarvationTimeoutSec ?? DEFAULT_SETTINGS.ttcStarvationTimeoutSec);

  // Status & communication state
  const [isSaving, setIsSaving] = useState(false);
  const [savedAck, setSavedAck] = useState(false);
  const [ackMessage, setAckMessage] = useState('ROUTER PARAMETERS UPDATED AND SYNCED TO ENGINE');
  const [isOffline, setIsOffline] = useState(false);
  const [serverErrors, setServerErrors] = useState({});

  // Live client-side errors
  const clientErrors = validateAll(weights, ttcTimeout);
  const fieldErrors = { ...clientErrors, ...serverErrors };
  const hasErrors = Object.keys(fieldErrors).length > 0;

  // On page load: request GET /api/settings
  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const res = await fetch(`${API}/settings`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!isMounted) return;

        const mapped = mapBackendSettings(data, settings);
        setWeights(mapped.baseWeights);
        setTtcTimeout(mapped.ttcStarvationTimeoutSec);
        saveRouterSettings(mapped);
        setIsOffline(false);
      } catch (err) {
        if (!isMounted) return;
        // Backend offline fallback: preserve local settings and notify user
        setIsOffline(true);
      }
    };

    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleWeightChange = (type, val) => {
    setWeights(prev => ({ ...prev, [type]: Number(val) }));
    if (serverErrors[type] || serverErrors.baseWeights) {
      setServerErrors(prev => {
        const next = { ...prev };
        delete next[type];
        delete next.baseWeights;
        return next;
      });
    }
  };

  const handleTimeoutChange = (val) => {
    setTtcTimeout(val);
    if (serverErrors.ttcStarvationTimeoutSec || serverErrors.ttcTimeout) {
      setServerErrors(prev => {
        const next = { ...prev };
        delete next.ttcStarvationTimeoutSec;
        delete next.ttcTimeout;
        return next;
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // 1. Validate all draft values
    const validationErrors = validateAll(weights, ttcTimeout);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSaving(true);
    setServerErrors({});

    const payload = {
      baseWeights: {
        TTC: Number(weights.TTC),
        SSTV: Number(weights.SSTV),
        Codec2: Number(weights.Codec2),
        M17: Number(weights.M17)
      },
      ttcStarvationTimeoutSec: Number(ttcTimeout),
      batteryThresholdLow: typeof settings?.batteryThresholdLow === 'number'
        ? settings.batteryThresholdLow
        : DEFAULT_SETTINGS.batteryThresholdLow
    };

    try {
      const res = await fetch(`${API}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });

      if (res.status === 400) {
        const errorData = await res.json();
        const mappedErrors = {};
        if (errorData.errors) {
          if (errorData.errors.ttcStarvationTimeoutSec) {
            mappedErrors.ttcStarvationTimeoutSec = errorData.errors.ttcStarvationTimeoutSec;
          } else if (errorData.errors.ttcTimeout) {
            mappedErrors.ttcStarvationTimeoutSec = errorData.errors.ttcTimeout;
          }
          ['TTC', 'SSTV', 'Codec2', 'M17'].forEach(key => {
            if (errorData.errors[key]) {
              mappedErrors[key] = errorData.errors[key];
            } else if (errorData.errors[`baseWeights.${key}`]) {
              mappedErrors[key] = errorData.errors[`baseWeights.${key}`];
            }
          });
          if (errorData.errors.batteryThresholdLow) {
            mappedErrors.batteryThresholdLow = errorData.errors.batteryThresholdLow;
          }
        }
        setServerErrors(mappedErrors);
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const result = await res.json();
      const mapped = mapBackendSettings(result, settings);

      setWeights(mapped.baseWeights);
      setTtcTimeout(mapped.ttcStarvationTimeoutSec);
      saveRouterSettings(mapped);

      setAckMessage('ROUTER PARAMETERS UPDATED AND SYNCED TO ENGINE');
      setSavedAck(true);
      setTimeout(() => setSavedAck(false), 2500);
      setIsOffline(false);
    } catch (err) {
      // Backend offline fallback: apply locally through existing context
      const localFallback = {
        ...settings,
        baseWeights: payload.baseWeights,
        ttcStarvationTimeoutSec: payload.ttcStarvationTimeoutSec,
        batteryThresholdLow: payload.batteryThresholdLow
      };
      saveRouterSettings(localFallback);

      setIsOffline(true);
      setAckMessage('Saved locally (backend offline)');
      setSavedAck(true);
      setTimeout(() => setSavedAck(false), 2500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    setServerErrors({});

    try {
      const res = await fetch(`${API}/settings/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const result = await res.json();
      const mapped = mapBackendSettings(result, DEFAULT_SETTINGS);

      setWeights(mapped.baseWeights);
      setTtcTimeout(mapped.ttcStarvationTimeoutSec);
      saveRouterSettings(mapped);

      setAckMessage('ROUTER PARAMETERS RESET TO DEFAULTS AND PERSISTED');
      setSavedAck(true);
      setTimeout(() => setSavedAck(false), 2500);
      setIsOffline(false);
    } catch (err) {
      // Backend offline fallback: local reset
      const localReset = {
        ...settings,
        baseWeights: { ...DEFAULT_SETTINGS.baseWeights },
        ttcStarvationTimeoutSec: DEFAULT_SETTINGS.ttcStarvationTimeoutSec,
        batteryThresholdLow: DEFAULT_SETTINGS.batteryThresholdLow
      };
      setWeights(DEFAULT_SETTINGS.baseWeights);
      setTtcTimeout(DEFAULT_SETTINGS.ttcStarvationTimeoutSec);
      saveRouterSettings(localReset);

      setIsOffline(true);
      setAckMessage('Reset locally (backend offline)');
      setSavedAck(true);
      setTimeout(() => setSavedAck(false), 2500);
    } finally {
      setIsSaving(false);
    }
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
              <Sliders size={16} style={{ color: 'var(--color-rose-pink)' }} />
              Base Priority Weight Configuration Sliders
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {isOffline && (
                <span className="offline-note mono">Backend offline. Saving locally only</span>
              )}
              <span className="badge badge-blue mono">ROUTER ALGORITHM</span>
            </div>
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
                min="10"
                max="200"
                value={weights.TTC}
                onChange={(e) => handleWeightChange('TTC', e.target.value)}
                className="slider-input"
              />
              {fieldErrors.TTC && (
                <div className="field-error-msg mono">{fieldErrors.TTC}</div>
              )}
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
                max="200"
                value={weights.SSTV}
                onChange={(e) => handleWeightChange('SSTV', e.target.value)}
                className="slider-input"
              />
              {fieldErrors.SSTV && (
                <div className="field-error-msg mono">{fieldErrors.SSTV}</div>
              )}
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
                max="200"
                value={weights.Codec2}
                onChange={(e) => handleWeightChange('Codec2', e.target.value)}
                className="slider-input"
              />
              {fieldErrors.Codec2 && (
                <div className="field-error-msg mono">{fieldErrors.Codec2}</div>
              )}
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
                max="200"
                value={weights.M17}
                onChange={(e) => handleWeightChange('M17', e.target.value)}
                className="slider-input"
              />
              {fieldErrors.M17 && (
                <div className="field-error-msg mono">{fieldErrors.M17}</div>
              )}
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
              onChange={(e) => handleTimeoutChange(e.target.value)}
              className="form-input mono"
              style={fieldErrors.ttcStarvationTimeoutSec ? { borderColor: 'var(--color-berry-rose, #ef4444)' } : {}}
            />
            {fieldErrors.ttcStarvationTimeoutSec && (
              <div className="field-error-msg mono">{fieldErrors.ttcStarvationTimeoutSec}</div>
            )}
          </div>

          <div className="settings-actions">
            <button
              type="button"
              onClick={handleReset}
              className="btn btn-outline"
              disabled={isSaving}
            >
              <RotateCcw size={14} />
              Reset Defaults
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={hasErrors || isSaving}
            >
              {isSaving ? (
                <>
                  <span className="spinner-sm" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Apply Weight Parameters
                </>
              )}
            </button>
          </div>

          {savedAck && (
            <div className="save-ack-banner mono">
              <CheckCircle size={14} />
              <span>{ackMessage}</span>
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

        .slider-group {
          display: flex;
          flex-direction: column;
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
          color: var(--color-berry-rose);
        }

        .slider-input {
          width: 100%;
          accent-color: var(--color-berry-rose);
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
          background-color: var(--alert-success-bg);
          border: 1px solid var(--alert-success-border);
          color: var(--alert-success-text);
          padding: 0.6rem 0.9rem;
          border-radius: 8px;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
        }

        .field-error-msg {
          color: var(--color-berry-rose, #ef4444);
          font-size: 0.78rem;
          font-weight: 600;
          margin-top: 0.35rem;
        }

        .offline-note {
          color: var(--text-muted, #94a3b8);
          font-size: 0.75rem;
          font-weight: 500;
        }

        .btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          filter: grayscale(0.5);
        }

        .spinner-sm {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
          margin-right: 0.4rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PageContainer>
  );
};
