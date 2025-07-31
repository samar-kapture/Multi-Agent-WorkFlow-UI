import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

export const useAuthenticatedFetch = () => {
  const { getAuthHeaders, refreshToken, logout } = useAuth();

  const authenticatedFetch = useCallback(async (
    url: string, 
    options: FetchOptions = {}
  ): Promise<Response> => {
    const { skipAuth = false, ...fetchOptions } = options;
    
    // Add auth headers if not skipped
    if (!skipAuth) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        ...getAuthHeaders(),
      };
    }

    let response = await fetch(url, fetchOptions);

    // If we get a 401, try to refresh the token and retry once
    if (response.status === 401 && !skipAuth) {
      const refreshSuccess = await refreshToken();
      
      if (refreshSuccess) {
        // Retry with new token
        fetchOptions.headers = {
          ...fetchOptions.headers,
          ...getAuthHeaders(),
        };
        response = await fetch(url, fetchOptions);
      } else {
        // Refresh failed, logout user
        await logout();
        throw new Error('Authentication failed. Please login again.');
      }
    }

    return response;
  }, [getAuthHeaders, refreshToken, logout]);

  return authenticatedFetch;
};
