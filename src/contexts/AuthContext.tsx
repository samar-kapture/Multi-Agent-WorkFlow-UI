import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  clientId: string | null;
  login: (username: string, clientId: string) => void;
  logout: () => void;
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

  useEffect(() => {
    // Check if user is already logged in on app start
    const storedAuth = localStorage.getItem("isAuthenticated");
    const storedUsername = localStorage.getItem("username");
    const storedClientId = localStorage.getItem("clientId");
    
    if (storedAuth === "true" && storedUsername && storedClientId) {
      setIsAuthenticated(true);
      setUsername(storedUsername);
      setClientId(storedClientId);
    }
  }, []);

  const login = (username: string, clientId: string) => {
    setIsAuthenticated(true);
    setUsername(username);
    setClientId(clientId);
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("username", username);
    localStorage.setItem("clientId", clientId);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUsername(null);
    setClientId(null);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("username");
    localStorage.removeItem("clientId");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, clientId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
