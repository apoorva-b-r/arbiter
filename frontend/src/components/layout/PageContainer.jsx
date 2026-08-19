import React from 'react';

export const PageContainer = ({ title, subtitle, actions, children }) => {
  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">{title}</h2>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </div>
      <div className="page-body">{children}</div>

      <style>{`
        .page-wrapper {
          width: 100%;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(255, 202, 212, 0.2);
        }

        .page-title {
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--text-inverse);
        }

        .page-subtitle {
          font-size: 0.85rem;
          color: var(--color-soft-blush);
          margin-top: 0.2rem;
        }

        .page-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .page-body {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
      `}</style>
    </div>
  );
};
