import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelemetry } from '../context/TelemetryContext';
import { Radio, Lock, User, ArrowRight, Shield } from 'lucide-react';

export const Login = () => {
  const { login } = useTelemetry();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    setError('');

    const success = login(username, password);

    if (success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError('Invalid Operator ID or Access Passcode.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card card">
        <div className="login-header">
          <div className="logo-box">
            <Radio size={28} />
          </div>
          <h1 className="login-title">ARBITER</h1>
          <p className="login-subtitle">PocketQube Ground Station Mission Control Console</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Ground Station Callshare / Operator ID</label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input
                type="text"
                className="form-input mono"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Access Passcode</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                type="password"
                className="form-input mono"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary login-submit-btn">
            <span>Authenticate Ground Session</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="login-footer">
          <Shield size={12} />
          <span className="mono text-xs">RESTRICTED OPERATIONAL ACCESS • K.J. SOMAIYA INSTITUTE OF TECHNOLOGY</span>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 50% 30%, rgba(224, 87, 128, 0.12), transparent 70%), var(--color-deep-plum);
          padding: 1.5rem;
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          border: 1px solid var(--border-color);
          border-left: 4px solid var(--color-berry-rose);
          border-radius: 16px;
          box-shadow: 0 12px 36px rgba(43, 15, 24, 0.3);
          padding: 2.25rem 2rem;
          background-color: var(--bg-card);
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .logo-box {
          display: inline-flex;
          padding: 0.85rem;
          background: linear-gradient(135deg, var(--color-berry-rose), var(--color-raspberry));
          border: 1px solid var(--color-rose-pink);
          border-radius: 14px;
          color: var(--text-inverse);
          margin-bottom: 0.8rem;
          box-shadow: 0 4px 12px rgba(138, 40, 70, 0.3);
        }

        .login-title {
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: var(--color-berry-rose);
        }

        .login-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-top: 0.2rem;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 0.8rem;
          color: var(--text-muted);
        }

        .input-with-icon .form-input {
          padding-left: 2.5rem;
          width: 100%;
        }

        .login-submit-btn {
          width: 100%;
          margin-top: 0.5rem;
          padding: 0.75rem;
          font-size: 0.95rem;
          border-radius: 12px;
        }

        .login-footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border-color);
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};
