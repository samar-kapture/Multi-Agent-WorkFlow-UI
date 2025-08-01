import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { API_BASE_URL } from '@/config';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  clientId: string | null;
  accessToken: string | null;
  login: (username: string, password: string, clientId: string) => Promise<boolean>;
  logout: () => Promise<void>;
  getAuthHeaders: () => { Authorization: string };
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Inactivity timeout - 6 hours
  const INACTIVITY_TIMEOUT = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

  const logout = useCallback(async () => {
    try {
      // Call logout API to invalidate refresh token
      if (refreshTokenValue) {
        await fetch(`${API_BASE_URL}/multiagent-core/auth/logout`, {
          method: 'POST',
          headers: {
            'accept': '*/*',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: refreshTokenValue
          })
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
      // Continue with local logout even if API call fails
    }
    
    // Clear local state and storage
    setIsAuthenticated(false);
    setUsername(null);
    setClientId(null);
    setAccessToken(null);
    setRefreshTokenValue(null);
    
    // Clear timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("username");
    localStorage.removeItem("clientId");
    localStorage.removeItem("apiClientId");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }, [refreshTokenValue]);

  // Function to reset the inactivity timer
  const resetInactivityTimer = useCallback(() => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Only set timer if user is authenticated
    if (isAuthenticated) {
      const newTimer = setTimeout(() => {
        console.log('User inactive for 6 hours, automatically logging out...');
        logout();
      }, INACTIVITY_TIMEOUT);
      
      inactivityTimerRef.current = newTimer;
    }
  }, [isAuthenticated, logout]);

  // Start inactivity monitoring when user is authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear timer if user is not authenticated
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    // List of events that indicate user activity
    const activityEvents = [
      'mousedown',    // Mouse clicks
      'mousemove',    // Mouse movement
      'keypress',     // Keyboard input
      'keydown',      // Key press down
      'scroll',       // Page scrolling
      'touchstart',   // Touch on mobile
      'click',        // Any clicks
      'focus',        // Window focus
      'wheel',        // Mouse wheel
    ];

    // Add event listeners for all activity events
    const addEventListeners = () => {
      activityEvents.forEach(event => {
        document.addEventListener(event, resetInactivityTimer, true);
      });
    };

    // Remove event listeners
    const removeEventListeners = () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer, true);
      });
    };

    // Start monitoring
    addEventListeners();
    resetInactivityTimer(); // Start initial timer

    // Cleanup function
    return () => {
      removeEventListeners();
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isAuthenticated, resetInactivityTimer]);

  useEffect(() => {
    // Check if user is already logged in on app start
    const storedAuth = localStorage.getItem("isAuthenticated");
    const storedUsername = localStorage.getItem("username");
    const storedClientId = localStorage.getItem("clientId");
    const storedAccessToken = localStorage.getItem("accessToken");
    const storedRefreshToken = localStorage.getItem("refreshToken");
    
    if (storedAuth === "true" && storedUsername && storedClientId && storedAccessToken) {
      setIsAuthenticated(true);
      setUsername(storedUsername);
      setClientId(storedClientId);
      setAccessToken(storedAccessToken);
      setRefreshTokenValue(storedRefreshToken);
      
      // Start token refresh timer
      startTokenRefreshTimer();
    }
  }, []); // Remove resetInactivityTimer dependency to avoid infinite loops

  // Separate useEffect to initialize inactivity timer when authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      resetInactivityTimer();
    }
  }, [isAuthenticated, resetInactivityTimer]);

  const startTokenRefreshTimer = () => {
    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    
    // Refresh token every 14 minutes (before 15 minute expiry)
    const interval = setInterval(async () => {
      const success = await refreshToken();
      if (!success) {
        logout();
      }
    }, 14 * 60 * 1000); // 14 minutes

    refreshIntervalRef.current = interval;
  };

  const login = async (username: string, password: string, clientId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/multiagent-core/auth/login?client_id=${clientId}`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Fetch client name from clients API
        let clientName = clientId; // fallback to clientId
        try {
          const clientsResponse = await fetch(`${API_BASE_URL}/multiagent-core/clients/?page=1&size=50`, {
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (clientsResponse.ok) {
            const clientsData = await clientsResponse.json();
            if (clientsData.clients && Array.isArray(clientsData.clients)) {
              const foundClient = clientsData.clients.find((client: any) => client.client_id === clientId);
              if (foundClient) {
                clientName = foundClient.client_name;
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch client name:', error);
        }
        
        setIsAuthenticated(true);
        setUsername(username);
        setClientId(clientName); // Store client name as clientId for display
        setAccessToken(data.access_token);
        setRefreshTokenValue(data.refresh_token);
        
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("username", username);
        localStorage.setItem("clientId", clientName); // Store client name as clientId for display
        localStorage.setItem("apiClientId", clientId); // Store actual client_id for API calls
        localStorage.setItem("accessToken", data.access_token);
        localStorage.setItem("refreshToken", data.refresh_token);
        
        // Start token refresh timer
        startTokenRefreshTimer();
        
        // Start inactivity monitoring
        resetInactivityTimer();
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    if (!refreshTokenValue) return false;
    
    try {
      const response = await fetch(`${API_BASE_URL}/multiagent-core/auth/refresh`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshTokenValue
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        setAccessToken(data.access_token);
        setRefreshTokenValue(data.refresh_token);
        
        localStorage.setItem("accessToken", data.access_token);
        localStorage.setItem("refreshToken", data.refresh_token);
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  const getAuthHeaders = () => {
    return {
      Authorization: `Bearer ${accessToken}`
    };
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      username, 
      clientId, 
      accessToken,
      login, 
      logout, 
      getAuthHeaders,
      refreshToken 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
