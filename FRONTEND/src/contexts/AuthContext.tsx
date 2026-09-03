```tsx
/**
 * AuthContext.tsx
 *
 * Provides authentication state to the React component tree via a context
 * and a `useAuth` hook. Reads auth state from the presence of a session token.
 *
 * Requirements: US-001
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthContextValue {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Derive initial auth state from session token presence
    return !!sessionStorage.getItem('sessionToken') || !!localStorage.getItem('sessionToken');
  });

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the current authentication context. Must be used within an
 * AuthProvider, or a test-provided mock.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
```