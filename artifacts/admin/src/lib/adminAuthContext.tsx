import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  accessToken: string | null;
  user: AdminUser | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType {
  state: AuthState;
  login: (username: string, password: string, totp?: string, tempToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Admin Auth Provider
 * Manages authentication state with in-memory access tokens
 * Refresh tokens are stored in HttpOnly cookies (handled by browser automatically)
 */
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    accessToken: null,
    user: null,
    isLoading: true,
    error: null,
  });

  // Use a ref to prevent concurrent refresh requests
  // This persists across renders so concurrent calls share one in-flight promise
  const refreshPromiseRef = useRef<Promise<string> | null>(null);

  /**
   * Refresh access token using refresh token cookie
   * Browser automatically sends refresh_token cookie with request
   */
  const refreshAccessToken = useCallback(async (): Promise<string> => {
    // If a refresh is already in progress, return the pending promise
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        const response = await fetch('/api/admin/auth/refresh', {
          method: 'POST',
          credentials: 'include', // Include cookies (refresh_token, csrf_token)
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Refresh token expired or invalid - clear auth
            setState({
              accessToken: null,
              user: null,
              isLoading: false,
              error: 'Session expired. Please log in again.',
            });
            throw new Error('Session expired');
          }
          throw new Error('Failed to refresh token');
        }

        const data = await response.json();
        setState((prev) => ({
          ...prev,
          accessToken: data.accessToken,
          error: null,
        }));

        return data.accessToken;
      } catch (err) {
        console.error('Token refresh failed:', err);
        throw err;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, []);

  /**
   * On mount, attempt to restore session by refreshing access token
   * This allows users to stay logged in across page reloads
   */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        await refreshAccessToken();
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null, // Don't show error on initial load if no session
        }));
      }
    };

    restoreSession();
  }, [refreshAccessToken]);

  /**
   * Login with credentials
   * Supports both password-only and MFA flow
   */
  const login = useCallback(
    async (username: string, password: string, totp?: string, tempToken?: string) => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        // If TOTP is provided, use the 2FA endpoint
        if (totp && tempToken) {
          const response = await fetch('/api/admin/auth/2fa', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tempToken,
              totp,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'MFA verification failed');
          }

          const data = await response.json();
          setState({
            accessToken: data.accessToken,
            user: data.user,
            isLoading: false,
            error: null,
          });
          return;
        }

        // Initial login with username/password
        const response = await fetch('/api/admin/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username,
            password,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Login failed');
        }

        const data = await response.json();

        // If MFA is required, throw a special error that includes the tempToken
        if (data.requiresMfa) {
          const mfaError: any = new Error(data.message || 'MFA required');
          mfaError.requiresMfa = true;
          mfaError.tempToken = data.tempToken;
          throw mfaError;
        }

        // Login successful
        setState({
          accessToken: data.accessToken,
          user: data.user,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Login failed';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
        throw err;
      }
    },
    []
  );

  /**
   * Logout and revoke session
   */
  const logout = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
    }));

    try {
      if (state.accessToken) {
        // Try to notify backend of logout
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${state.accessToken}`,
            'X-CSRF-Token': readCsrfFromCookie(),
            'Content-Type': 'application/json',
          },
        }).catch(() => {
          // Logout failure is acceptable - cookies will be cleared anyway
        });
      }

      setState({
        accessToken: null,
        user: null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Logout error:', err);
      // Clear state anyway
      setState({
        accessToken: null,
        user: null,
        isLoading: false,
        error: null,
      });
    }
  }, [state.accessToken]);

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        logout,
        refreshAccessToken,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 */
export function useAdminAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}

/**
 * Read CSRF token from cookie. Defensive against:
 * - document being undefined (SSR / build-time evaluation)
 * - malformed cookies (decodeURIComponent throws on bad %-escapes)
 * - cookies that contain '=' in their value
 */
export function readCsrfFromCookie(): string {
  if (typeof document === "undefined" || !document.cookie) return "";
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx);
      const rawValue = trimmed.slice(eqIdx + 1);
      if (key === 'csrf_token') {
        try {
          return decodeURIComponent(rawValue);
        } catch {
          return rawValue;
        }
      }
    }
  } catch {
    /* ignore - fall through to empty string */
  }
  return '';
}
