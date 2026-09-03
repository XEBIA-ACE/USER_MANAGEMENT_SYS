/**
 * App.tsx
 *
 * Root application component. Defines the React Router v6 route tree and
 * wraps it with `AuthProvider` so auth state is available to all routes.
 *
 * Route protection:
 *  - `/profile` is wrapped by `ProtectedRoute` — unauthenticated users are
 *    redirected to `/login` (US-001).
 *  - `/login` and all other public routes are NOT wrapped and remain
 *    freely accessible.
 *
 * Requirements: US-001 — Redirect Unauthenticated Users to Login
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import { ProtectedRoute } from "../components/ProtectedRoute";

// ---------------------------------------------------------------------------
// Page imports — adjust paths if your project uses a different convention.
// ---------------------------------------------------------------------------
import LoginPage from "../pages/LoginPage";
import ProfilePage from "../pages/ProfilePage";

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App(): JSX.Element {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes — require authentication */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Fallback: redirect unknown paths to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;