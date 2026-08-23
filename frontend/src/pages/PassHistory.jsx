import React, { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { useTelemetry } from '../context/TelemetryContext';
import { History, Eye, X, CheckCircle2, UserCheck, Calendar, Clock } from 'lucide-react';

export const PassHistory = () => {
  const { passes, decisions } = useTelemetry();
  const [selectedPass, setSelectedPass] = useState(null);

  const getPassDecisions = (pass) => {
    if (!pass) return [];
    if (pass.decisions && pass.decisions.length > 0) {
      return pass.decisions;
    }
    return decisions.filter(d => d.passId === pass.passId);
  };

  const getItemsSent = (pass) => getPassDecisions(pass).length;
  const getOverrideCount = (pass) => getPassDecisions(pass).filter(d => d.isOverridden || d.wasOverride).length;
  const getOverridePercentage = (pass) => {
    const total = getItemsSent(pass);
    const overrides = getOverrideCount(pass);
    return total > 0 ? Math.round((overrides / total) * 100) : 0;
  };

  return (
    <PageContainer
      title="GROUND PASS HISTORY LOGS"
      subtitle="Historical log of orbital ground passes, transmission telemetry metrics, and operator overrides"
    >
      <div className="card pass-history-card">
        <div className="card-header">
          <span className="card-title">
            <History size={16} style={{ color: 'var(--accent-blue)' }} />
            Recorded Pass History (Last 30 Days)
          </span>
          <span className="badge badge-blue mono">{passes.length} PASSES RECORDED</span>
        </div>

        <table className="tech-table">
          <thead>
            <tr>
              <th>PASS ID</th>
              <th>DATE / START TIME</th>
              <th>DURATION</th>
              <th>ITEMS SENT</th>
              <th>OVERRIDE COUNT</th>
              <th>PEAK LINK Q.</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {passes.map((pass) => {
              const itemsSent = getItemsSent(pass);
              const overrideCount = getOverrideCount(pass);
              const overridePct = getOverridePercentage(pass);

              return (
                <tr key={pass.passId}>
                  <td className="mono bold">{pass.passId}</td>
                  <td>
                    <div className="cell-with-sub">
                      <span>{pass.startTime}</span>
                      <span className="text-muted text-xs mono">{pass.date}</span>
                    </div>
                  </td>
                  <td className="mono">{pass.durationSec}s</td>
                  <td className="mono">{itemsSent} items</td>
                  <td>
                    {overrideCount > 0 ? (
                      <span className="badge badge-red mono">
                        <UserCheck size={12} /> {overrideCount} MANUAL ({overridePct}%)
                      </span>
                    ) : (
                      <span className="badge badge-green mono">0 (FULLY AUTO)</span>
                    )}
                  </td>
                  <td className="mono">{pass.peakLinkQuality}%</td>
                  <td>
                    <span className={`badge ${pass.status === 'ACTIVE' ? 'badge-green' : 'badge-purple'}`}>
                      {pass.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => setSelectedPass(pass)}
                      className="btn btn-outline btn-sm"
                    >
                      <Eye size={14} />
                      Inspect Logs
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pass Detail Modal */}
      {selectedPass && (() => {
        const passDecisions = getPassDecisions(selectedPass);
        const itemsSent = getItemsSent(selectedPass);
        const overrideCount = getOverrideCount(selectedPass);
        const overridePct = getOverridePercentage(selectedPass);

        return (
          <div className="modal-backdrop">
            <div className="modal-content card">
              <div className="card-header">
                <span className="card-title">
                  Pass Decision Log Breakdown — {selectedPass.passId}
                </span>
                <button onClick={() => setSelectedPass(null)} className="close-btn">
                  <X size={17} />
                </button>
              </div>

              <div className="pass-summary-grid">
                <div className="pass-metric">
                  <span className="metric-label">START TIME</span>
                  <span className="metric-val mono">{selectedPass.startTime}</span>
                </div>
                <div className="pass-metric">
                  <span className="metric-label">TOTAL DISPATCHED</span>
                  <span className="metric-val mono">{itemsSent} items</span>
                </div>
                <div className="pass-metric">
                  <span className="metric-label">MANUAL OVERRIDES</span>
                  <span className="metric-val mono">
                    {overrideCount} ({overridePct}%)
                  </span>
                </div>
              </div>

              <h4 className="modal-section-title">Decision Timeline Log</h4>
              <div className="modal-scroll-list">
                {passDecisions.length > 0 ? (
                  <>
                    {passDecisions.map((dec) => {
                      const isOverridden = dec.isOverridden || dec.wasOverride;
                      const itemType = dec.selectedType || dec.itemType || 'DATA';
                      const reasoning = dec.reasoning || dec.reason;

                      return (
                        <div key={dec.id} className={`decision-card ${isOverridden ? 'override-card' : ''}`}>
                          <div className="decision-header">
                            <div className="decision-title-group">
                              {isOverridden ? (
                                <span className="badge badge-red mono">
                                  <UserCheck size={12} /> OVERRIDDEN
                                </span>
                              ) : (
                                <span className="badge badge-purple mono">
                                  <CheckCircle2 size={12} /> AI ROUTED
                                </span>
                              )}
                              <span className="decision-type-badge mono">{itemType} DISPATCHED</span>
                            </div>
                            <span className="mono text-muted text-xs">{dec.timestamp}</span>
                          </div>
                          <p className="decision-reasoning">{reasoning}</p>
                        </div>
                      );
                    })}
                    {overrideCount === 0 && (
                      <div className="auto-pass-notice mono text-xs">
                        <CheckCircle2 size={13} style={{ color: 'var(--alert-success-border)' }} />
                        All decisions were automatic — no operator overrides during this pass.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-decisions-notice mono text-sm">
                    No transmission decisions were recorded for this pass.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <style>{`
        .bold { font-weight: 700; color: var(--color-berry-rose); }
        .cell-with-sub { display: flex; flex-direction: column; }

        .close-btn {
          background: none;
          border: none;
          color: var(--color-soft-blush);
          cursor: pointer;
        }

        .close-btn:hover {
          color: var(--text-inverse);
        }

        .pass-history-card {
          --card-glow: var(--color-rose-pink);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }

        .pass-history-card:hover {
          border-color: var(--color-rose-pink);
          box-shadow: 0 6px 20px rgba(96, 36, 55, 0.12);
        }

        .pass-history-card .tech-table tbody tr {
          transition: background-color 0.15s ease, box-shadow 0.15s ease;
        }

        .pass-history-card .tech-table tbody tr:hover {
          background-color: #FFF0F3;
          box-shadow: inset 3px 0 0 var(--color-berry-rose);
        }
        
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(43, 15, 24, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 1.5rem;
        }

        .modal-content {
          width: 100%;
          max-width: 650px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          border-color: var(--color-berry-rose);
          box-shadow: 0 12px 36px rgba(96, 36, 55, 0.3);
          border-radius: 16px;
        }

        .pass-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          background-color: var(--color-soft-blush);
          padding: 0.8rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          margin-bottom: 1rem;
        }

        .pass-metric {
          display: flex;
          flex-direction: column;
        }

        .metric-label {
          font-size: 0.68rem;
          color: var(--text-muted);
          font-weight: 700;
        }

        .metric-val {
          font-size: 1rem;
          font-weight: 800;
          color: var(--color-berry-rose);
        }

        .modal-section-title {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .modal-scroll-list {
          overflow-y: auto;
          max-height: 300px;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .decision-card {
          background-color: #FFF9FA;
          border: 1px solid var(--border-color);
          border-left: 4px solid var(--color-berry-rose);
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

        .decision-reasoning {
          font-size: 0.84rem;
          color: var(--text-primary);
          line-height: 1.4;
        }

        .auto-pass-notice {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.6rem 0.8rem;
          background-color: var(--alert-success-bg);
          border: 1px solid var(--alert-success-border);
          color: var(--alert-success-text);
          border-radius: 8px;
          margin-top: 0.3rem;
          font-weight: 600;
        }

        .empty-decisions-notice {
          padding: 1rem;
          color: var(--text-muted);
          text-align: center;
          background-color: var(--color-soft-blush);
          border-radius: 8px;
          border: 1px dashed var(--border-color);
        }
      `}</style>
    </PageContainer>
  );
};
