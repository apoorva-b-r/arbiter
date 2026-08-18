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
          <User size={14} />
          <span>{user.username}</span>
          <button onClick={handleLogout} className="logout-btn" title="Logout session">
            <LogOut size={14} />
          </button>
        </div>
      </div>

      <style>{`
        .navbar-container {
          background-color: var(--bg-card);
          border-bottom: 1px solid var(--border-color);
          padding: 0.75rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }

        .satellite-icon-box {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
          border: 1px solid rgba(59, 130, 246, 0.4);
          padding: 0.45rem;
          border-radius: 6px;
          color: var(--accent-blue);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-title {
          font-size: 1.1rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--text-primary);
          line-height: 1.1;
        }

        .brand-subtitle {
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          display: block;
        }

        .navbar-links {
          display: flex;
          gap: 0.4rem;
          background-color: var(--bg-dark);
          padding: 0.25rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.9rem;
          border-radius: 6px;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.15s ease;
        }

        .nav-item:hover {
          color: var(--text-primary);
          background-color: var(--bg-card-hover);
        }

        .nav-item.active {
          color: var(--accent-blue);
          background-color: var(--accent-blue-bg);
          border: 1px solid rgba(59, 130, 246, 0.3);
          font-weight: 600;
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
          background-color: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.25);
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          font-size: 0.78rem;
          color: var(--accent-green);
        }

        .utc-clock {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background-color: var(--bg-dark);
          border: 1px solid var(--border-color);
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .operator-badge {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background-color: var(--bg-dark);
          border: 1px solid var(--border-color);
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          color: var(--text-primary);
        }

        .logout-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          margin-left: 0.25rem;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }

        .logout-btn:hover {
          color: var(--accent-red);
        }
      `}</style>
    </header>
  );
};
