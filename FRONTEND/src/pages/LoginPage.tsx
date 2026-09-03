```tsx
/**
 * LoginPage.tsx
 *
 * Login page component for the User Management System.
 *
 * US-001: Reads `location.state.authRequired` set by `ProtectedRoute` when an
 * unauthenticated user is redirected from a protected route. When the flag is
 * present, an accessible inline alert is displayed informing the user that
 * authentication is required. The alert auto-dismisses after 8 seconds or can
 * be manually closed. After successful login the alert is no longer rendered.
 *
 * AC-5: When `location.state.from` is present, the user is navigated to that
 * path after a successful login instead of the default post-login destination.
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LocationState {
  authRequired?: boolean;
  from?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTH_REQUIRED_MESSAGE = "You must be logged in to view that page.";
const AUTO_DISMISS_DELAY_MS = 8_000;
const DEFAULT_POST_LOGIN_PATH = "/";

// ---------------------------------------------------------------------------
// Inline Alert component (uses shadcn/ui Alert styling conventions)
// ---------------------------------------------------------------------------

interface AuthAlertProps {
  message: string;
  onDismiss: () => void;
}

function AuthAlert({ message, onDismiss }: AuthAlertProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
    >
      <AlertCircle
        className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400"
        aria-hidden="true"
      />
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-auto shrink-0 rounded p-0.5 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-900 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1 dark:text-yellow-400 dark:hover:bg-yellow-900 dark:hover:text-yellow-100"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LoginPage
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as LocationState | null;
  const authRequired = state?.authRequired === true;
  const redirectTo = state?.from ?? DEFAULT_POST_LOGIN_PATH;

  const [showAuthAlert, setShowAuthAlert] = useState<boolean>(authRequired);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Auto-dismiss the auth-required alert after a timeout
  // ---------------------------------------------------------------------------

  const dismissAuthAlert = useCallback(() => {
    setShowAuthAlert(false);
  }, []);

  useEffect(() => {
    if (!showAuthAlert) return;

    const timerId = window.setTimeout(dismissAuthAlert, AUTO_DISMISS_DELAY_MS);
    return () => window.clearTimeout(timerId);
  }, [showAuthAlert, dismissAuthAlert]);

  // ---------------------------------------------------------------------------
  // Form submission
  // ---------------------------------------------------------------------------

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        const message =
          body.message ?? "Login failed. Please check your credentials.";
        setLoginError(message);
        return;
      }

      // Dismiss the auth-required notification now that login succeeded (AC-4).
      setShowAuthAlert(false);

      // Navigate to the originally requested path (AC-5) or the default home.
      navigate(redirectTo, { replace: true });
    } catch {
      setLoginError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Page heading */}
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>

        {/* Auth-required notification — only shown after a redirect (US-001 AC-2) */}
        {showAuthAlert && (
          <AuthAlert message={AUTH_REQUIRED_MESSAGE} onDismiss={dismissAuthAlert} />
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              placeholder="you@example.com"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              placeholder="••••••••"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Login error message */}
          {loginError !== null && (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
```