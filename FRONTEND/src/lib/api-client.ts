```typescript
/**
 * api-client.ts
 *
 * Centralised HTTP client for the User Management System frontend.
 *
 * Responsibilities:
 *  - Provide a typed `apiFetch` wrapper that automatically attaches the
 *    `X-CSRF-Token` header on all state-changing requests (POST, PUT, PATCH,
 *    DELETE) — satisfying AC-8 of US-002.
 *  - Export `fetchCsrfToken()` to retrieve a fresh token from the server after
 *    successful authentication.
 *  - Export `clearCsrfToken()` to wipe the in-memory token on logout.
 *
 * Security notes:
 *  - The CSRF token is stored ONLY in memory (module-level variable).  It is
 *    never written to localStorage, sessionStorage, or any persistent store.
 *  - The token value is never logged.
 *
 * Requirements: US-002
 */

// ---------------------------------------------------------------------------
// In-memory CSRF token store
// ---------------------------------------------------------------------------

/** Never log or expose this value outside of the X-CSRF-Token header. */
let _csrfToken: string | null = null;

// ---------------------------------------------------------------------------
// Public token management API
// ---------------------------------------------------------------------------

/**
 * Fetches a fresh CSRF token from `GET /api/v1/csrf-token` and stores it in
 * memory.  Must be called after a successful login before any mutating request
 * is made.
 *
 * Throws on network errors so callers can decide how to handle them.  A
 * non-2xx response (e.g. 401 if the session is somehow not yet established)
 * is treated as an error.
 */
export async function fetchCsrfToken(): Promise<void> {
  const response = await fetch('/api/v1/csrf-token', {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CSRF token: HTTP ${response.status}`);
  }

  const data = (await response.json()) as { csrfToken?: unknown };

  if (typeof data.csrfToken !== 'string' || data.csrfToken.length === 0) {
    throw new Error('CSRF token response did not contain a valid csrfToken field');
  }

  _csrfToken = data.csrfToken;
}

/**
 * Clears the in-memory CSRF token.  Must be called when the user logs out so
 * that stale tokens are not sent on any subsequent (unauthenticated) requests.
 */
export function clearCsrfToken(): void {
  _csrfToken = null;
}

/**
 * Returns `true` when a CSRF token has been fetched and is held in memory.
 * Useful for guards that need to know whether the token is ready.
 */
export function hasCsrfToken(): boolean {
  return _csrfToken !== null;
}

// ---------------------------------------------------------------------------
// Mutating methods that require CSRF protection
// ---------------------------------------------------------------------------

const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

export interface ApiFetchOptions extends RequestInit {
  /**
   * When `true` the caller has already serialised the body and set
   * Content-Type manually.  Defaults to `false`, which means a plain object
   * body will be JSON-serialised automatically.
   */
  rawBody?: boolean;
}

/**
 * A thin wrapper around the native `fetch` API that:
 *  1. Always sends cookies (`credentials: 'include'`).
 *  2. Automatically sets `Content-Type: application/json` for mutating
 *     requests whose body is a plain object.
 *  3. Attaches `X-CSRF-Token` on POST / PUT / PATCH / DELETE requests when a
 *     token is available in memory.
 *
 * Returns the raw `Response` so callers retain full control over status
 * handling.
 */
export async function apiFetch(url: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { rawBody, ...fetchOptions } = options;

  const method = (fetchOptions.method ?? 'GET').toUpperCase();
  const headers = new Headers(fetchOptions.headers);

  // Attach CSRF token for all state-changing methods.
  if (CSRF_METHODS.has(method) && _csrfToken !== null) {
    headers.set('X-CSRF-Token', _csrfToken);
  }

  // Auto-serialise plain-object bodies and set Content-Type.
  let body = fetchOptions.body;
  if (
    !rawBody &&
    body !== undefined &&
    body !== null &&
    typeof body === 'object' &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer)
  ) {
    body = JSON.stringify(body);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  return fetch(url, {
    ...fetchOptions,
    method,
    headers,
    body: body as BodyInit | undefined,
    credentials: fetchOptions.credentials ?? 'include',
  });
}
```