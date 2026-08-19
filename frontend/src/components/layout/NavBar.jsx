import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTelemetry } from '../../context/TelemetryContext';
import { 
  Satellite, 
  Activity, 
  History, 
  ShieldCheck, 
  Rocket, 
  Sliders, 
  LogOut, 
  User, 
  Clock 
} from 'lucide-react';

export const NavBar = () => {
  const { user, logout, telemetry } = useTelemetry();
  const navigate = useNavigate();
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().split(' ')[4] + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <header className="navbar-container">
      <div className="navbar-brand">
        <div className="satellite-icon-box">
          <Satellite className="sat-icon" size={24} strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="brand-title">ARBITER</h1>
          <span className="brand-subtitle"></span>
        </div>
      </div>

      <nav className="navbar-links">
        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Activity size={16} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <History size={16} />
          <span>Pass History</span>
        </NavLink>
        <NavLink to="/validation" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ShieldCheck size={16} />
          <span>AI Validation</span>
        </NavLink>
        <NavLink to="/deployment" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Rocket size={16} />
          <span>Deployment</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Sliders size={16} />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="navbar-status">

        {/* User Operator Info */}
        <div className="operator-badge">
          <button onClick={handleLogout} className="logout-btn" title="Logout session">
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <style>{`
        .navbar-container {
          background-color: var(--color-deep-plum);
          border-bottom: 1px solid rgba(255, 202, 212, 0.2);
          padding: 0.85rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 16px rgba(43, 15, 24, 0.4);
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }

        .satellite-icon-box {
          background: linear-gradient(135deg, var(--color-berry-rose), var(--color-raspberry));
          border: 1px solid var(--color-rose-pink);
          padding: 0.5rem;
          border-radius: 10px;
          color: var(--text-inverse);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(138, 40, 70, 0.3);
        }

        .brand-title {
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: var(--text-inverse);
          line-height: 1.1;
        }

        .brand-subtitle {
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--color-soft-blush);
          display: block;
        }

        .navbar-links {
          display: flex;
          gap: 0.4rem;
          background-color: rgba(43, 15, 24, 0.4);
          padding: 0.3rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 202, 212, 0.2);
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 1rem;
          border-radius: 999px;
          color: var(--color-soft-blush);
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .nav-item:hover {
          color: var(--text-inverse);
          background-color: rgba(255, 255, 255, 0.12);
        }

        .nav-item.active {
          color: var(--text-inverse);
          background-color: var(--color-berry-rose);
          border: 1px solid var(--color-rose-pink);
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(138, 40, 70, 0.3);
        }

        .navbar-status {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .pass-status-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background-color: var(--alert-success-bg);
          border: 1px solid var(--alert-success-border);
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          font-size: 0.78rem;
          color: var(--alert-success-text);
          font-weight: 600;
        }

        .utc-clock {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 202, 212, 0.2);
          padding: 0.4rem 0.8rem;
          border-radius: 999px;
          font-size: 0.8rem;
          color: var(--text-inverse);
        }

        .operator-badge {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 202, 212, 0.2);
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          font-size: 0.8rem;
          color: var(--text-inverse);
        }

        .logout-btn {
          background: var(--color-soft-blush);
          border: none;
          color: var(--color-berry-rose);
          cursor: pointer;
          padding: 0.3rem 0.5rem;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background-color: var(--color-rose-pink);
          color: var(--text-inverse);
        }
      `}</style>
    </header>
  );
};
