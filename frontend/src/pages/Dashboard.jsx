import React from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { StatusCards } from '../components/dashboard/StatusCards';
import { TelemetryChart } from '../components/dashboard/TelemetryChart';
import { QueuePanel } from '../components/dashboard/QueuePanel';
import { DecisionLog } from '../components/dashboard/DecisionLog';
import { OverridePanel } from '../components/dashboard/OverridePanel';
import { useTelemetry } from '../context/TelemetryContext';
import { Radio, RefreshCw } from 'lucide-react';

export const Dashboard = () => {
  const { telemetry, isPolling, setIsPolling, lastUpdated } = useTelemetry();

  return (
    <PageContainer
      title="ARBITER GROUND STATION DASHBOARD"
      subtitle="Real-time PocketQube telemetry, AI priority router telemetry queue, and operator override controls"
      actions={
        <div className="dashboard-actions">
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`btn ${isPolling ? 'btn-outline' : 'btn-primary'} btn-sm`}
          >
            <RefreshCw size={14} className={isPolling ? 'spin' : ''} />
            <span>{isPolling ? 'Polling Active (3s)' : 'Resume Polling'}</span>
          </button>
        </div>
      }
    >
      <div className="dashboard-grid">
        {/* Top 3 Status Cards */}
        <StatusCards />

        {/* Telemetry Line Chart */}
        <TelemetryChart />

        {/* Queue Panel & Decision Log Grid */}
        <div className="queue-decision-row">
          <QueuePanel />
          <DecisionLog />
        </div>

        {/* Operator Override Panel */}
        <OverridePanel />
      </div>

      <style>{`
        .dashboard-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .queue-decision-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 1024px) {
          .queue-decision-row {
            grid-template-columns: 1fr;
          }
        }

        .spin {
          animation: spin-anim 4s linear infinite;
        }

        @keyframes spin-anim {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </PageContainer>
  );
};
