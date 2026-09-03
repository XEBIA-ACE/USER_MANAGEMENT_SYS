```tsx
/**
 * ProtectedRoute.tsx
 *
 * A reusable route guard component that checks authentication state before
 * rendering protected child routes. Unauthenticated users are redirected to
 * `/login` with state indicating that authentication is required, preserving
 * the originally requested path so post-login navigation can restore it.
 *
 * Uses React Router v6 `<Navigate>` with `replace: true` so the protected
 * URL is not left in browser history.
 *
 * Requirements: US-001 AC-1, AC-3, AC-5
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RedirectState {
  authRequired: boolean;
  from: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Wrap any route element with `<ProtectedRoute>` to enforce authentication.
 * Renders the nested `<Outlet>` when authenticated; redirects to `/login`
 * otherwise.
 */
export function ProtectedRoute(): React.ReactElement {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const state: RedirectState = {
      authRequired: true,
      from: location.pathname,
    };
    return <Navigate to="/login" state={state} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
```