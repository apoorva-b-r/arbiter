import React from 'react';
import { useTelemetry } from '../../context/TelemetryContext';
import { ListOrdered, AlertTriangle, ArrowUpRight } from 'lucide-react';

export const QueuePanel = () => {
  const { queue } = useTelemetry();

  const getTypeBadge = (type) => {
    switch (type) {
      case 'TTC': return 'badge-red';
      case 'SSTV': return 'badge-purple';
      case 'Codec2': return 'badge-blue';
      case 'M17': return 'badge-green';
      default: return 'badge-blue';
    }
  };

  return (
    <div className="card queue-panel">
      <div className="card-header">
        <span className="card-title">
          <ListOrdered size={16} style={{ color: 'var(--accent-purple)' }} />
          Transmission Queue (AI Priority Sorted)
        </span>
        <span className="badge badge-purple mono">{queue.length} PENDING</span>
      </div>

      <div className="queue-list">
        {queue.map((item, idx) => (
          <div key={item.id} className={`queue-item queue-item-${item.type.toLowerCase()} ${item.isStarved ? 'starved-item' : ''}`}>
            <div className="queue-rank mono">#{idx + 1}</div>
            
            <div className="queue-info">
              <div className="queue-header-line">
                <span className={`badge ${getTypeBadge(item.type)}`}>{item.type}</span>
                <span className="queue-label">{item.label}</span>
              </div>
              <div className="queue-meta mono">
                <span>{item.sizeKb} KB</span>
                <span>•</span>
                <span>Wait: {item.waitTimeSec}s</span>
                {item.isStarved && (
                  <span className="starved-tag">
                    <AlertTriangle size={12} />
                    STARVATION TRIGGER (&gt;120s)
                  </span>
                )}
              </div>
            </div>

            <div className="queue-score-box">
              <span className="score-label">PRIORITY SCORE</span>
              <span className="score-val mono">{item.priorityScore}</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .queue-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .queue-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          overflow-y: auto;
          max-height: 380px;
          padding-right: 0.2rem;
        }

        .queue-item {
          --queue-glow: var(--accent-blue);
          display: flex;
          align-items: center;
          gap: 0.8rem;
          background-color: var(--bg-dark);
          border: 1px solid var(--border-color);
          padding: 0.75rem 0.9rem;
          border-radius: 6px;
          transition: border-color 0.15s ease;
        }

        .queue-item:hover {
          border-color: var(--queue-glow);
          box-shadow: 0 0 14px color-mix(in srgb, var(--queue-glow) 26%, transparent);
        }

        .queue-item-ttc { --queue-glow: var(--accent-red); }
        .queue-item-sstv { --queue-glow: var(--accent-purple); }
        .queue-item-codec2 { --queue-glow: var(--accent-blue); }
        .queue-item-m17 { --queue-glow: var(--accent-green); }

        .queue-item.starved-item {
          border-color: var(--accent-amber);
          background-color: rgba(245, 158, 11, 0.05);
        }

        .queue-rank {
          font-weight: 700;
          color: var(--text-muted);
          font-size: 0.9rem;
          min-width: 26px;
        }

        .queue-info {
          flex: 1;
        }

        .queue-header-line {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .queue-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .queue-meta {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .starved-tag {
          display: flex;
          align-items: center;
          gap: 0.2rem;
          color: var(--accent-amber);
          font-weight: 600;
          font-size: 0.7rem;
        }

        .queue-score-box {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          background-color: var(--bg-card);
          padding: 0.35rem 0.65rem;
          border-radius: 4px;
          border: 1px solid var(--border-color);
        }

        .score-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          font-weight: 600;
        }

        .score-val {
          font-size: 1.1rem;
          font-weight: 800;
          color: var(--accent-purple);
        }
      `}</style>
    </div>
  );
};
