import React, { useState } from 'react';
import { PlusCircle, X } from 'lucide-react';

export const ScenarioForm = ({ onSubmit, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialBattery, setInitialBattery] = useState(80);
  const [linkProfile, setLinkProfile] = useState('HIGH_SINE');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name,
      description: description || 'Custom operator defined validation scenario.',
      initialBattery: Number(initialBattery),
      linkProfile,
      rulesCount: 4,
      status: 'PASSED'
    });
  };

  return (
    <div className="card scenario-form-card">
      <div className="card-header">
        <span className="card-title">
          <PlusCircle size={16} style={{ color: 'var(--color-rose-pink)' }} />
          Create New Safety Scenario
        </span>
        {onClose && (
          <button onClick={onClose} className="close-btn">
            <X size={16} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Scenario Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Eclipse Entry with Extreme Fading"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            rows={2}
            placeholder="Describe the test case objectives..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Initial Battery (%)</label>
            <input
              type="number"
              min="10"
              max="100"
              className="form-input mono"
              value={initialBattery}
              onChange={(e) => setInitialBattery(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Link Quality Profile</label>
            <select
              className="form-select mono"
              value={linkProfile}
              onChange={(e) => setLinkProfile(e.target.value)}
            >
              <option value="HIGH_SINE">HIGH_SINE (Nominal Pass 80-95%)</option>
              <option value="MODERATE">MODERATE (Fading Pass 40-70%)</option>
              <option value="LOW_NOISY">LOW_NOISY (Degraded Fading &lt; 35%)</option>
              <option value="ECLIPSE_ZERO">ECLIPSE_ZERO (Zero Solar Input)</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          {onClose && (
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary">
            Save & Register Scenario
          </button>
        </div>
      </form>

      <style>{`
        .scenario-form-card {
          margin-bottom: 1.5rem;
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--color-soft-blush);
          cursor: pointer;
        }

        .close-btn:hover {
          color: var(--text-inverse);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border-color);
        }
      `}</style>
    </div>
  );
};
