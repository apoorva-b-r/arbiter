import React from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { StatusCards } from '../components/dashboard/StatusCards';
import { TelemetryChart } from '../components/dashboard/TelemetryChart';
import { QueuePanel } from '../components/dashboard/QueuePanel';
import { DecisionLog } from '../components/dashboard/DecisionLog';
import { OverridePanel } from '../components/dashboard/OverridePanel';

export const Dashboard = () => {
  return (
    <PageContainer
      title="ARBITER GROUND STATION DASHBOARD"
      subtitle="Real-time PocketQube telemetry, AI priority router telemetry queue, and operator override controls"
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

        .dashboard-grid > .card,
        .queue-decision-row > .card {
          --card-glow: var(--color-rose-pink);
        }

        .dashboard-grid .card {
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }

        .dashboard-grid .card:hover {
          border-color: var(--color-rose-pink);
          box-shadow: 0 6px 20px rgba(96, 36, 55, 0.12), 0 0 15px rgba(224, 87, 128, 0.2);
          transform: translateY(-2px);
        }
      `}</style>
    </PageContainer>
  );
};
