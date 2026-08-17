# Arbiter — Ground Station Simulator

**Arbiter** is a full-stack web application designed for simulating a PocketQube satellite ground station mission. It features satellite telemetry monitoring, an AI rule-based priority scheduler with safety fallbacks for ground pass payload data transmission, an **AI safety validation console**, and a **deployment handover state machine** with emergency contingency handling.

---

## Technical Architecture & Tech Stack

- **Frontend:** React (Vite), React Router v6, Context API (`TelemetryContext`), Plain CSS Mission Control Design System, `recharts` for live telemetry & pass rate charts.
- **Backend:** Node.js + Express REST API running on port `5001`.
- **Database:** MongoDB with Mongoose (with automatic fallback to in-memory datasets if MongoDB service is offline).
- **Communication:** REST API with frontend interval polling (`setInterval` polling every 3 seconds).

---

## Directory Structure

```
arbiter/
├── backend/
│   ├── src/
│   │   ├── models/           # Mongoose schemas (Telemetry, QueueItem, Decision, Pass, Scenario, ValidationRun, DeploymentState)
│   │   ├── services/         # Core logic (simulator.js, router.js, validator.js, deploymentMachine.js)
│   │   ├── routes/           # Express REST endpoints (telemetry, queue, decisions, override, passes, validation, deployment, settings)
│   │   └── server.js         # Express app entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/              # REST client + mock fallback layer (client.js, mockData.js)
│   │   ├── components/       # Component modular layout (NavBar, PageContainer, StatusCards, TelemetryChart, QueuePanel, DecisionLog, OverridePanel, etc.)
│   │   ├── context/          # TelemetryContext state provider & live polling engine
│   │   ├── pages/            # Login, Dashboard, PassHistory, Validation, Deployment, Settings
│   │   ├── App.jsx           # React Router v6 routing
│   │   ├── main.jsx          # Vite entry point
│   │   └── index.css         # Dark mode technical mission control design system
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## Quickstart Guide

### 1. Frontend Setup & Launch
```bash
cd frontend
npm install
npm run dev
```
The frontend will launch locally on **`http://localhost:3000`**.

### 2. Backend Setup & Launch
```bash
cd backend
npm install
npm run dev
```
The Express backend server will start on **`http://localhost:5001`**.

---

## Core Features & AI Rules

1. **AI Priority Router Formula**:
   $$\text{Score} = \text{BaseWeight} + (\text{WaitTime}_{\text{sec}} \times 1.5) + (\text{LinkQuality}_{\%} \times 0.8)$$
2. **TT&C Starvation Safety Override**:
   If TT&C (Telemetry & Command) has been waiting for $> 120\text{s}$, the AI router forces TT&C dispatch regardless of candidate scores to prevent satellite health telemetry blackout.
3. **Operator Manual Override**:
   Ground station engineers can manually select TTC, SSTV, Codec2, or M17 transmission modes, bypassing the AI router. All manual overrides are logged as `"OPERATOR OVERRIDE"`.
4. **AI Safety Validation Console**:
   Fast-forward simulation bench that runs scenarios against safety rule assertions (TT&C max wait time, critical battery preservation) and displays pass/fail result matrices.
5. **Deployment Handover State Machine**:
   Visual pipeline (Stowed → Release triggered → Separation confirmed → Initialization → Commissioning → Operational) with timeout detection and contingency resolution actions (Retry, Force Mark Confirmed, Escalate).
