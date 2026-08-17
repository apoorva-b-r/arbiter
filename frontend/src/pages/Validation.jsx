import React, { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { ScenarioList } from '../components/validation/ScenarioList';
import { ScenarioForm } from '../components/validation/ScenarioForm';
import { RunResultCard } from '../components/validation/RunResultCard';
import { PassRateChart } from '../components/validation/PassRateChart';
import { useTelemetry } from '../context/TelemetryContext';
import { ShieldCheck, Plus, Play } from 'lucide-react';

export const Validation = () => {
  const { scenarios, validationRuns, runScenarioTest, addScenario } = useTelemetry();
  const [showForm, setShowForm] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState('SCEN-01');
  const [runResult, setRunResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunScenario = async (id) => {
    setSelectedScenarioId(id);
    setIsRunning(true);
    setRunResult(null);

    // Simulate fast-forward execution delay for realistic UI feedback
    setTimeout(async () => {
      const res = await runScenarioTest(id);
      setRunResult(res);
      setIsRunning(false);
    }, 600);
  };

  const handleCreateScenario = async (newScenario) => {
    await addScenario(newScenario);
    setShowForm(false);
  };

  return (
    <PageContainer
      title="AI SAFETY VALIDATION CONSOLE"
      subtitle="Fast-forward test bench to validate AI router priority scoring against satellite safety rules"
      actions={
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary btn-sm"
        >
          <Plus size={14} />
          <span>New Scenario</span>
        </button>
      }
    >
      <div className="validation-grid">
        {/* Pass Rate Accuracy Trend Chart */}
        <PassRateChart runs={validationRuns} />

        {/* Create Form Drawer */}
        {showForm && (
          <ScenarioForm
            onSubmit={handleCreateScenario}
            onClose={() => setShowForm(false)}
          />
        )}

        {/* Main 2-column layout: Scenario List vs Execution Result */}
        <div className="validation-content-row">
          <ScenarioList
            scenarios={scenarios}
            onRunScenario={handleRunScenario}
            selectedScenarioId={selectedScenarioId}
          />

          <div className="result-container">
            {isRunning ? (
              <div className="card loading-card">
                <span className="mono spin-text">FAST-FORWARD SIMULATING ROUTER ENGINE...</span>
              </div>
            ) : runResult ? (
              <RunResultCard result={runResult} />
            ) : (
              <div className="card placeholder-card">
                <ShieldCheck size={36} className="text-muted" />
                <h4 className="placeholder-title">Select & Run a Test Scenario</h4>
                <p className="placeholder-desc">
                  Click "Run Test" on any scenario to execute it against the AI priority router in fast-forward mode and inspect safety rule assertions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .validation-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .validation-content-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        @media (max-width: 1024px) {
          .validation-content-row {
            grid-template-columns: 1fr;
          }
        }

        .loading-card, .placeholder-card {
          height: 100%;
          min-height: 280px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 2rem;
        }

        .spin-text {
          color: var(--accent-blue);
          font-weight: 700;
        }

        .placeholder-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-secondary);
          margin-top: 0.8rem;
        }

        .placeholder-desc {
          font-size: 0.83rem;
          color: var(--text-muted);
          max-width: 320px;
          margin-top: 0.3rem;
        }
      `}</style>
    </PageContainer>
  );
};
