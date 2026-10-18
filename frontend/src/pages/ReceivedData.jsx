import React, { useState, useEffect, useRef } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { useTelemetry } from '../context/TelemetryContext';
import { api } from '../api/client';
import { DownlinkDetailModal } from '../components/downlink/DownlinkDetailModal';
import {
  Inbox,
  Filter,
  RefreshCw,
  Image as ImageIcon,
  Volume2,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Play,
  BatteryCharging,
  Thermometer,
  Radio,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';

export const ReceivedData = () => {
  const { telemetry } = useTelemetry();
  const currentPassId = telemetry?.currentPassId || 'PASS-LIVE';

  // Scope: 'current' | 'all'
  const [scope, setScope] = useState('current');
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'SSTV' | 'VOICE' | 'TTC' | 'LOST'
  const [downlinks, setDownlinks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    received: 0,
    partial: 0,
    lost: 0,
    successRate: 0,
    retransmits: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedDownlink, setSelectedDownlink] = useState(null);

  const fetchDownlinksData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const passParam = scope === 'current' ? currentPassId : undefined;

      const [items, statsData] = await Promise.all([
        api.getDownlinks({ passId: passParam, limit: 100 }),
        api.getDownlinkStats(passParam)
      ]);

      const safeItems = Array.isArray(items) ? items : [];
      setDownlinks(safeItems);

      // Retransmits count: from backend stats or calculated from downlinks
      const retransmitsCount = statsData?.retransmits !== undefined
        ? statsData.retransmits
        : safeItems.filter(d => Boolean(d.isRetransmit)).length;

      setStats({
        total: statsData?.total ?? safeItems.length,
        received: statsData?.received ?? safeItems.filter(d => d.status === 'RECEIVED').length,
        partial: statsData?.partial ?? safeItems.filter(d => d.status === 'PARTIAL').length,
        lost: statsData?.lost ?? safeItems.filter(d => d.status === 'LOST').length,
        successRate: statsData?.successRate ?? (safeItems.length > 0
          ? Math.round((safeItems.filter(d => d.status === 'RECEIVED').length / safeItems.length) * 100)
          : 0),
        retransmits: retransmitsCount
      });
    } catch (err) {
      console.warn('[ReceivedData] Error fetching downlinks:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDownlinksData(true);
    const interval = setInterval(() => {
      fetchDownlinksData(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [scope, currentPassId]);

  // Filter logic
  const filteredDownlinks = downlinks.filter((d) => {
    if (filterTab === 'ALL') return true;
    if (filterTab === 'SSTV') return d.type === 'SSTV';
    if (filterTab === 'VOICE') return d.type === 'Codec2' || d.type === 'M17';
    if (filterTab === 'TTC') return d.type === 'TTC';
    if (filterTab === 'LOST') return d.status === 'LOST';
    return true;
  });

  const formatCardTime = (dateOrStr) => {
    if (!dateOrStr) return '';
    const d = new Date(dateOrStr);
    if (isNaN(d.getTime())) return String(dateOrStr);
    return d.toLocaleTimeString('en-GB', { hour12: false });
  };

  return (
    <PageContainer
      title="RECEIVED DATA ARCHIVE"
      subtitle="Demodulated payload stream from SomaiyaSat: SSTV images, digital speech frames, and TT&C telemetry"
      actions={
        <div className="scope-toggle-group">
          <button
            onClick={() => setScope('current')}
            className={`scope-btn ${scope === 'current' ? 'active' : ''}`}
          >
            Current Pass ({currentPassId})
          </button>
          <button
            onClick={() => setScope('all')}
            className={`scope-btn ${scope === 'all' ? 'active' : ''}`}
          >
            All Passes
          </button>
        </div>
      }
    >
      {/* Top Stat Row */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">TOTAL DOWNLINKS</span>
            <Inbox size={15} className="stat-icon" />
          </div>
          <div className="stat-value-group">
            <span className="stat-num mono">{stats.total}</span>
            <span className="stat-sub mono">
              {scope === 'current' ? 'Current Pass' : 'Historical Total'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">RECEIVED RATE</span>
            <CheckCircle2 size={15} style={{ color: 'var(--alert-success-border)' }} />
          </div>
          <div className="stat-value-group">
            <span className="stat-num mono" style={{ color: 'var(--alert-success-text)' }}>
              {stats.successRate}%
            </span>
            <span className="stat-sub mono">
              {stats.received} fully demodulated
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">PARTIAL FRAMES</span>
            <AlertCircle size={15} style={{ color: 'var(--alert-warning-border)' }} />
          </div>
          <div className="stat-value-group">
            <span className="stat-num mono" style={{ color: 'var(--alert-warning-border)' }}>
              {stats.partial}
            </span>
            <span className="stat-sub mono">
              Degraded link fragments
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">PACKETS LOST</span>
            <XCircle size={15} style={{ color: 'var(--alert-critical-border)' }} />
          </div>
          <div className="stat-value-group">
            <span className="stat-num mono" style={{ color: 'var(--alert-critical-border)' }}>
              {stats.lost}
            </span>
            <span className="stat-sub mono">
              Demodulation failure
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">RETRANSMITS</span>
            <RefreshCw size={15} style={{ color: 'var(--color-raspberry)' }} />
          </div>
          <div className="stat-value-group">
            <span className="stat-num mono" style={{ color: 'var(--color-berry-rose)' }}>
              {stats.retransmits}
            </span>
            <span className="stat-sub mono">
              Recovered from loss
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="controls-bar card">
        <div className="filter-tabs">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`filter-tab ${filterTab === 'ALL' ? 'active' : ''}`}
          >
            All Payload Types ({downlinks.length})
          </button>
          <button
            onClick={() => setFilterTab('SSTV')}
            className={`filter-tab ${filterTab === 'SSTV' ? 'active' : ''}`}
          >
            <ImageIcon size={14} />
            SSTV Images ({downlinks.filter(d => d.type === 'SSTV').length})
          </button>
          <button
            onClick={() => setFilterTab('VOICE')}
            className={`filter-tab ${filterTab === 'VOICE' ? 'active' : ''}`}
          >
            <Volume2 size={14} />
            Voice Frames ({downlinks.filter(d => d.type === 'Codec2' || d.type === 'M17').length})
          </button>
          <button
            onClick={() => setFilterTab('TTC')}
            className={`filter-tab ${filterTab === 'TTC' ? 'active' : ''}`}
          >
            <Cpu size={14} />
            Telemetry TT&C ({downlinks.filter(d => d.type === 'TTC').length})
          </button>
          <button
            onClick={() => setFilterTab('LOST')}
            className={`filter-tab ${filterTab === 'LOST' ? 'active' : ''}`}
          >
            <AlertTriangle size={14} />
            Lost ({downlinks.filter(d => d.status === 'LOST').length})
          </button>
        </div>

        <div className="auto-refresh-badge mono">
          <span className="pulse-dot" />
          5s AUTO-REFRESH
        </div>
      </div>

      {/* Gallery Grid */}
      {filteredDownlinks.length === 0 ? (
        <div className="empty-state-card card">
          <div className="empty-icon-circle">
            <Inbox size={42} strokeWidth={1.5} />
          </div>
          <h4 className="empty-title">No data received yet</h4>
          <p className="empty-desc">
            Data appears once the satellite is operational and transmitting. Ground station SOMAIYA-GS1 is listening on 437.500 MHz.
          </p>
          <div className="empty-meta mono">
            <span>Pass: {currentPassId}</span>
            <span>•</span>
            <span>Link Quality: {telemetry?.linkQuality || 0}%</span>
          </div>
        </div>
      ) : (
        <div className="gallery-grid">
          {filteredDownlinks.map((d) => {
            const isLost = d.status === 'LOST';
            const isPartial = d.status === 'PARTIAL';
            const isReceived = d.status === 'RECEIVED';

            return (
              <div
                key={d.downlinkId || d.id || d._id}
                onClick={() => setSelectedDownlink(d)}
                className={`gallery-card card ${isLost ? 'card-lost' : ''}`}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedDownlink(d);
                }}
              >
                {/* Card Header */}
                <div className="card-top-row">
                  <div className="type-badge-group">
                    <span className={`badge ${
                      d.type === 'TTC' ? 'badge-blue' :
                      d.type === 'SSTV' ? 'badge-purple' :
                      'badge-rose'
                    } mono`}>
                      {d.type}
                    </span>
                    {d.isRetransmit && (
                      <span className="badge badge-amber mono" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                        RETRY
                      </span>
                    )}
                  </div>

                  <div className="card-top-right">
                    {isReceived && (
                      <span className="status-chip chip-green mono">✓ Received</span>
                    )}
                    {isPartial && (
                      <span className="status-chip chip-amber mono">◐ Partial</span>
                    )}
                    {isLost && (
                      <span className="status-chip chip-red mono">✕ Lost</span>
                    )}
                    <span className="card-time mono">{formatCardTime(d.createdAt)}</span>
                  </div>
                </div>

                {/* Card Body by Type */}
                {isLost ? (
                  /* LOST card */
                  <div className="lost-card-body">
                    <div className="lost-card-icon">
                      <AlertTriangle size={26} />
                    </div>
                    <div className="lost-card-details">
                      <span className="lost-title">Packet lost, re-queued</span>
                      <span className="lost-sub mono">
                        Demod SNR dropped • {d.sizeKb} KB
                      </span>
                    </div>
                  </div>
                ) : d.type === 'SSTV' ? (
                  /* SSTV card */
                  <div className="sstv-card-body">
                    <div className="sstv-thumb-viewport">
                      <img
                        src={`/downlink/sstv/${d.payload?.imageKey || 'sstv-01'}.jpg`}
                        alt={d.payload?.caption || 'SSTV frame'}
                        className="sstv-thumb-img"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="sstv-thumb-fallback" style={{ display: 'none' }}>
                        <ImageIcon size={24} />
                        <span className="mono text-xs">SSTV FRAME</span>
                      </div>
                      <div className="thumb-scanline-overlay" />
                    </div>
                    <p className="sstv-card-caption">
                      {d.payload?.caption || d.label}
                    </p>
                  </div>
                ) : d.type === 'Codec2' || d.type === 'M17' ? (
                  /* Voice card */
                  <div className="voice-card-body">
                    <div className="voice-preview-box">
                      <div className="voice-wave-icon">
                        <Volume2 size={20} />
                      </div>
                      <div className="voice-wave-bars">
                        <span className="wave-bar bar-1" />
                        <span className="wave-bar bar-2" />
                        <span className="wave-bar bar-3" />
                        <span className="wave-bar bar-4" />
                        <span className="wave-bar bar-2" />
                      </div>
                    </div>
                    <p className="voice-transcript-snippet">
                      “{d.payload?.transcript
                        ? (d.payload.transcript.length > 55
                            ? d.payload.transcript.slice(0, 55) + '...'
                            : d.payload.transcript)
                        : 'SomaiyaSat beacon voice audio...'}”
                    </p>
                    <div className="voice-play-hint">
                      <Play size={12} fill="currentColor" />
                      <span>{d.payload?.durationSec ? `${d.payload.durationSec}s audio` : 'Click to inspect & play'}</span>
                    </div>
                  </div>
                ) : (
                  /* TT&C card */
                  <div className="ttc-card-body">
                    <div className="ttc-metrics-row">
                      <div className="ttc-metric">
                        <div className="ttc-metric-lbl">
                          <BatteryCharging size={12} />
                          BATT
                        </div>
                        <span className="ttc-metric-val mono">
                          {d.payload?.batteryPercent !== undefined
                            ? `${d.payload.batteryPercent.toFixed(0)}%`
                            : '--'}
                        </span>
                      </div>

                      <div className="ttc-metric">
                        <div className="ttc-metric-lbl">
                          <Thermometer size={12} />
                          TEMP
                        </div>
                        <span className="ttc-metric-val mono">
                          {d.payload?.boardTempC !== undefined
                            ? `${d.payload.boardTempC.toFixed(1)}°C`
                            : '--'}
                        </span>
                      </div>

                      <div className="ttc-metric">
                        <div className="ttc-metric-lbl">
                          <Radio size={12} />
                          RSSI
                        </div>
                        <span className="ttc-metric-val mono">
                          {d.payload?.rssiDbm !== undefined
                            ? `${d.payload.rssiDbm} dBm`
                            : '--'}
                        </span>
                      </div>
                    </div>
                    <div className="ttc-footer-note mono">
                      <span>Mode: {d.payload?.mode || 'NOMINAL'}</span>
                      <span>•</span>
                      <span>{d.sizeKb} KB</span>
                    </div>
                  </div>
                )}

                {/* Card Footer */}
                <div className="card-footer-meta mono">
                  <span>ID: {d.downlinkId || d.id}</span>
                  <span className="inspect-link">Inspect Data →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedDownlink && (
        <DownlinkDetailModal
          downlink={selectedDownlink}
          onClose={() => setSelectedDownlink(null)}
        />
      )}

      <style>{`
        .scope-toggle-group {
          display: flex;
          background-color: rgba(255, 202, 212, 0.15);
          border: 1px solid rgba(255, 202, 212, 0.3);
          border-radius: 999px;
          padding: 0.2rem;
        }

        .scope-btn {
          background: transparent;
          border: none;
          color: var(--color-soft-blush);
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.4rem 0.9rem;
          border-radius: 999px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .scope-btn.active {
          background-color: var(--color-berry-rose);
          color: var(--text-inverse);
          box-shadow: 0 2px 8px rgba(138, 40, 70, 0.3);
        }

        /* Stat Row */
        .stat-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .stat-card {
          background-color: var(--bg-card);
          border: 1px solid var(--border-color);
          border-left: 4px solid var(--color-berry-rose);
          border-radius: 14px;
          padding: 1rem 1.15rem;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          transition: transform 0.2s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-label {
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .stat-icon {
          color: var(--color-raspberry);
        }

        .stat-value-group {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .stat-num {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.1;
        }

        .stat-sub {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        /* Controls / Filter Bar */
        .controls-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1.25rem;
          border-left: 4px solid var(--color-raspberry);
          margin-bottom: 1.25rem;
        }

        .filter-tabs {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .filter-tab {
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 0.4rem 0.85rem;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          transition: all 0.2s ease;
        }

        .filter-tab:hover {
          background-color: #FFF0F3;
          border-color: var(--color-raspberry);
        }

        .filter-tab.active {
          background-color: var(--color-berry-rose);
          color: var(--text-inverse);
          border-color: var(--color-berry-rose);
          box-shadow: 0 2px 6px rgba(138, 40, 70, 0.25);
        }

        .auto-refresh-badge {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--color-berry-rose);
          background-color: #FFF5F7;
          border: 1px solid var(--border-color);
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
        }

        .pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: var(--alert-success-border);
          box-shadow: 0 0 6px var(--alert-success-border);
          animation: pulse-green 1.8s infinite;
        }

        /* Gallery Grid */
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 1.15rem;
        }

        .gallery-card {
          border-radius: 14px;
          padding: 1.1rem;
          cursor: pointer;
          border-left: 4px solid var(--color-rose-pink);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          animation: cardFadeIn 0.35s ease forwards;
          transition: all 0.2s ease;
        }

        .gallery-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(96, 36, 55, 0.12);
          border-color: var(--color-raspberry);
        }

        .gallery-card.card-lost {
          background-color: #FAF5F6;
          border-left-color: var(--alert-critical-border);
          opacity: 0.85;
        }

        .gallery-card.card-lost:hover {
          opacity: 1;
        }

        @keyframes cardFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .type-badge-group {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .card-top-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-chip {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.15rem 0.45rem;
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

        .card-time {
          font-size: 0.72rem;
          color: var(--text-muted);
        }

        /* SSTV Card Body */
        .sstv-card-body {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .sstv-thumb-viewport {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 10;
          background: #18080E;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }

        .sstv-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .sstv-thumb-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          background: linear-gradient(135deg, #2B0F18, #602437);
          color: var(--color-soft-blush);
        }

        .thumb-scanline-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%);
          background-size: 100% 4px;
          pointer-events: none;
        }

        .sstv-card-caption {
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Voice Card Body */
        .voice-card-body {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          background-color: #FFF8F9;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.75rem;
        }

        .voice-preview-box {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .voice-wave-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background-color: var(--color-soft-blush);
          color: var(--color-berry-rose);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .voice-wave-bars {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 20px;
        }

        .wave-bar {
          width: 3px;
          background-color: var(--color-raspberry);
          border-radius: 2px;
        }

        .bar-1 { height: 8px; }
        .bar-2 { height: 16px; }
        .bar-3 { height: 12px; }
        .bar-4 { height: 18px; }

        .voice-transcript-snippet {
          font-size: 0.82rem;
          color: var(--text-primary);
          font-style: italic;
          line-height: 1.35;
        }

        .voice-play-hint {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--color-berry-rose);
        }

        /* TT&C Card Body */
        .ttc-card-body {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .ttc-metrics-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.4rem;
        }

        .ttc-metric {
          background-color: #FFF5F7;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.5rem 0.4rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.15rem;
        }

        .ttc-metric-lbl {
          font-size: 0.62rem;
          font-weight: 700;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 0.2rem;
        }

        .ttc-metric-val {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .ttc-footer-note {
          display: flex;
          justify-content: space-between;
          font-size: 0.68rem;
          color: var(--text-muted);
        }

        /* LOST Card Body */
        .lost-card-body {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          background-color: #FFF0F2;
          border: 1px dashed var(--alert-critical-border);
          border-radius: 8px;
          padding: 1rem 0.85rem;
        }

        .lost-card-icon {
          color: var(--alert-critical-border);
        }

        .lost-card-details {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .lost-title {
          font-size: 0.84rem;
          font-weight: 700;
          color: var(--alert-critical-text);
        }

        .lost-sub {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        /* Card Footer */
        .card-footer-meta {
          border-top: 1px solid var(--border-color);
          padding-top: 0.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .inspect-link {
          color: var(--color-berry-rose);
          font-weight: 600;
        }

        /* Empty State */
        .empty-state-card {
          padding: 3.5rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.85rem;
          border-left: 4px solid var(--color-soft-blush);
        }

        .empty-icon-circle {
          width: 76px;
          height: 76px;
          border-radius: 50%;
          background-color: var(--color-soft-blush);
          color: var(--color-berry-rose);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 0.5rem;
        }

        .empty-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .empty-desc {
          max-width: 520px;
          font-size: 0.88rem;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .empty-meta {
          margin-top: 0.5rem;
          display: flex;
          gap: 0.75rem;
          font-size: 0.75rem;
          color: var(--color-raspberry);
        }

        @media (max-width: 900px) {
          .stat-row {
            grid-template-columns: repeat(2, 1fr);
          }
          .controls-bar {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
        }

        @media (max-width: 640px) {
          .stat-row {
            grid-template-columns: 1fr;
          }
          .gallery-grid {
            grid-template-columns: 1fr;
          }
          .filter-tabs {
            flex-direction: column;
            width: 100%;
          }
          .filter-tab {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </PageContainer>
  );
};

export default ReceivedData;
