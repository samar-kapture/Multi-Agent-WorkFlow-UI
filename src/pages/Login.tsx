import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/config";
import { Eye, EyeOff, LogIn, User, Lock, Building, Shield } from "lucide-react";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [clientId, setClientId] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState("user");
  const [clients, setClients] = useState<Array<{id: string, client_id: string, name: string}>>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, logout, isAuthenticated } = useAuth();

  // Redirect if already authenticated - TEMPORARILY DISABLED FOR DEBUGGING
  useEffect(() => {
    // Temporarily comment out redirect to see the login page
    // if (isAuthenticated) {
    //   navigate("/", { replace: true });
    // }
  }, [isAuthenticated, navigate]);

  // Fetch clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        
        const response = await fetch(`${API_BASE_URL}/multiagent-core/clients/?page=1&size=50`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.clients && Array.isArray(data.clients)) {
            const transformedClients = data.clients.map((client: any) => ({
              id: client.id,
              client_id: client.client_id,
              name: client.client_name,
            }));
            setClients(transformedClients);
          } else {
            // Handle case where API returns different structure
            throw new Error('Invalid response structure');
          }
        } else {
          throw new Error(`Failed to fetch clients: ${response.status}`);
        }
      } catch (error) {
        // No fallback - just log the error and keep clients empty
        console.error('Error fetching clients:', error);
        toast({
          title: "Error",
          description: "Failed to load clients. Please try again later.",
          variant: "destructive"
        });
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await login(username, password, clientId);
      
      if (success) {
        toast({
          title: "Login Successful",
          description: `Welcome back, ${username}!`,
        });

        // Navigate to bot library page
        navigate("/");
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid credentials. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "An error occurred during login. Please try again.",
        variant: "destructive"
      });
    }

    setLoading(false);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/multiagent-core/auth/admin/login`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: adminUsername,
          password: adminPassword
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Store admin token
        localStorage.setItem('admin_token', data.access_token);
        localStorage.setItem('admin_refresh_token', data.refresh_token);
        localStorage.setItem('is_admin', 'true');
        
        toast({
          title: "Admin Login Successful",
          description: `Welcome, Admin ${adminUsername}!`,
        });

        // Navigate to admin dashboard
        navigate("/admin");
      } else {
        toast({
          title: "Admin Login Failed",
          description: "Invalid admin credentials. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Admin Login Failed",
        description: "An error occurred during admin login. Please try again.",
        variant: "destructive"
      });
    }

    setLoading(false);
  };

  // Manual clear function for debugging
  const handleManualClear = () => {
    localStorage.clear();
    logout();
    toast({
      title: "Cleared",
      description: "All authentication data cleared",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-border/50 backdrop-blur-sm bg-card/80">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Welcome !</CardTitle>
              <CardDescription className="text-muted-foreground">
                Sign in to access your Multi-Agent Workflow
              </CardDescription>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs value={loginType} onValueChange={setLoginType} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="user" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  User Login
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Admin Login
                </TabsTrigger>
              </TabsList>

              <TabsContent value="user" className="mt-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Username Field */}
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-11 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Client ID Dropdown or Manual Input */}
                  <div className="space-y-2">
                    <Label htmlFor="client-id" className="text-sm font-medium flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      Client ID
                    </Label>
                    {clients.length > 0 ? (
                      <Select value={clientId} onValueChange={setClientId} required={clients.length > 0} disabled={loadingClients}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder={
                            loadingClients 
                              ? "Loading clients..." 
                              : "Select your client"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.client_id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="client-id-manual"
                        type="text"
                        placeholder={loadingClients ? "Loading clients..." : "Enter client ID manually"}
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        required
                        disabled={loadingClients}
                        className="h-11"
                      />
                    )}
                  </div>

                  {/* Login Button */}
                  <Button
                    type="submit"
                    className="w-full h-11 mt-6"
                    disabled={loading || !username || !password || !clientId || loadingClients}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <LogIn className="w-4 h-4" />
                        Sign In
                      </div>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="admin" className="mt-6">
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  {/* Admin Username Field */}
                  <div className="space-y-2">
                    <Label htmlFor="admin-username" className="text-sm font-medium flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admin Username
                    </Label>
                    <Input
                      id="admin-username"
                      type="text"
                      placeholder="Enter admin username"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      required
                      className="h-11"
                    />
                  </div>

                  {/* Admin Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="admin-password" className="text-sm font-medium flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Admin Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showAdminPassword ? "text" : "password"}
                        placeholder="Enter admin password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        required
                        className="h-11 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                      >
                        {showAdminPassword ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Admin Login Button */}
                  <Button
                    type="submit"
                    className="w-full h-11 mt-6 bg-orange-600 hover:bg-orange-700"
                    disabled={loading || !adminUsername || !adminPassword}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Signing in...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Admin Sign In
                      </div>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Demo Credentials Info */}
            <div className="mt-6 p-4 bg-accent/10 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground text-center">
                <strong>Enter your credentials to sign in</strong><br />
                Username and password are required
              </p>
              <div className="mt-3 text-center space-y-2">
                <div className="text-xs text-muted-foreground">
                  Auth Status: {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualClear}
                  className="text-xs"
                >
                  Clear All Data (Debug)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
