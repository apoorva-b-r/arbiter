import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTelemetry } from '../context/TelemetryContext';
import { Satellite, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const Login = () => {
  const { login } = useTelemetry();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ username: '', password: '' });
  const [generalError, setGeneralError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');

    const nextErrors = { username: '', password: '' };
    const trimmedUsername = username.trim();
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;

    if (!trimmedUsername || !usernameRegex.test(trimmedUsername)) {
      nextErrors.username = 'Invalid Operator ID format';
    }

    if (!password) {
      nextErrors.password = 'Passcode is required';
    }

    if (nextErrors.username || nextErrors.password) {
      setErrors(nextErrors);
      return;
    }

    const result = await login(username, password);

    if (result.ok) {
      setErrors({ username: '', password: '' });
      setGeneralError('');
      navigate('/dashboard', { replace: true });
      return;
    }

    setGeneralError(result.error || 'Incorrect Operator ID or passcode');
  };

  return (
    <div className="login-page">
      <div className="login-card card">
        <div className="login-header">
          <div className="logo-box">
            <Satellite size={28} strokeWidth={1.8} />
          </div>
          <h1 className="login-title">ARBITER</h1>
          <p className="login-subtitle">PocketQube Ground Station Mission Control</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="operator-id">Operator ID</label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input
                id="operator-id"
                type="text"
                className="form-input mono"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errors.username) setErrors((prev) => ({ ...prev, username: '' }));
                  if (generalError) setGeneralError('');
                }}
                autoComplete="username"
                required
              />
            </div>
            {errors.username && (
              <p className="field-error" role="alert">{errors.username}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="access-passcode">Passcode</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="access-passcode"
                type={showPassword ? 'text' : 'password'}
                className="form-input mono password-input"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  if (generalError) setGeneralError('');
                }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="field-error" role="alert">{errors.password}</p>
            )}
          </div>

          {generalError && (
            <p className="login-general-error" role="alert">
              {generalError}
            </p>
          )}

          <button type="submit" className="btn btn-primary login-submit-btn">
            <span>Login</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>New operator? </span>
          <Link to="/signup" style={{ color: 'var(--color-berry-rose)', fontWeight: 600, textDecoration: 'none' }}>
            Create an account
          </Link>
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
          pointer-events: none;
        }

        .input-with-icon .form-input {
          padding-left: 2.5rem;
          width: 100%;
        }

        .password-input {
          padding-right: 2.6rem;
        }

        .password-toggle {
          position: absolute;
          right: 0.55rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.8rem;
          height: 1.8rem;
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          border-radius: 6px;
        }

        .password-toggle:hover,
        .password-toggle:focus-visible {
          color: var(--color-berry-rose);
          outline: none;
        }

        .field-error {
          margin: 0;
          color: #dc2626;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .login-general-error {
          margin: 0.25rem 0 0.85rem;
          color: #dc2626;
          font-size: 0.82rem;
          font-weight: 600;
          text-align: center;
          background-color: #FEF2F2;
          border: 1px solid #FCA5A5;
          padding: 0.55rem 0.75rem;
          border-radius: 8px;
        }

        .login-submit-btn {
          width: 100%;
          margin-top: 0.5rem;
          padding: 0.75rem;
          font-size: 0.95rem;
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
};
