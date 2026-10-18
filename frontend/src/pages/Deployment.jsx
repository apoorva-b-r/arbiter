import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/layout/PageContainer';
import { StateMachineView } from '../components/deployment/StateMachineView';
import { ContingencyBanner } from '../components/deployment/ContingencyBanner';
import { useTelemetry } from '../context/TelemetryContext';
import { Rocket, Clock, ShieldAlert, CheckCircle2, RotateCcw } from 'lucide-react';

export const Deployment = () => {
  const navigate = useNavigate();
  const {
    deployment,
    missionPhase,
    resetMission,
    inspectState,
    clearInspection,
    runLaunchSequenceDemo,
    runTimeoutContingency,
    retryVerification,
    checkSecondaryBeacon,
    escalateContingency,
    manualConfirmSeparation,
    resolveContingencyAction
  } = useTelemetry();

  const handleResetMission = () => {
    if (window.confirm('Reset mission back to PRE_DEPLOYMENT and reset the deployment state machine to Stowed?')) {
      resetMission();
    }
  };

  const headerActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <button
        onClick={handleResetMission}
        className="btn btn-sm btn-outline"
        title="Reset mission to initial pre-deployment state"
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: 'rgba(255, 202, 212, 0.4)', color: 'var(--color-soft-blush)' }}
      >
        <RotateCcw size={14} />
        <span>Reset Mission</span>
      </button>
    </div>
  );

  return (
    <PageContainer
      title="DEPLOYMENT HANDOVER STATE MACHINE CONSOLE"
      subtitle="Launch vehicle deployment sequence tracking, separation confirmation, and emergency contingency protocols"
      actions={headerActions}
    >
      <div className="deployment-grid">
        {/* Operational Success Banner */}
        {missionPhase === 'OPERATIONAL' && (
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(46, 125, 50, 0.25) 0%, rgba(20, 40, 25, 0.4) 100%)',
            border: '1px solid rgba(76, 175, 80, 0.5)',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={24} style={{ color: '#4caf50' }} />
              <div>
                <strong style={{ color: '#81c784', fontSize: '1rem' }}>SomaiyaSat is operational. Downlink unlocked.</strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Handover sequence complete. PocketQube transmitting telemetry, AI priority decisions active.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-sm btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Go to Dashboard →
            </button>
          </div>
        )}

        {/* Contingency Alert Banner */}
        {deployment.contingencyActive && (
          <ContingencyBanner
            message={deployment.contingencyMessage}
            contingencyStatus={deployment.contingencyStatus}
            retryCount={deployment.retryCount}
            secondaryBeaconData={deployment.secondaryBeaconData}
            onRetry={retryVerification}
            onCheckSecondary={checkSecondaryBeacon}
            onEscalate={escalateContingency}
            onForceConfirm={manualConfirmSeparation}
            onResolve={resolveContingencyAction}
          />
        )}

        {/* State Machine Step View */}
        <StateMachineView
          deploymentState={deployment}
          onSelectState={inspectState}
          onClearInspection={clearInspection}
          onStartSequence={runLaunchSequenceDemo}
          onSimulateContingency={runTimeoutContingency}
        />

        {/* State Transition Log Timeline */}
        <div className="card transition-history-panel">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span className="card-title">
              <Clock size={16} style={{ color: 'var(--accent-purple)' }} />
              Handover Event & State Transition History Log
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="badge badge-blue mono" title="Associated Ground Pass ID">
                PASS: {deployment.activePassId || 'UNASSIGNED'}
              </span>
              {deployment.currentRun?.runId && (
                <span className="badge badge-purple mono" title="Current Deployment Run ID">
                  RUN: {deployment.currentRun.runId}
                </span>
              )}
              <span className="badge badge-purple mono">
                {deployment.isHistoryLoading ? 'SYNCING...' : `${deployment.historyLogs.length} EVENTS`}
              </span>
            </div>
          </div>

          <div className="timeline-list">
            {deployment.historyLogs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }} className="mono text-sm">
                No handover event logs recorded yet.
              </div>
            ) : (
              deployment.historyLogs.map((log, idx) => (
                <div key={log.eventId || idx} className="timeline-item">
                  <div className="timeline-marker">
                    {log.type === 'warning' ? (
                      <ShieldAlert size={16} style={{ color: 'var(--alert-warning-border)' }} />
                    ) : log.type === 'success' ? (
                      <CheckCircle2 size={16} style={{ color: 'var(--alert-success-border)' }} />
                    ) : log.type === 'critical' ? (
                      <ShieldAlert size={16} style={{ color: 'var(--color-raspberry)' }} />
                    ) : (
                      <Clock size={16} style={{ color: 'var(--color-berry-rose)' }} />
                    )}
                  </div>
                  <div className="timeline-body">
                    <div className="timeline-meta" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="mono text-muted text-xs">{log.timestamp}</span>
                      <span className="badge badge-blue mono">{log.state}</span>
                      {log.passId && log.passId !== 'UNASSIGNED' && (
                        <span className="mono text-muted text-xs" style={{ opacity: 0.8 }}>
                          [{log.passId}]
                        </span>
                      )}
                      {log.persisted !== undefined && (
                        <span
                          className={`badge ${log.persisted ? 'badge-green' : 'badge-amber'} mono`}
                          style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}
                        >
                          {log.persisted ? 'PERSISTED' : 'LOCAL'}
                        </span>
                      )}
                    </div>
                    <p className="timeline-event mono">{log.event}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        .deployment-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .transition-history-panel {
          grid-column: 1 / -1;
        }

        .timeline-list {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          padding-left: 0.5rem;
        }

        .timeline-item {
          display: flex;
          align-items: flex-start;
          gap: 0.8rem;
          position: relative;
        }

        .timeline-marker {
          background-color: var(--color-soft-blush);
          padding: 0.3rem;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          margin-top: 0.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .timeline-body {
          flex: 1;
          background-color: #FFF9FA;
          border: 1px solid var(--border-color);
          padding: 0.75rem 1rem;
          border-radius: 12px;
        }

        .timeline-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.3rem;
        }

        .timeline-event {
          font-size: 0.84rem;
          color: var(--text-primary);
          font-weight: 600;
        }
      `}</style>
    </PageContainer>
  );
};
