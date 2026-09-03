# Plan: US-001 — Redirect Unauthenticated Users to Login

## Architecture Decision

This is a **frontend-only routing concern**. The backend Express API already enforces session authentication on the user-profile endpoint; the gap is that the React SPA renders the `/profile` route without checking auth state first. The fix is a reusable `ProtectedRoute` component that wraps any route requiring authentication, checks auth state, and redirects to `/login` (with an optional `?redirect=` query parameter preserving the intended destination) if the user is not authenticated.

A notification is shown on the `/login` page by reading either the React Router location `state` or the `redirect` query parameter set during the redirect. The login page renders a transient shadcn/ui `Toast` or `Alert` when it detects this signal.

No new global state library is needed — the existing auth context (or equivalent hook) is read inside `ProtectedRoute`.

## Key Design Decisions

1. **`ProtectedRoute` component** (`FRONTEND/src/components/ProtectedRoute.tsx`): A thin wrapper that reads auth state from the existing auth context/hook. If unauthenticated, it calls `<Navigate to="/login" state={{ authRequired: true }} replace />` (React Router v6 pattern). The `replace` flag prevents the profile page from appearing in browser history.

2. **Notification trigger**: The `/login` page component reads `location.state?.authRequired` (and optionally `searchParams.get('redirect')`) on mount. When `authRequired` is `true`, it displays a toast/alert: *"You must be logged in to view that page."* The notification is dismissed after login or on manual close.

3. **Route wiring**: The existing router configuration (expected in `FRONTEND/src/app/App.tsx` or a dedicated `routes` file) wraps the `/profile` route element with `<ProtectedRoute>`.

4. **Auth state contract**: The `ProtectedRoute` reads from an existing `useAuth` hook or auth context. If that hook does not yet exist, a minimal `AuthContext` providing `isAuthenticated: boolean` and a `useAuth` hook is created. Auth state is derived from the presence of a session token in memory/cookie — the implementation follows whatever mechanism the rest of the frontend already uses.

## Files to Create / Modify

### FRONTEND

| File | Action | Purpose |
|------|--------|---------|
| `FRONTEND/src/components/ProtectedRoute.tsx` | **Create** | Reusable auth guard component |
| `FRONTEND/src/components/ProtectedRoute.test.tsx` | **Create** | Unit tests for ProtectedRoute |
| `FRONTEND/src/contexts/AuthContext.tsx` | **Create or extend** | Provides `isAuthenticated` state and `useAuth` hook (create only if not already present) |
| `FRONTEND/src/app/App.tsx` | **Modify** | Wrap the `/profile` route with `<ProtectedRoute>` |
| `FRONTEND/src/pages/LoginPage.tsx` (or equivalent) | **Modify** | Read `location.state.authRequired` and render notification |

### BACKEND
No backend changes required.

## API Contract (no new endpoints)
The redirect flow is entirely client-side. The backend `/api/v1/users/profile` endpoint already returns `401` for unauthenticated requests and is unchanged.

## Data Model Changes
None.