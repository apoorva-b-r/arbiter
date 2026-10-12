import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTelemetry } from '../context/TelemetryContext';
import { Satellite, Lock, User, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const Signup = () => {
  const { register } = useTelemetry();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const nextErrors = { username: '', password: '', confirmPassword: '' };
    const trimmedUsername = username.trim();
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;

    if (!trimmedUsername) {
      nextErrors.username = 'Operator ID is required.';
    } else if (!usernameRegex.test(trimmedUsername)) {
      nextErrors.username = 'Operator ID must be 3–20 characters and contain only letters, numbers, hyphens, and underscores.';
    }

    if (!password) {
      nextErrors.password = 'Passcode is required.';
    } else if (password.length < 8 || !/\d/.test(password)) {
      nextErrors.password = 'Passcode must be at least 8 characters and contain at least one number.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your passcode.';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passcodes do not match.';
    }

    return nextErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const validationErrors = validate();
    if (validationErrors.username || validationErrors.password || validationErrors.confirmPassword) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await register(username.trim(), password);
      setErrors({ username: '', password: '', confirmPassword: '' });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const status = err.status;
      const message = err.message || '';

      if (status === 409) {
        setErrors((prev) => ({ ...prev, username: 'Operator ID already taken.' }));
        setServerError('Operator ID already taken.');
      } else if (status === 503) {
        setServerError('Database offline. Sign-up needs the backend to be online.');
      } else if (status === 400) {
        setServerError(message || 'Invalid sign-up details provided.');
      } else {
        setServerError('Sign-up needs the backend to be online.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card card">
        <div className="login-header">
          <div className="logo-box">
            <Satellite size={28} strokeWidth={1.8} />
          </div>
          <h1 className="login-title">ARBITER</h1>
          <p className="login-subtitle">PocketQube Ground Station Mission Control — New Operator Registration</p>
        </div>

        {serverError && (
          <div className="server-error-banner" role="alert">
            <AlertCircle size={16} />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {/* Operator ID Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="operator-id">Operator ID</label>
            <div className="input-with-icon">
              <User size={16} className="input-icon" />
              <input
                id="operator-id"
                type="text"
                className="form-input mono"
                placeholder="e.g. Operator-Beta"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errors.username) setErrors((prev) => ({ ...prev, username: '' }));
                  if (serverError) setServerError('');
                }}
                autoComplete="username"
                disabled={isSubmitting}
                required
              />
            </div>
            {errors.username && (
              <p className="field-error" role="alert">{errors.username}</p>
            )}
          </div>

          {/* Passcode Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="access-passcode">Passcode</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="access-passcode"
                type={showPassword ? 'text' : 'password'}
                className="form-input mono password-input"
                placeholder="Min 8 characters with a number"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  if (serverError) setServerError('');
                }}
                autoComplete="new-password"
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide passcode' : 'Show passcode'}
                title={showPassword ? 'Hide passcode' : 'Show passcode'}
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <p className="field-error" role="alert">{errors.password}</p>
            )}
          </div>

          {/* Confirm Passcode Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="confirm-passcode">Confirm Passcode</label>
            <div className="input-with-icon">
              <Lock size={16} className="input-icon" />
              <input
                id="confirm-passcode"
                type={showConfirmPassword ? 'text' : 'password'}
                className="form-input mono password-input"
                placeholder="Re-enter passcode"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  if (serverError) setServerError('');
                }}
                autoComplete="new-password"
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                aria-label={showConfirmPassword ? 'Hide passcode' : 'Show passcode'}
                title={showConfirmPassword ? 'Hide passcode' : 'Show passcode'}
                disabled={isSubmitting}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="field-error" role="alert">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary login-submit-btn"
            disabled={isSubmitting}
          >
            <span>{isSubmitting ? 'Registering Operator...' : 'Create Account'}</span>
            {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
          <Link to="/login" style={{ color: 'var(--color-berry-rose)', fontWeight: 600, textDecoration: 'none' }}>
            Log in
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
          margin-bottom: 1.75rem;
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
          line-height: 1.4;
        }

        .server-error-banner {
          background-color: #FEF2F2;
          border: 1px solid #FCA5A5;
          color: #DC2626;
          padding: 0.65rem 0.85rem;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
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

        .login-submit-btn {
          width: 100%;
          margin-top: 0.5rem;
          padding: 0.75rem;
          font-size: 0.95rem;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .login-submit-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
