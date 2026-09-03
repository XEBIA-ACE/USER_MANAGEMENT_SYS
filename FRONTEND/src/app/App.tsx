```tsx
/**
 * App.tsx
 *
 * Application root component.
 *
 * Authentication lifecycle integration:
 *  - After a successful login response, `fetchCsrfToken()` is called so the
 *    token is in memory before any subsequent mutating request is made
 *    (US-002 AC-1, AC-8).
 *  - On logout, `clearCsrfToken()` is called to wipe the in-memory token
 *    (US-002 acceptance criteria — on logout the stored CSRF token is cleared).
 *  - Errors from `fetchCsrfToken()` are caught, logged as a non-sensitive
 *    warning, and do not crash the application.  Individual 403 responses on
 *    later mutating requests will surface the problem to the user.
 *
 * Requirements: US-002
 */

import { useState, useCallback } from 'react';
import { fetchCsrfToken, clearCsrfToken, apiFetch } from '../lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface User {
  id: string;
  email: string;
  username: string;
}

type AppView = 'login' | 'app';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function App() {
  const [view, setView] = useState<AppView>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -------------------------------------------------------------------------
  // Authentication handlers
  // -------------------------------------------------------------------------

  /**
   * Handles a successful login API response.
   *
   * After the session cookie is established by the server, we fetch a CSRF
   * token so it is ready for the first mutating request the user makes.
   */
  const handleLoginSuccess = useCallback(async (user: User): Promise<void> => {
    setCurrentUser(user);

    try {
      await fetchCsrfToken();
    } catch (err) {
      // Non-sensitive warning — do NOT log the token itself.
      console.warn(
        '[App] CSRF token could not be fetched after login. ' +
          'Mutating requests may fail with 403 until the token is available. ' +
          'Error type:',
        err instanceof Error ? err.name : typeof err,
      );
      // Allow the app to proceed; individual request failures will surface the
      // 403 to the user.
    }

    setView('app');
  }, []);

  /**
   * Submits login credentials to the backend.
   */
  const handleLoginSubmit = useCallback(
    async (email: string, password: string): Promise<void> => {
      setIsSubmitting(true);
      setLoginError(null);

      try {
        const response = await apiFetch('/api/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
          rawBody: false,
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            message?: string;
          };
          setLoginError(errorData.message ?? 'Login failed. Please try again.');
          return;
        }

        const data = (await response.json()) as { user?: User };
        if (!data.user) {
          setLoginError('Unexpected response from server.');
          return;
        }

        await handleLoginSuccess(data.user);
      } catch (err) {
        setLoginError('A network error occurred. Please check your connection.');
        console.error('[App] Login request failed:', err instanceof Error ? err.message : err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [handleLoginSuccess],
  );

  /**
   * Logs the current user out.
   *
   * Clears the in-memory CSRF token first, then calls the logout endpoint.
   */
  const handleLogout = useCallback(async (): Promise<void> => {
    // Clear CSRF token from memory immediately on logout initiation.
    clearCsrfToken();

    try {
      await apiFetch('/api/v1/auth/logout', { method: 'POST' });
    } catch (err) {
      // Log but do not block — the local session state is cleared regardless.
      console.warn('[App] Logout request failed:', err instanceof Error ? err.message : err);
    }

    setCurrentUser(null);
    setView('login');
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (view === 'login') {
    return (
      <LoginView
        onSubmit={handleLoginSubmit}
        isSubmitting={isSubmitting}
        error={loginError}
      />
    );
  }

  return (
    <AuthenticatedView
      user={currentUser!}
      onLogout={handleLogout}
    />
  );
}

// ---------------------------------------------------------------------------
// Sub-views (minimal implementations — replace with real components)
// ---------------------------------------------------------------------------

interface LoginViewProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

function LoginView({ onSubmit, isSubmitting, error }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void onSubmit(email, password);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '400px' }}>
        <h1>Sign In</h1>

        {error && (
          <div role="alert" style={{ color: 'red', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email">Email</label>
          <br />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isSubmitting}
            autoComplete="email"
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password">Password</label>
          <br />
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isSubmitting}
            autoComplete="current-password"
            style={{ width: '100%' }}
          />
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

interface AuthenticatedViewProps {
  user: User;
  onLogout: () => Promise<void>;
}

function AuthenticatedView({ user, onLogout }: AuthenticatedViewProps) {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Welcome, {user.username}</h1>
      <p>{user.email}</p>
      <button onClick={() => void onLogout()}>Sign Out</button>
    </div>
  );
}
```