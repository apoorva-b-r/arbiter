import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TelemetryProvider, useTelemetry } from './context/TelemetryContext';
import { NavBar } from './components/layout/NavBar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { PassHistory } from './pages/PassHistory';
import { Validation } from './pages/Validation';
import { Deployment } from './pages/Deployment';
import { Settings } from './pages/Settings';

const ProtectedLayout = ({ children }) => {
  const { user } = useTelemetry();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <NavBar />
      <main className="main-content">{children}</main>
    </div>
  );
};

export function App() {
  return (
    <TelemetryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedLayout>
                <PassHistory />
              </ProtectedLayout>
            }
          />
          <Route
            path="/validation"
            element={
              <ProtectedLayout>
                <Validation />
              </ProtectedLayout>
            }
          />
          <Route
            path="/deployment"
            element={
              <ProtectedLayout>
                <Deployment />
              </ProtectedLayout>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedLayout>
                <Settings />
              </ProtectedLayout>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </TelemetryProvider>
  );
}

export default App;
