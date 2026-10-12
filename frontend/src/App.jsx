import React from 'react';

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
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
import { Validation } from './pages/Validation';
import { Deployment } from './pages/Deployment';
import { Settings } from './pages/Settings';


// ---------------------------------------------------------
// Protect pages that require authentication
// ---------------------------------------------------------
const ProtectedLayout = ({ children }) => {
  const { user } = useTelemetry();

  if (!user) {
    return <Navigate to="/login" replace />;
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
  const { user } = useTelemetry();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};


// ---------------------------------------------------------
// Redirect landing and unknown paths: /dashboard if logged in, /login if logged out
// ---------------------------------------------------------
const RootRedirect = () => {
  const { user } = useTelemetry();
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
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