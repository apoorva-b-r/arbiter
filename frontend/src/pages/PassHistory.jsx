import React, { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { useTelemetry } from '../context/TelemetryContext';
import { api } from '../api/client';
import { DownlinkDetailModal } from '../components/downlink/DownlinkDetailModal';
import {
  History,
  Eye,
  X,
  CheckCircle2,
  UserCheck,
  Calendar,
  Clock,
  Loader2,
  Edit3,
  Save,
  Plus,
  AlertTriangle,
  Inbox,
  Image as ImageIcon,
  Volume2,
  Cpu
} from 'lucide-react';

const formatPassTime = (createdAt, timeStr, dateStr) => {
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-GB', { hour12: false });
    }
  }
  if (timeStr) {
    const cleanTime = String(timeStr).replace(' UTC', '').trim();
    if (dateStr) {
      const d = new Date(`${dateStr}T${cleanTime}Z`);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-GB', { hour12: false });
      }
    }
    return cleanTime;
  }
  return '';
};

export const PassHistory = () => {
  const { passes, backendOnline, createNewPass } = useTelemetry();
  const [selectedPass, setSelectedPass] = useState(null);
  const [modalDecisions, setModalDecisions] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const [passDownlinks, setPassDownlinks] = useState([]);
  const [passDownlinkStats, setPassDownlinkStats] = useState({ total: 0, received: 0, partial: 0, lost: 0, successRate: 0 });
  const [loadingDownlinks, setLoadingDownlinks] = useState(false);
  const [selectedDownlinkDetail, setSelectedDownlinkDetail] = useState(null);

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesError, setNotesError] = useState('');

  const [isCreatingPass, setIsCreatingPass] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const handleNewPassClick = () => {
    const hasActivePass = passes.some(p => p.status === 'ACTIVE');
    if (hasActivePass) {
      setShowConfirmModal(true);
    } else {
      handleExecuteNewPass();
    }
  };

  const handleExecuteNewPass = async () => {
    if (isCreatingPass) return;
    setIsCreatingPass(true);
    setFeedbackMessage(null);

    try {
      const res = await createNewPass();
      if (res && res.success) {
        setFeedbackMessage({
          type: 'success',
          text: `New pass ${res.pass?.passId || ''} initiated successfully. Previous pass preserved in history.`
        });
      } else {
        setFeedbackMessage({
          type: 'error',
          text: (res && res.error) || 'Failed to start new pass. Please try again.'
        });
      }
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'An unexpected error occurred while starting a new pass.'
      });
    } finally {
      setIsCreatingPass(false);
      setShowConfirmModal(false);
    }
  };

  const handleInspectLogs = async (pass) => {
    setSelectedPass(pass);
    setModalLoading(true);
    setModalDecisions([]);
    setEditingNotes(false);
    setNotesText(pass.operatorNotes || '');
    setNotesError('');

    setPassDownlinks([]);
    setPassDownlinkStats({ total: 0, received: 0, partial: 0, lost: 0, successRate: 0 });
    setLoadingDownlinks(true);

    api.getDownlinks({ passId: pass.passId })
      .then(dwns => setPassDownlinks(Array.isArray(dwns) ? dwns : []))
      .catch(err => console.warn('Failed to load pass downlinks:', err))
      .finally(() => setLoadingDownlinks(false));

    api.getDownlinkStats(pass.passId)
      .then(st => {
        if (st) setPassDownlinkStats(st);
      })
      .catch(err => console.warn('Failed to load pass downlink stats:', err));

    try {
      const detail = await api.getPassDetail(pass.passId);
      if (detail && Array.isArray(detail.decisions)) {
        setModalDecisions(detail.decisions);
      } else if (pass.decisions && Array.isArray(pass.decisions)) {
        setModalDecisions(pass.decisions);
      } else {
        setModalDecisions([]);
      }
      if (detail && detail.operatorNotes !== undefined) {
        setNotesText(detail.operatorNotes);
      }
    } catch (err) {
      console.warn('Failed to fetch pass detail, falling back to pass data:', err);
      setModalDecisions(pass.decisions || []);
    } finally {
      setModalLoading(false);
    }
  };

  const getPassDecisions = (pass) => {
    return Array.isArray(pass.decisions) ? pass.decisions : [];
  };

  const getItemsSent = (pass) => pass.itemsSent ?? getPassDecisions(pass).length;
  const getOverrideCount = (pass) => pass.overrideCount ?? getPassDecisions(pass).filter(d => d.isOverridden || d.wasOverride).length;
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="badge badge-blue mono">{passes.length} PASSES RECORDED</span>
            <button
              id="new-pass-btn"
              onClick={handleNewPassClick}
              disabled={isCreatingPass}
              className="btn btn-sm"
              style={{
                borderRadius: '999px',
                backgroundColor: 'var(--color-berry-rose)',
                color: 'var(--text-inverse)',
                border: '1px solid var(--color-raspberry)',
                fontWeight: 600,
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '0.25rem 0.75rem',
                gap: '0.35rem',
                cursor: isCreatingPass ? 'not-allowed' : 'pointer',
                opacity: isCreatingPass ? 0.7 : 1,
                boxShadow: '0 2px 6px rgba(138, 40, 70, 0.25)',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              <Plus size={13} strokeWidth={2.5} />
              {isCreatingPass ? 'STARTING...' : 'NEW PASS'}
            </button>
          </div>
        </div>

        {feedbackMessage && (
          <div
            style={{
              padding: '0.75rem 1.25rem',
              margin: '0.75rem 1.25rem 0',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-sans)',
              backgroundColor: feedbackMessage.type === 'success' ? 'var(--alert-success-bg)' : 'var(--alert-critical-bg)',
              color: feedbackMessage.type === 'success' ? 'var(--alert-success-text)' : 'var(--alert-critical-text)',
              border: `1px solid ${feedbackMessage.type === 'success' ? 'var(--alert-success-border)' : 'var(--alert-critical-border)'}`
            }}
          >
            <span>{feedbackMessage.text}</span>
            <button
              onClick={() => setFeedbackMessage(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <X size={15} />
            </button>
          </div>
        )}

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
                      <span>{formatPassTime(pass.createdAt, pass.startTime, pass.date)}</span>
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
                    <span className={`badge ${pass.status === 'ACTIVE' ? 'badge-green' : pass.status === 'INTERRUPTED' ? 'badge-amber' : 'badge-purple'}`}>
                      {pass.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleInspectLogs(pass)}
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
        const itemsSent = modalDecisions.length;
        const overrideCount = modalDecisions.filter(d => d.isOverridden || d.wasOverride).length;
        const overridePct = itemsSent > 0 ? Math.round((overrideCount / itemsSent) * 100) : 0;

        return (
          <div className="modal-backdrop">
            <div className="modal-content card">
              <div className="card-header">
                <span className="card-title">
                  Pass Decision Log Breakdown: {selectedPass.passId}
                </span>
                <button onClick={() => setSelectedPass(null)} className="close-btn">
                  <X size={17} />
                </button>
              </div>

              <div className="pass-summary-grid">
                <div className="pass-metric">
                  <span className="metric-label">START TIME</span>
                  <span className="metric-val mono">{formatPassTime(selectedPass.createdAt, selectedPass.startTime, selectedPass.date)}</span>
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

              {/* Received Data Section */}
              <div className="received-data-box">
                <div className="received-data-header">
                  <span className="modal-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Inbox size={15} style={{ color: 'var(--color-berry-rose)' }} />
                    Received Data ({passDownlinks.length} Downlinks)
                  </span>
                  <div className="pass-downlink-pills mono text-xs">
                    <span className="stat-pill success">
                      {passDownlinkStats.received || passDownlinks.filter(d => d.status === 'RECEIVED').length} Recv ({passDownlinkStats.successRate || (passDownlinks.length > 0 ? Math.round((passDownlinks.filter(d => d.status === 'RECEIVED').length / passDownlinks.length) * 100) : 0)}%)
                    </span>
                    <span className="stat-pill warning">
                      {passDownlinkStats.partial || passDownlinks.filter(d => d.status === 'PARTIAL').length} Partial
                    </span>
                    <span className="stat-pill critical">
                      {passDownlinkStats.lost || passDownlinks.filter(d => d.status === 'LOST').length} Lost
                    </span>
                  </div>
                </div>

                {loadingDownlinks ? (
                  <div className="strip-loading mono text-xs">
                    <Loader2 size={13} className="animate-spin" /> Fetching pass received payload records...
                  </div>
                ) : passDownlinks.length > 0 ? (
                  <div className="downlink-thumbnail-strip">
                    {passDownlinks.map((dl) => {
                      const isLost = dl.status === 'LOST';
                      const isPartial = dl.status === 'PARTIAL';
                      return (
                        <div
                          key={dl.downlinkId || dl.id}
                          onClick={() => setSelectedDownlinkDetail(dl)}
                          className={`strip-card ${isLost ? 'strip-lost' : isPartial ? 'strip-partial' : ''}`}
                          title={`Click to inspect ${dl.type} payload (${dl.status})`}
                          tabIndex={0}
                          role="button"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') setSelectedDownlinkDetail(dl);
                          }}
                        >
                          <div className="strip-thumb-viewport">
                            {isLost ? (
                              <div className="strip-placeholder lost">
                                <AlertTriangle size={15} />
                              </div>
                            ) : dl.type === 'SSTV' ? (
                              <div className="strip-sstv-box">
                                <img
                                  src={`/downlink/sstv/${dl.payload?.imageKey || 'sstv-01'}.jpg`}
                                  alt="SSTV"
                                  className="strip-img"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                                <div className="strip-placeholder sstv" style={{ display: 'none' }}>
                                  <ImageIcon size={15} />
                                </div>
                              </div>
                            ) : dl.type === 'Codec2' || dl.type === 'M17' ? (
                              <div className="strip-placeholder voice">
                                <Volume2 size={15} />
                              </div>
                            ) : (
                              <div className="strip-placeholder ttc">
                                <Cpu size={15} />
                              </div>
                            )}
                            <span className={`strip-dot dot-${(dl.status || 'received').toLowerCase()}`} />
                          </div>
                          <div className="strip-meta">
                            <span className="strip-type mono">{dl.type}</span>
                            <span className="strip-time mono">{formatPassTime(dl.createdAt, dl.timestamp)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="strip-empty mono text-xs">
                    No received data recorded for this pass.
                  </div>
                )}
              </div>

              {/* Operator Notes Section */}
              <div className="operator-notes-box">
                <div className="notes-header">
                  <span className="modal-section-title" style={{ margin: 0 }}>
                    Operator Notes
                  </span>
                  {!editingNotes ? (
                    <button
                      onClick={() => {
                        setNotesText(selectedPass.operatorNotes || '');
                        setEditingNotes(true);
                      }}
                      disabled={!backendOnline}
                      title={!backendOnline ? 'Backend offline' : ''}
                      className="btn btn-outline btn-sm edit-notes-btn"
                    >
                      <Edit3 size={13} /> Edit note
                    </button>
                  ) : null}
                </div>

                {editingNotes ? (
                  <div className="notes-edit-form">
                    <textarea
                      value={notesText}
                      onChange={(e) => {
                        if (e.target.value.length <= 500) {
                          setNotesText(e.target.value);
                          setNotesError('');
                        }
                      }}
                      placeholder="Add observations, anomaly logs, or operator notes for this ground pass (max 500 characters)..."
                      rows={3}
                      className="notes-textarea"
                    />
                    <div className="notes-edit-actions">
                      <span className="mono text-xs text-muted">
                        {notesText.length}/500
                      </span>
                      {notesError && <span className="mono text-xs text-danger">{notesError}</span>}
                      <div className="notes-buttons">
                        <button
                          onClick={() => {
                            setEditingNotes(false);
                            setNotesError('');
                          }}
                          className="btn btn-outline btn-sm"
                          disabled={notesSaving}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            if (notesText.length > 500) {
                              setNotesError('Notes cannot exceed 500 characters.');
                              return;
                            }
                            setNotesSaving(true);
                            try {
                              const updated = await api.updatePassNotes(selectedPass.passId, notesText);
                              const newNotes = updated.operatorNotes !== undefined ? updated.operatorNotes : notesText;
                              setSelectedPass(prev => ({ ...prev, operatorNotes: newNotes }));
                              selectedPass.operatorNotes = newNotes;
                              setEditingNotes(false);
                            } catch (err) {
                              setNotesError(err.message || 'Failed to save notes.');
                            } finally {
                              setNotesSaving(false);
                            }
                          }}
                          className="btn btn-primary btn-sm"
                          disabled={notesSaving}
                        >
                          {notesSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="notes-display-text text-sm">
                    {selectedPass.operatorNotes ? (
                      selectedPass.operatorNotes
                    ) : (
                      <span className="text-muted italic">No operator notes recorded for this pass.</span>
                    )}
                  </p>
                )}
              </div>

              <h4 className="modal-section-title">Decision Timeline Log</h4>
              <div className="modal-scroll-list">
                {modalLoading ? (
                  <div className="empty-decisions-notice mono text-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Loader2 size={16} className="animate-spin" />
                    Fetching pass decision logs from ground station...
                  </div>
                ) : modalDecisions.length > 0 ? (
                  <>
                      {modalDecisions.map((dec) => {
                        const isOverridden = dec.isOverridden || dec.wasOverride;
                        const itemType = dec.selectedType || dec.itemType || 'DATA';
                        const reasoning = dec.reasoning || dec.reason;
                        const displayTime = formatPassTime(dec.createdAt, dec.timestamp, selectedPass?.date);

                        return (
                          <div key={dec.id || dec.decisionId || dec._id} className={`decision-card ${isOverridden ? 'override-card' : ''}`}>
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
                              <span className="mono text-muted text-xs">{displayTime}</span>
                            </div>
                          <p className="decision-reasoning">{reasoning}</p>
                        </div>
                      );
                    })}
                    {overrideCount === 0 && (
                      <div className="auto-pass-notice mono text-xs">
                        <CheckCircle2 size={13} style={{ color: 'var(--alert-success-border)' }} />
                        All decisions were automatic, no operator overrides during this pass.
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

      {/* New Pass Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-backdrop">
          <div className="modal-content card" style={{ maxWidth: '480px' }}>
            <div className="card-header">
              <span className="card-title">
                <AlertTriangle size={16} style={{ color: 'var(--alert-warning-border)' }} />
                Confirm Active Pass Interruption
              </span>
              <button onClick={() => setShowConfirmModal(false)} className="close-btn" disabled={isCreatingPass}>
                <X size={17} />
              </button>
            </div>
            <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                An orbital ground pass (<span className="mono bold">{passes.find(p => p.status === 'ACTIVE')?.passId || 'ACTIVE'}</span>) is currently in progress.
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Initiating a new pass will mark the active pass as <strong style={{ color: 'var(--color-raspberry)' }}>INTERRUPTED</strong>, finalize its metrics, and archive all transmitted payload logs in history.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isCreatingPass}
                  className="btn btn-outline btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteNewPass}
                  disabled={isCreatingPass}
                  className="btn btn-primary btn-sm"
                  style={{
                    backgroundColor: 'var(--color-berry-rose)',
                    borderColor: 'var(--color-berry-rose)',
                    color: 'var(--text-inverse)'
                  }}
                >
                  {isCreatingPass ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Starting...
                    </>
                  ) : (
                    'Confirm & Start New Pass'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Downlink Detail Modal from Thumbnail Strip */}
      {selectedDownlinkDetail && (
        <DownlinkDetailModal
          downlink={selectedDownlinkDetail}
          onClose={() => setSelectedDownlinkDetail(null)}
        />
      )}

      <style>{`
        /* Received Data Section inside Pass History Modal */
        .received-data-box {
          background-color: #FFF9FA;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 0.85rem 1rem;
          margin-bottom: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .received-data-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .pass-downlink-pills {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .stat-pill {
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          font-size: 0.68rem;
          font-weight: 600;
          border: 1px solid var(--border-color);
          background-color: #FFFFFF;
          color: var(--text-primary);
        }

        .stat-pill.success {
          background-color: var(--alert-success-bg);
          color: var(--alert-success-text);
          border-color: var(--alert-success-border);
        }

        .stat-pill.warning {
          background-color: var(--alert-warning-bg);
          color: var(--alert-warning-text);
          border-color: var(--alert-warning-border);
        }

        .stat-pill.critical {
          background-color: var(--alert-critical-bg);
          color: var(--alert-critical-text);
          border-color: var(--alert-critical-border);
        }

        .downlink-thumbnail-strip {
          display: flex;
          gap: 0.65rem;
          overflow-x: auto;
          padding-bottom: 0.35rem;
        }

        .strip-card {
          min-width: 96px;
          width: 96px;
          background: #FFFFFF;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.45rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .strip-card:hover {
          transform: translateY(-2px);
          border-color: var(--color-berry-rose);
          box-shadow: 0 4px 10px rgba(96, 36, 55, 0.1);
        }

        .strip-card.strip-lost {
          background-color: #FFF5F6;
          border-color: var(--alert-critical-border);
        }

        .strip-thumb-viewport {
          position: relative;
          width: 100%;
          height: 52px;
          background: #18080E;
          border-radius: 6px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .strip-sstv-box {
          width: 100%;
          height: 100%;
        }

        .strip-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .strip-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .strip-placeholder.sstv {
          background: linear-gradient(135deg, #2B0F18, #602437);
          color: var(--color-soft-blush);
        }

        .strip-placeholder.voice {
          background: #FFF0F3;
          color: var(--color-berry-rose);
        }

        .strip-placeholder.ttc {
          background: #FFF5F7;
          color: var(--color-raspberry);
        }

        .strip-placeholder.lost {
          background: #FFF0F2;
          color: var(--alert-critical-border);
        }

        .strip-dot {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .dot-received {
          background-color: var(--alert-success-border);
          box-shadow: 0 0 4px var(--alert-success-border);
        }

        .dot-partial {
          background-color: var(--alert-warning-border);
        }

        .dot-lost {
          background-color: var(--alert-critical-border);
        }

        .strip-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .strip-type {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--color-berry-rose);
        }

        .strip-time {
          font-size: 0.62rem;
          color: var(--text-muted);
        }

        .strip-loading, .strip-empty {
          padding: 0.8rem;
          text-align: center;
          color: var(--text-muted);
          background: #FFFFFF;
          border-radius: 8px;
          border: 1px dashed var(--border-color);
        }

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

        .operator-notes-box {
          background-color: #FFF9FA;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 0.8rem 1rem;
          margin-bottom: 1rem;
        }

        .notes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.4rem;
        }

        .edit-notes-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.25rem 0.6rem;
          font-size: 0.75rem;
        }

        .notes-display-text {
          font-size: 0.85rem;
          color: var(--text-primary);
          line-height: 1.4;
          margin: 0;
        }

        .notes-edit-form {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .notes-textarea {
          width: 100%;
          padding: 0.6rem 0.8rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background-color: #ffffff;
          font-size: 0.85rem;
          color: var(--text-primary);
          resize: vertical;
          font-family: inherit;
          box-sizing: border-box;
        }

        .notes-textarea:focus {
          outline: none;
          border-color: var(--color-berry-rose);
        }

        .notes-edit-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notes-buttons {
          display: flex;
          gap: 0.5rem;
        }
      `}</style>
    </PageContainer>
  );
};
