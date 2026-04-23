import { readCsrfFromCookie } from './adminAuthContext.js';

// Global handlers set by the app
let getAccessToken: (() => string | null) | null = null;
let refreshToken: (() => Promise<string>) | null = null;

/**
 * Set up global token handlers
 * Called from the App component to connect the fetcher to the auth context
 */
export function setupAdminFetcherHandlers(
  tokenGetter: () => string | null,
  tokenRefresher: () => Promise<string>
) {
  getAccessToken = tokenGetter;
  refreshToken = tokenRefresher;
}

/**
 * Admin API fetcher with auto-refresh and CSRF protection
 * - Automatically includes Authorization header with access token
 * - Automatically includes X-CSRF-Token header by reading from cookie
 * - Automatically refreshes token on 401 and retries
 * - Redirects to login on repeated 401
 */
export async function fetchAdmin(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  if (!getAccessToken || !refreshToken) {
    throw new Error('Admin fetcher not initialized. Call setupAdminFetcherHandlers first.');
  }

  let token = getAccessToken();

  // If no token, try to refresh
  if (!token) {
    try {
      token = await refreshToken();
    } catch (err) {
      // Refresh failed - need to redirect to login
      window.location.href = '/admin/login';
      throw err;
    }
  }

  const csrf = readCsrfFromCookie();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-CSRF-Token': csrf,
    ...(options.headers as Record<string, string> | undefined),
  };

  const makeRequest = async (accessToken: string) => {
    const response = await fetch(`/api/admin${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        'Authorization': `Bearer ${accessToken}`,
      },
      credentials: 'include', // Include cookies (refresh_token, csrf_token)
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      // Try to refresh token once
      try {
        const newToken = await refreshToken!();
        headers['Authorization'] = `Bearer ${newToken}`;

        // Retry the request with new token
        const retryResponse = await fetch(`/api/admin${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });

        if (!retryResponse.ok) {
          throw new Error(`HTTP ${retryResponse.status}`);
        }

        return retryResponse;
      } catch (err) {
        // Refresh or retry failed - redirect to login
        console.error('Token refresh failed:', err);
        window.location.href = '/admin/login';
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.error || `HTTP ${response.status}`);
      (error as any).status = response.status;
      throw error;
    }

    return response;
  };

  const response = await makeRequest(token);
  return response.json();
}

/**
 * Convenience methods for common HTTP verbs
 */
export async function adminGet(endpoint: string): Promise<any> {
  return fetchAdmin(endpoint, { method: 'GET' });
}

export async function adminPost(endpoint: string, data?: any): Promise<any> {
  return fetchAdmin(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function adminPut(endpoint: string, data?: any): Promise<any> {
  return fetchAdmin(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

export async function adminDelete(endpoint: string): Promise<any> {
  return fetchAdmin(endpoint, { method: 'DELETE' });
}

export async function adminPatch(endpoint: string, data?: any): Promise<any> {
  return fetchAdmin(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}
