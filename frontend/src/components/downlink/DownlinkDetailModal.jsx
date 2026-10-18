import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Radio,
  Send,
  Clock,
  Database,
  Image as ImageIcon,
  Volume2,
  Activity,
  Layers,
  RefreshCw,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { TtcHealthCard } from './TtcHealthCard';

export const DownlinkDetailModal = ({ downlink, onClose }) => {
  const [imageError, setImageError] = useState(false);

  // Lock background scrolling while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!downlink) return null;

  const {
    downlinkId = 'DWN-UNKNOWN',
    decisionId = 'DEC-UNKNOWN',
    passId = 'PASS-LIVE',
    type = 'TTC',
    label = 'Payload Downlink',
    sizeKb = 0,
    status = 'RECEIVED',
    linkQualityAtSend = 80,
    ackReceived = true,
    ackLatencyMs = 240,
    payload = {},
    isRetransmit = false,
    createdAt
  } = downlink;

  const formatLocalTime = (isoOrDate) => {
    if (!isoOrDate) return 'Just now';
    const d = new Date(isoOrDate);
    if (isNaN(d.getTime())) return String(isoOrDate);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const isLost = status === 'LOST';
  const isPartial = status === 'PARTIAL';
  const isReceived = status === 'RECEIVED';

  const modalElement = (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal-content card downlink-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="downlink-modal-title"
        tabIndex={-1}
      >
        {/* Modal Header */}
        <div className="card-header downlink-modal-header">
          <div className="header-left">
            <span className={`badge ${
              type === 'TTC' ? 'badge-blue' :
              type === 'SSTV' ? 'badge-purple' :
              'badge-rose'
            } mono`}>
              {type}
            </span>
            <div className="title-area">
              <h3 id="downlink-modal-title" className="modal-title">{label}</h3>
              <div className="header-meta mono">
                <span>ID: {downlinkId}</span>
                <span>•</span>
                <span>Pass: {passId}</span>
                <span>•</span>
                <span>{formatLocalTime(createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="header-right">
            {isReceived && (
              <span className="badge badge-green mono">
                <CheckCircle2 size={13} /> RECEIVED
              </span>
            )}
            {isPartial && (
              <span className="badge badge-amber mono">
                <AlertCircle size={13} /> PARTIAL
              </span>
            )}
            {isLost && (
              <span className="badge badge-red mono">
                <XCircle size={13} /> LOST
              </span>
            )}
            {isRetransmit && (
              <span className="badge badge-amber mono" title="Packet was re-queued from a previous loss">
                <RefreshCw size={11} /> RETRANSMIT
              </span>
            )}
            <button
              onClick={onClose}
              className="modal-close-btn"
              title="Close modal (Esc)"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="downlink-modal-body">
          {/* Transmission Timeline */}
          <div className="timeline-section">
            <h4 className="section-title">
              <Activity size={15} />
              Transmission Timeline
            </h4>
            
            <div className="timeline-steps">
              {/* Step 1: Command Sent */}
              <div className="timeline-step step-success">
                <div className="step-icon-box">
                  <Send size={15} />
                </div>
                <div className="step-info">
                  <span className="step-title">1. Command Sent</span>
                  <span className="step-meta mono">UHF Ground Station</span>
                </div>
              </div>

              {/* Connector 1-2 */}
              <div className={`step-connector ${isLost && !ackReceived ? 'connector-failed' : 'connector-success'}`} />

              {/* Step 2: ACK Received */}
              <div className={`timeline-step ${ackReceived ? 'step-success' : 'step-failed'}`}>
                <div className="step-icon-box">
                  {ackReceived ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                </div>
                <div className="step-info">
                  <span className="step-title">
                    {ackReceived ? '2. ACK Received' : '2. No ACK Received'}
                  </span>
                  <span className="step-meta mono">
                    {ackReceived
                      ? `${ackLatencyMs ?? 240} ms latency`
                      : 'Carrier timeout (LOST)'}
                  </span>
                </div>
              </div>

              {/* Connector 2-3 */}
              <div className={`step-connector ${
                isLost ? 'connector-failed' :
                isPartial ? 'connector-warning' :
                'connector-success'
              }`} />

              {/* Step 3: Data Received / Partial / Lost */}
              <div className={`timeline-step ${
                isReceived ? 'step-success' :
                isPartial ? 'step-warning' :
                'step-failed'
              }`}>
                <div className="step-icon-box">
                  {isReceived && <CheckCircle2 size={15} />}
                  {isPartial && <AlertCircle size={15} />}
                  {isLost && <XCircle size={15} />}
                </div>
                <div className="step-info">
                  <span className="step-title">
                    {isReceived && '3. Data Received'}
                    {isPartial && '3. Partial Data'}
                    {isLost && '3. Transmission Lost'}
                  </span>
                  <span className="step-meta mono">
                    {isReceived && `${sizeKb} KB • 100% OK`}
                    {isPartial && `${Math.round(sizeKb * 0.6)}/${sizeKb} KB frame`}
                    {isLost && 'Packet re-queued'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="metrics-strip">
            <div className="metric-pill">
              <span className="pill-label">Payload Size</span>
              <span className="pill-val mono">{sizeKb} KB</span>
            </div>
            <div className="metric-pill">
              <span className="pill-label">Link Quality at Send</span>
              <span className="pill-val mono">{linkQualityAtSend}% SNR</span>
            </div>
            <div className="metric-pill">
              <span className="pill-label">Round-trip ACK</span>
              <span className="pill-val mono">{ackReceived ? `${ackLatencyMs || 240} ms` : 'None'}</span>
            </div>
            <div className="metric-pill">
              <span className="pill-label">Source Decision</span>
              <span className="pill-val mono">{decisionId}</span>
            </div>
          </div>

          {/* Body by Type */}
          <div className="payload-render-section">
            <h4 className="section-title">
              <Database size={15} />
              Received Payload Inspection
            </h4>

            {/* LOST State */}
            {isLost ? (
              <div className="lost-payload-notice">
                <div className="lost-icon-wrapper">
                  <AlertTriangle size={36} />
                </div>
                <div className="lost-text-wrapper">
                  <h5>No data received. Packet re-queued for retransmission.</h5>
                  <p>
                    Ground station link quality dropped below the demodulation threshold
                    ({linkQualityAtSend}% SNR). The orbital packet scheduler has re-inserted
                    this transmission into the queue with high starvation priority.
                  </p>
                  <div className="lost-tags">
                    <span className="badge badge-red mono">PACKET DROPPED</span>
                    <span className="badge badge-amber mono">AUTO-RETRY QUEUED</span>
                  </div>
                </div>
              </div>
            ) : type === 'SSTV' ? (
              /* SSTV Payload */
              <div className="sstv-display-card">
                {/* TODO: Swap in <SstvImage /> from '../downlink/SstvImage' when available */}
                <div className="sstv-viewport-wrapper">
                  {!imageError ? (
                    <div className="sstv-img-container">
                      <img
                        src={`/downlink/sstv/${payload.imageKey || 'sstv-01'}.jpg`}
                        alt={payload.caption || 'SSTV Frame'}
                        className="sstv-image"
                        onError={() => setImageError(true)}
                      />
                      <div className="scanline-overlay" />
                      <div className="sstv-hud">
                        <span className="hud-badge mono">SSTV {payload.mode || 'Martin M1'}</span>
                        <span className="hud-badge mono">{payload.resolution || '320x256'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="sstv-placeholder">
                      <div className="placeholder-watermark">
                        <ImageIcon size={48} />
                        <span className="placeholder-title">IMAGE FRAME DEMODULATED</span>
                        <span className="placeholder-sub mono">
                          Key: {payload.imageKey || 'sstv-frame'} • Mode: {payload.mode || 'Martin M1'}
                        </span>
                      </div>
                      <div className="scanline-overlay" />
                    </div>
                  )}
                </div>

                <div className="sstv-meta-card">
                  <div className="sstv-caption">
                    <span className="caption-label">FRAME CAPTION</span>
                    <p className="caption-text">
                      "{payload.caption || 'Earth limb over the Indian Ocean with visible cloud formation'}"
                    </p>
                  </div>

                  <div className="sstv-tech-grid">
                    <div className="tech-stat">
                      <span className="tech-stat-label">Encoding Mode</span>
                      <span className="tech-stat-val mono">{payload.mode || 'Martin M1'}</span>
                    </div>
                    <div className="tech-stat">
                      <span className="tech-stat-label">Resolution</span>
                      <span className="tech-stat-val mono">{payload.resolution || '320x256'} px</span>
                    </div>
                    <div className="tech-stat">
                      <span className="tech-stat-label">Demod Quality</span>
                      <span className="tech-stat-val mono">
                        {payload.quality ?? linkQualityAtSend ?? 85}%
                      </span>
                    </div>
                    <div className="tech-stat">
                      <span className="tech-stat-label">Scan Status</span>
                      <span className="tech-stat-val mono">
                        {isPartial ? 'PARTIAL SCAN' : 'SYNC LOCKED'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : type === 'Codec2' || type === 'M17' ? (
              /* Voice Payload */
              <div className="voice-display-card">
                {/* TODO: Swap in <VoicePlayer /> from '../downlink/VoicePlayer' when available */}
                <div className="voice-audio-box">
                  <div className="audio-header">
                    <div className="audio-icon-pulse">
                      <Volume2 size={24} style={{ color: 'var(--color-berry-rose)' }} />
                    </div>
                    <div>
                      <h5 className="audio-title">
                        {type === 'Codec2' ? 'Codec2 Digital Speech Audio' : 'M17 Protocol Voice Stream'}
                      </h5>
                      <span className="audio-subtitle mono">
                        Asset: {payload.audioKey || 'voice-sample'}.mp3
                      </span>
                    </div>
                  </div>

                  <div className="audio-player-wrapper">
                    <audio
                      controls
                      src={`/downlink/voice/${payload.audioKey || 'voice-01'}.mp3`}
                      className="native-audio-player"
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                </div>

                <div className="voice-transcript-card">
                  <span className="transcript-label">AUDIO TRANSCRIPT</span>
                  <blockquote className="transcript-quote">
                    “{payload.transcript || 'SomaiyaSat, telemetry nominal. Ground station link confirmed.'}”
                  </blockquote>

                  <div className="voice-tech-stats">
                    <div className="tech-stat">
                      <span className="tech-stat-label">Codec Bitrate</span>
                      <span className="tech-stat-val mono">{payload.bitrate || '3200 bps'}</span>
                    </div>
                    <div className="tech-stat">
                      <span className="tech-stat-label">Duration</span>
                      <span className="tech-stat-val mono">{payload.durationSec || 6} seconds</span>
                    </div>
                    <div className="tech-stat">
                      <span className="tech-stat-label">Encoding Protocol</span>
                      <span className="tech-stat-val mono">{type}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* TT&C Payload */
              <div className="ttc-payload-wrapper">
                <TtcHealthCard payload={payload} />
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="footer-left mono text-muted text-xs">
            <span>Ground Station: SOMAIYA-GS1 (437.500 MHz)</span>
          </div>
          <button onClick={onClose} className="btn btn-outline btn-sm">
            Close Inspector
          </button>
        </div>

        <style>{`
          .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(30, 7, 43, 0.78);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            padding: 1.5rem;
            box-sizing: border-box;
            overflow: hidden;
            animation: modalBackdropFadeIn 0.2s ease-out forwards;
          }

          @keyframes modalBackdropFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .modal-backdrop .downlink-modal {
            max-width: 1080px;
            width: 94vw;
            max-height: 88vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            padding: 0;
            background: #FFFFFF;
            border: 1px solid var(--border-color, #F1D3DA);
            border-radius: 16px;
            box-shadow: 0 20px 50px rgba(43, 15, 24, 0.45);
            margin: auto;
            animation: modalDialogSlideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }

          @keyframes modalDialogSlideUp {
            from {
              opacity: 0;
              transform: translateY(16px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          .downlink-modal-header {
            margin: 0;
            padding: 1.1rem 1.6rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, var(--color-deep-plum, #602437), var(--color-berry-rose, #8A2846));
            border-bottom: 1px solid rgba(255, 202, 212, 0.2);
            flex-shrink: 0;
          }

          .header-left {
            display: flex;
            align-items: center;
            gap: 0.85rem;
          }

          .title-area {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
          }

          .modal-title {
            font-size: 1.05rem;
            font-weight: 700;
            color: var(--text-inverse);
            margin: 0;
          }

          .header-meta {
            font-size: 0.72rem;
            color: var(--color-soft-blush);
            display: flex;
            gap: 0.5rem;
          }

          .header-right {
            display: flex;
            align-items: center;
            gap: 0.6rem;
          }

          .modal-close-btn {
            background: rgba(255, 255, 255, 0.12);
            border: 1px solid rgba(255, 202, 212, 0.3);
            color: var(--text-inverse);
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .modal-close-btn:hover {
            background: rgba(255, 255, 255, 0.25);
            transform: scale(1.05);
          }

          .downlink-modal-body {
            padding: 1.25rem 1.4rem;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
            background-color: #FFFFFF;
            flex: 1;
            min-height: 0;
          }

          .section-title {
            font-size: 0.82rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--color-berry-rose);
            display: flex;
            align-items: center;
            gap: 0.45rem;
            margin-bottom: 0.75rem;
          }

          /* Timeline */
          .timeline-section {
            background-color: #FFF9FA;
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 1rem 1.15rem;
          }

          .timeline-steps {
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
          }

          .timeline-step {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            z-index: 2;
          }

          .step-icon-box {
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid transparent;
            transition: all 0.2s ease;
          }

          .step-info {
            display: flex;
            flex-direction: column;
          }

          .step-title {
            font-size: 0.82rem;
            font-weight: 700;
            color: var(--text-primary);
          }

          .step-meta {
            font-size: 0.68rem;
            color: var(--text-muted);
          }

          .step-success .step-icon-box {
            background-color: var(--alert-success-bg);
            border-color: var(--alert-success-border);
            color: var(--alert-success-text);
          }

          .step-warning .step-icon-box {
            background-color: var(--alert-warning-bg);
            border-color: var(--alert-warning-border);
            color: var(--alert-warning-text);
          }

          .step-failed .step-icon-box {
            background-color: var(--alert-critical-bg);
            border-color: var(--alert-critical-border);
            color: var(--alert-critical-text);
          }

          .step-connector {
            flex: 1;
            height: 3px;
            margin: 0 0.75rem;
            border-radius: 2px;
            background-color: var(--border-color);
          }

          .connector-success {
            background-color: var(--alert-success-border);
          }

          .connector-warning {
            background-color: var(--alert-warning-border);
          }

          .connector-failed {
            background-color: var(--alert-critical-border);
          }

          /* Metrics Strip */
          .metrics-strip {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0.6rem;
          }

          .metric-pill {
            background-color: #FFF5F7;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 0.6rem 0.8rem;
            display: flex;
            flex-direction: column;
            gap: 0.15rem;
          }

          .pill-label {
            font-size: 0.68rem;
            color: var(--text-muted);
            text-transform: uppercase;
            font-weight: 600;
          }

          .pill-val {
            font-size: 0.92rem;
            font-weight: 700;
            color: var(--color-berry-rose);
          }

          /* LOST Notice */
          .lost-payload-notice {
            display: flex;
            gap: 1.25rem;
            align-items: flex-start;
            background-color: #FFF5F5;
            border: 1px solid var(--alert-critical-border);
            border-radius: 12px;
            padding: 1.25rem;
          }

          .lost-icon-wrapper {
            color: var(--alert-critical-border);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .lost-text-wrapper h5 {
            color: var(--alert-critical-text);
            font-size: 0.95rem;
            font-weight: 700;
            margin-bottom: 0.4rem;
          }

          .lost-text-wrapper p {
            font-size: 0.82rem;
            color: var(--text-primary);
            line-height: 1.45;
            margin-bottom: 0.75rem;
          }

          .lost-tags {
            display: flex;
            gap: 0.5rem;
          }

          /* SSTV Viewport */
          .sstv-display-card {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .sstv-viewport-wrapper {
            position: relative;
            background: #15060A;
            border-radius: 12px;
            overflow: hidden;
            border: 2px solid var(--color-deep-plum);
            box-shadow: inset 0 0 30px rgba(0,0,0,0.8);
            aspect-ratio: 4 / 3;
            max-height: 340px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .sstv-img-container {
            width: 100%;
            height: 100%;
            position: relative;
          }

          .sstv-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }

          .scanline-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.35) 50%),
                        linear-gradient(90deg, rgba(255, 0, 0, 0.05), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.05));
            background-size: 100% 4px, 6px 100%;
            pointer-events: none;
          }

          .sstv-hud {
            position: absolute;
            bottom: 0.75rem;
            left: 0.75rem;
            right: 0.75rem;
            display: flex;
            justify-content: space-between;
            pointer-events: none;
          }

          .hud-badge {
            background: rgba(43, 15, 24, 0.85);
            color: #FFCAD4;
            font-size: 0.7rem;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            border: 1px solid rgba(255, 202, 212, 0.3);
          }

          .sstv-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #2B0F18 0%, #602437 50%, #8A2846 100%);
            position: relative;
          }

          .placeholder-watermark {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            color: #FFCAD4;
            z-index: 1;
            text-align: center;
          }

          .placeholder-title {
            font-size: 0.9rem;
            font-weight: 700;
            letter-spacing: 0.05em;
          }

          .placeholder-sub {
            font-size: 0.72rem;
            color: var(--color-soft-blush);
            opacity: 0.8;
          }

          .sstv-meta-card {
            background-color: #FFF9FA;
            border: 1px solid var(--border-color);
            border-radius: 10px;
            padding: 0.85rem 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .caption-label {
            font-size: 0.68rem;
            font-weight: 700;
            color: var(--text-muted);
            letter-spacing: 0.04em;
          }

          .caption-text {
            font-size: 0.88rem;
            font-style: italic;
            color: var(--text-primary);
            margin-top: 0.2rem;
          }

          .sstv-tech-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0.5rem;
            border-top: 1px solid var(--border-color);
            padding-top: 0.65rem;
          }

          .tech-stat {
            display: flex;
            flex-direction: column;
            gap: 0.15rem;
          }

          .tech-stat-label {
            font-size: 0.65rem;
            color: var(--text-muted);
            text-transform: uppercase;
          }

          .tech-stat-val {
            font-size: 0.82rem;
            font-weight: 700;
            color: var(--color-berry-rose);
          }

          /* Voice Display */
          .voice-display-card {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .voice-audio-box {
            background-color: #FFF9FA;
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 1.15rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .audio-header {
            display: flex;
            align-items: center;
            gap: 0.85rem;
          }

          .audio-icon-pulse {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background-color: var(--color-soft-blush);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .audio-title {
            font-size: 0.95rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0;
          }

          .audio-subtitle {
            font-size: 0.72rem;
            color: var(--text-muted);
          }

          .audio-player-wrapper {
            width: 100%;
          }

          .native-audio-player {
            width: 100%;
            height: 42px;
            border-radius: 8px;
            outline: none;
          }

          .voice-transcript-card {
            background-color: #FFF5F7;
            border-left: 4px solid var(--color-berry-rose);
            border-radius: 8px;
            padding: 1rem 1.15rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .transcript-label {
            font-size: 0.68rem;
            font-weight: 700;
            color: var(--color-berry-rose);
            letter-spacing: 0.05em;
          }

          .transcript-quote {
            font-size: 0.95rem;
            line-height: 1.5;
            color: var(--text-primary);
            font-style: italic;
            margin: 0;
          }

          .voice-tech-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5rem;
            border-top: 1px solid var(--border-color);
            padding-top: 0.65rem;
          }

          .modal-footer {
            padding: 0.85rem 1.4rem;
            border-top: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #FFF9FA;
          }

          @media (max-width: 640px) {
            .timeline-steps {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.8rem;
            }
            .step-connector {
              width: 3px;
              height: 20px;
              margin: 0 0 0 16px;
            }
            .metrics-strip {
              grid-template-columns: repeat(2, 1fr);
            }
            .sstv-tech-grid {
              grid-template-columns: repeat(2, 1fr);
            }
            .voice-tech-stats {
              grid-template-columns: 1fr;
            }
            .modal-backdrop {
              padding: 0.5rem;
            }
            .modal-backdrop .downlink-modal {
              width: 98vw;
              max-height: 94vh;
              border-radius: 12px;
            }
            .downlink-modal-header {
              padding: 0.85rem 1rem;
            }
            .downlink-modal-body {
              padding: 1rem 1.15rem;
            }
            .modal-footer {
              padding: 0.75rem 1rem;
            }
          }
        `}</style>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalElement, document.body);
  }
  return modalElement;
};

export default DownlinkDetailModal;
