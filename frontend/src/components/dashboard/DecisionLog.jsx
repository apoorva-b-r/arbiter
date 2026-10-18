import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { api } from '../../api/client';
import { DownlinkDetailModal } from '../downlink/DownlinkDetailModal';
import { Cpu, UserCheck, Eye } from 'lucide-react';

export const DecisionLog = () => {
  const { decisions } = useTelemetry();
  const [selectedDownlink, setSelectedDownlink] = useState(null);
  const [loadingDownlinkId, setLoadingDownlinkId] = useState(null);
  const [downlinkStatuses, setDownlinkStatuses] = useState({});

  // Sync latest downlink statuses for quick chip display
  useEffect(() => {
    let isMounted = true;
    const fetchStatuses = async () => {
      try {
        const dwns = await api.getDownlinks({ limit: 50 });
        if (isMounted && Array.isArray(dwns)) {
          const map = {};
          dwns.forEach(d => {
            if (d.decisionId) map[d.decisionId] = d.status;
            if (d.downlinkId) map[d.downlinkId] = d.status;
          });
          setDownlinkStatuses(prev => ({ ...prev, ...map }));
        }
      } catch (err) {
        // Silently tolerate in polling
      }
    };

    fetchStatuses();
    const interval = setInterval(fetchStatuses, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleViewData = async (dec) => {
    const decId = dec.id || dec.decisionId;
    setLoadingDownlinkId(decId);
    try {
      let dwn = await api.getDownlinkByDecision(decId);
      if (!dwn && dec.downlinkId) {
        dwn = await api.getDownlink(dec.downlinkId);
      }
      if (dwn) {
        setSelectedDownlink(dwn);
      } else {
        // Fallback local representation if not found in db/memory
        const determinedStatus = dec.downlinkStatus || downlinkStatuses[decId] || downlinkStatuses[dec.downlinkId] || 'RECEIVED';
        setSelectedDownlink({
          downlinkId: dec.downlinkId || 'DWN-LIVE',
          decisionId: decId,
          passId: dec.passId,
          type: dec.selectedType,
          label: `${dec.selectedType} Payload Transmission`,
          sizeKb: dec.selectedType === 'TTC' ? 14 : dec.selectedType === 'SSTV' ? 450 : 48,
          status: determinedStatus,
          linkQualityAtSend: 82,
          ackReceived: determinedStatus !== 'LOST',
          ackLatencyMs: determinedStatus !== 'LOST' ? 240 : null,
          payload: dec.selectedType === 'TTC' ? {
            batteryVoltage: 3.96,
            batteryPercent: 82.0,
            boardTempC: 22.5,
            solarCurrentmA: 230,
            rssiDbm: -84,
            uptimeSec: 86400,
            mode: 'NOMINAL'
          } : dec.selectedType === 'SSTV' ? {
            imageKey: 'sstv-01',
            caption: 'Earth limb over the Indian Ocean',
            quality: 85,
            mode: 'Martin M1',
            resolution: '320x256'
          } : {
            audioKey: 'voice-01',
            transcript: 'SomaiyaSat, telemetry nominal.',
            bitrate: '3200 bps',
            durationSec: 6
          },
          createdAt: dec.createdAt || new Date()
        });
      }
    } catch (err) {
      console.warn('Failed to load downlink details:', err);
    } finally {
      setLoadingDownlinkId(null);
    }
  };

  return (
    <div className="card decision-panel">
      <div className="card-header">
        <span className="card-title">
          <Cpu size={16} style={{ color: 'var(--accent-green)' }} />
          AI Priority Router Decision Log
        </span>
        <span className="badge badge-green mono">LIVE LOGS</span>
      </div>

      <div className="decision-scroll-list">
        {decisions.map((dec) => {
          const displayTime = dec.createdAt && !isNaN(new Date(dec.createdAt).getTime())
            ? new Date(dec.createdAt).toLocaleTimeString('en-GB', { hour12: false })
            : dec.timestamp;

          const decId = dec.id || dec.decisionId;
          const status = dec.downlinkStatus || downlinkStatuses[decId] || downlinkStatuses[dec.downlinkId] || 'RECEIVED';

          return (
            <div
              key={dec.id}
              className={`decision-card ${dec.isOverridden ? 'override-card' : ''}`}
            >
              <div className="decision-header">
                <div className="decision-title-group">
                  {dec.isOverridden ? (
                    <span className="badge badge-red">
                      <UserCheck size={12} />
                      OPERATOR OVERRIDE
                    </span>
                  ) : (
                    <span className="badge badge-purple">
                      <Cpu size={12} />
                      AUTO SCHEDULER
                    </span>
                  )}
                  <span className="decision-type-badge mono">{dec.selectedType} DISPATCHED</span>
                </div>
                <span className="decision-time mono">{displayTime}</span>
              </div>

              <p className="decision-reasoning">{dec.reasoning}</p>

              <div className="decision-footer mono">
                <div className="decision-footer-meta">
                  <span>ID: {dec.id}</span>
                  <span>Pass: {dec.passId}</span>
                  {!dec.isOverridden && <span>Router Score: {dec.score}</span>}
                </div>

                {dec.downlinkId && (
                  <div className="decision-downlink-group">
                    {status === 'RECEIVED' && (
                      <span className="downlink-chip chip-green">✓ Received</span>
                    )}
                    {status === 'PARTIAL' && (
                      <span className="downlink-chip chip-amber">◐ Partial</span>
                    )}
                    {status === 'LOST' && (
                      <span className="downlink-chip chip-red">✕ Lost</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleViewData(dec)}
                      disabled={loadingDownlinkId === decId}
                      className="btn-view-data"
                      title="Inspect demodulated downlink payload"
                    >
                      <Eye size={12} />
                      {loadingDownlinkId === decId ? 'Fetching...' : 'View data'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Downlink Detail Modal */}
      {selectedDownlink && (
        <DownlinkDetailModal
          downlink={selectedDownlink}
          onClose={() => setSelectedDownlink(null)}
        />
      )}

      <style>{`
        .decision-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .decision-scroll-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          overflow-y: auto;
          max-height: 380px;
          padding-right: 0.2rem;
        }

        .decision-card {
          background-color: #FFF9FA;
          border: 1px solid var(--border-color);
          border-left: 4px solid var(--color-rose-pink);
          padding: 0.8rem 1rem;
          border-radius: 12px;
        }

        .decision-card.override-card {
          border-left-color: var(--alert-critical-border);
          background-color: var(--alert-critical-bg);
          color: var(--alert-critical-text);
        }

        .decision-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.4rem;
        }

        .decision-title-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .decision-type-badge {
          font-weight: 700;
          font-size: 0.82rem;
          color: var(--color-berry-rose);
        }

        .decision-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .decision-reasoning {
          font-size: 0.84rem;
          color: var(--text-primary);
          line-height: 1.4;
          margin-bottom: 0.5rem;
        }

        .decision-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.7rem;
          color: var(--text-muted);
          border-top: 1px solid var(--border-color);
          padding-top: 0.4rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .decision-footer-meta {
          display: flex;
          gap: 0.85rem;
          align-items: center;
        }

        .decision-downlink-group {
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        .downlink-chip {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.12rem 0.45rem;
          border-radius: 4px;
        }

        .chip-green {
          background-color: var(--alert-success-bg);
          color: var(--alert-success-text);
          border: 1px solid var(--alert-success-border);
        }

        .chip-amber {
          background-color: var(--alert-warning-bg);
          color: var(--alert-warning-text);
          border: 1px solid var(--alert-warning-border);
        }

        .chip-red {
          background-color: var(--alert-critical-bg);
          color: var(--alert-critical-text);
          border: 1px solid var(--alert-critical-border);
        }

        .btn-view-data {
          background-color: #FFF0F3;
          border: 1px solid var(--border-color);
          color: var(--color-berry-rose);
          font-size: 0.68rem;
          font-weight: 700;
          font-family: var(--font-mono);
          padding: 0.15rem 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          transition: all 0.15s ease;
        }

        .btn-view-data:hover:not(:disabled) {
          background-color: var(--color-berry-rose);
          color: var(--text-inverse);
          border-color: var(--color-berry-rose);
        }

        .btn-view-data:disabled {
          opacity: 0.6;
          cursor: wait;
        }
      `}</style>
    </div>
  );
};
