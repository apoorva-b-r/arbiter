import React from 'react';

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

import {
  TelemetryProvider,
  useTelemetry
} from './context/TelemetryContext';

import { NavBar } from './components/layout/NavBar';

import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { PassHistory } from './pages/PassHistory';
import { ReceivedData } from './pages/ReceivedData';
import { Validation } from './pages/Validation';
import { Deployment } from './pages/Deployment';
import { Settings } from './pages/Settings';
import { getSafeRedirectTarget } from './utils/redirect';


// ---------------------------------------------------------
// Protect pages that require authentication
// ---------------------------------------------------------
const ProtectedLayout = ({ children }) => {
  const { user } = useTelemetry();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="app-layout">
      <NavBar />

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};


// ---------------------------------------------------------
// Prevent logged-in users from visiting the login page
// ---------------------------------------------------------
const PublicRoute = ({ children }) => {
  const { user, missionPhase } = useTelemetry();
  const location = useLocation();
  const defaultTarget = missionPhase === 'OPERATIONAL' ? '/dashboard' : '/deployment';
  const from = getSafeRedirectTarget(location.state?.from, defaultTarget);

  if (user) {
    return <Navigate to={from} replace />;
  }

  return children;
};


// ---------------------------------------------------------
// Redirect landing and unknown paths: /deployment or /dashboard if logged in, /login if logged out
// ---------------------------------------------------------
const RootRedirect = () => {
  const { user, missionPhase } = useTelemetry();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  const landingPath = missionPhase === 'OPERATIONAL' ? '/dashboard' : '/deployment';
  return <Navigate to={landingPath} replace />;
};


// ---------------------------------------------------------
// Application
// ---------------------------------------------------------
export function App() {
  return (
    <TelemetryProvider>
      <BrowserRouter>

        <Routes>

          {/* -------------------------------------------------
              LOGIN
              Only visible when the user is NOT logged in
          ------------------------------------------------- */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* -------------------------------------------------
              SIGNUP
              Only visible when the user is NOT logged in
          ------------------------------------------------- */}
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />


          {/* -------------------------------------------------
              DASHBOARD
          ------------------------------------------------- */}
          <Route
            path="/dashboard"
            element={
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            }
          />


          {/* -------------------------------------------------
              HISTORY
          ------------------------------------------------- */}
          <Route
            path="/history"
            element={
              <ProtectedLayout>
                <PassHistory />
              </ProtectedLayout>
            }
          />


          {/* -------------------------------------------------
              RECEIVED DATA
          ------------------------------------------------- */}
          <Route
            path="/received"
            element={
              <ProtectedLayout>
                <ReceivedData />
              </ProtectedLayout>
            }
          />


          {/* -------------------------------------------------
              AI VALIDATION
          ------------------------------------------------- */}
          <Route
            path="/validation"
            element={
              <ProtectedLayout>
                <Validation />
              </ProtectedLayout>
            }
          />


          {/* -------------------------------------------------
              DEPLOYMENT
          ------------------------------------------------- */}
          <Route
            path="/deployment"
            element={
              <ProtectedLayout>
                <Deployment />
              </ProtectedLayout>
            }
          />


          {/* -------------------------------------------------
              SETTINGS
          ------------------------------------------------- */}
          <Route
            path="/settings"
            element={
              <ProtectedLayout>
                <Settings />
              </ProtectedLayout>
            }
          />


          {/* -------------------------------------------------
              ROOT
              Landing page: /dashboard if logged in, /login if logged out
          ------------------------------------------------- */}
          <Route
            path="/"
            element={<RootRedirect />}
          />


          {/* -------------------------------------------------
              UNKNOWN URLS
              Redirect: /dashboard if logged in, /login if logged out
          ------------------------------------------------- */}
          <Route
            path="*"
            element={<RootRedirect />}
          />

        </Routes>

      </BrowserRouter>
    </TelemetryProvider>
  );
}


export default App;