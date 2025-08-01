import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config";
import { 
  Plus, 
  Trash2, 
  Users, 
  Building, 
  Shield, 
  LogOut, 
  RefreshCw,
  Eye,
  EyeOff,
  Settings
} from "lucide-react";

interface Client {
  id: string;
  client_id: string;
  name: string;
  email: string;
  created_at: string;
  status: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  client_id: string;
  role: string;
  created_at: string;
  status: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("clients");
  
  // Client form states
  const [newClientName, setNewClientName] = useState("");
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);
  
  // User form states
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserClientId, setNewUserClientId] = useState("");
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Reset password states
  const [resetUsername, setResetUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Delete confirmation states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{ id: string; name: string } | null>(null);

  // Check admin authentication
  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      toast({
        title: "Access Denied",
        description: "Admin authentication required",
        variant: "destructive",
      });
      navigate('/login');
    }
  }, [navigate, toast]);

  // Fetch clients
  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/multiagent-core/clients/?page=1&size=50`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Map the response to match our interface
        const transformedClients = data.clients.map((client: any) => ({
          id: client.id,
          client_id: client.client_id,
          name: client.client_name,
          email: client.client_id + '@example.com', // Using client_id as email base since API doesn't provide email
          created_at: client.created_at,
          status: 'active' // Default status
        }));
        setClients(transformedClients);
      } else {
        throw new Error('Failed to fetch clients');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const adminToken = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE_URL}/multiagent-core/auth/admin/users`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Map the response to ensure status field exists
        const transformedUsers = data.map((user: any) => ({
          id: user.id,
          username: user.username,
          email: user.email,
          client_id: user.client_id,
          role: user.role,
          created_at: user.created_at,
          status: user.is_active ? 'active' : 'inactive' // Use is_active for status
        }));
        setUsers(transformedUsers);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // Create client
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const adminToken = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE_URL}/multiagent-core/clients/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_name: newClientName,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Client created successfully",
        });
        setNewClientName("");
        setShowCreateClientDialog(false);
        fetchClients();
      } else {
        throw new Error('Failed to create client');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // Delete client
  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    
    setLoading(true);
    try {
      const adminToken = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE_URL}/multiagent-core/clients/${clientToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Client "${clientToDelete.name}" deleted successfully`,
        });
        fetchClients();
        setShowDeleteDialog(false);
        setClientToDelete(null);
      } else {
        throw new Error('Failed to delete client');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // Create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const adminToken = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE_URL}/multiagent-core/auth/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newUserUsername,
          email: newUserEmail,
          password: newUserPassword,
          client_id: newUserClientId,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User created successfully",
        });
        setNewUserUsername("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserClientId("");
        setShowCreateUserDialog(false);
        fetchUsers();
      } else {
        throw new Error('Failed to create user');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const adminToken = localStorage.getItem('admin_token');
      const response = await fetch(`${API_BASE_URL}/multiagent-core/auth/admin/users/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: resetUsername,
          new_password: newPassword,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Password reset successfully",
        });
        setResetUsername("");
        setNewPassword("");
        setShowResetDialog(false);
      } else {
        throw new Error('Failed to reset password');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  // Admin logout
  const handleAdminLogout = () => {
    localStorage.removeItem('admin_token');
    toast({
      title: "Logged Out",
      description: "Admin session ended",
    });
    navigate('/login');
  };

  // Load data on mount and tab change
  useEffect(() => {
    if (activeTab === "clients") {
      fetchClients();
    } else if (activeTab === "users") {
      fetchUsers();
      fetchClients(); // Also fetch clients for the dropdown
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-slate-400 text-lg">Manage clients and users</p>
            </div>
          </div>
          <Button
            onClick={handleAdminLogout}
            variant="outline"
            className="flex items-center gap-2 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Main Content */}
        <Card className="w-full bg-slate-900/80 border-slate-700 backdrop-blur-sm shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-b border-slate-700">
            <CardTitle className="flex items-center gap-3 text-white text-xl">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-white" />
              </div>
              System Administration
            </CardTitle>
            <CardDescription className="text-slate-400 text-base">
              Manage clients, users, and system settings
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800 border border-slate-700">
                <TabsTrigger 
                  value="clients" 
                  className="flex items-center gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 transition-all duration-200"
                >
                  <Building className="w-4 h-4" />
                  Client Management
                </TabsTrigger>
                <TabsTrigger 
                  value="users" 
                  className="flex items-center gap-2 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 transition-all duration-200"
                >
                  <Users className="w-4 h-4" />
                  User Management
                </TabsTrigger>
              </TabsList>

              {/* Clients Tab */}
              <TabsContent value="clients" className="mt-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Building className="w-5 h-5 text-indigo-400" />
                    Clients
                  </h3>
                  <Dialog open={showCreateClientDialog} onOpenChange={setShowCreateClientDialog}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg transition-all duration-200">
                        <Plus className="w-4 h-4" />
                        Create Client
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-700">
                      <DialogHeader>
                        <DialogTitle className="text-white text-xl">Create New Client</DialogTitle>
                        <DialogDescription className="text-slate-400">
                          Add a new client to the system
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateClient} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="client-name" className="text-slate-300">Client Name</Label>
                          <Input
                            id="client-name"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            placeholder="Enter client name"
                            required
                            className="bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowCreateClientDialog(false)}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={loading}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                          >
                            {loading ? "Creating..." : "Create Client"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="border rounded-xl border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 bg-slate-800/80">
                        <TableHead className="text-slate-300 font-semibold">Name</TableHead>
                        <TableHead className="text-slate-300 font-semibold">Client ID</TableHead>
                        <TableHead className="text-slate-300 font-semibold">Created Date</TableHead>
                        <TableHead className="text-slate-300 font-semibold">Status</TableHead>
                        <TableHead className="text-slate-300 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client) => (
                        <TableRow key={client.id} className="border-slate-700 hover:bg-slate-700/50 transition-colors duration-200">
                          <TableCell className="font-medium text-white">{client.name}</TableCell>
                          <TableCell className="text-slate-300 font-mono text-sm">{client.client_id}</TableCell>
                          <TableCell className="text-slate-300">{new Date(client.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              {client.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setClientToDelete({ id: client.client_id, name: client.name });
                                setShowDeleteDialog(true);
                              }}
                              className="flex items-center gap-1 bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 hover:text-red-300 transition-all duration-200"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Users Tab */}
              <TabsContent value="users" className="mt-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-400" />
                    Users
                  </h3>
                  <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg transition-all duration-200">
                        <Plus className="w-4 h-4" />
                        Create User
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-700">
                      <DialogHeader>
                        <DialogTitle className="text-white text-xl">Create New User</DialogTitle>
                        <DialogDescription className="text-slate-400">
                          Add a new user to the system
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateUser} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="user-username" className="text-slate-300">Username</Label>
                          <Input
                            id="user-username"
                            value={newUserUsername}
                            onChange={(e) => setNewUserUsername(e.target.value)}
                            placeholder="Enter username"
                            required
                            className="bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-email" className="text-slate-300">Email</Label>
                          <Input
                            id="user-email"
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="Enter email"
                            required
                            className="bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-password" className="text-slate-300">Password</Label>
                          <div className="relative">
                            <Input
                              id="user-password"
                              type={showPassword ? "text" : "password"}
                              value={newUserPassword}
                              onChange={(e) => setNewUserPassword(e.target.value)}
                              placeholder="Enter password"
                              required
                              className="bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-300"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-client" className="text-slate-300">Client</Label>
                          <select
                            id="user-client"
                            value={newUserClientId}
                            onChange={(e) => setNewUserClientId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                          >
                            <option value="" className="bg-slate-800">Select a client</option>
                            {clients.map((client) => (
                              <option key={client.id} value={client.client_id} className="bg-slate-800">
                                {client.name} ({client.client_id})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowCreateUserDialog(false)}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={loading}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                          >
                            {loading ? "Creating..." : "Create User"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="border rounded-xl border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 bg-slate-800/80">
                        <TableHead className="text-slate-300 font-semibold">Username</TableHead>
                        <TableHead className="text-slate-300 font-semibold">Email</TableHead>
                        <TableHead className="text-slate-300 font-semibold">Role</TableHead>
                        <TableHead className="text-slate-300 font-semibold">Created Date</TableHead>
                        <TableHead className="text-slate-300 font-semibold">Status</TableHead>
                        <TableHead className="text-slate-300 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="border-slate-700 hover:bg-slate-700/50 transition-colors duration-200">
                          <TableCell className="font-medium text-white">{user.username}</TableCell>
                          <TableCell className="text-slate-300">{user.email}</TableCell>
                          <TableCell>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                              user.role === 'admin' 
                                ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
                                : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            }`}>
                              {user.role}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-300">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                              user.status === 'active' 
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                            }`}>
                              {user.status || 'active'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setResetUsername(user.username);
                                setShowResetDialog(true);
                              }}
                              className="flex items-center gap-1 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-200"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Reset Password
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Delete Client</DialogTitle>
              <DialogDescription className="text-slate-400">
                Are you sure you want to delete the client "{clientToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setClientToDelete(null);
                }}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteClient}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? "Deleting..." : "Delete Client"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Reset User Password</DialogTitle>
              <DialogDescription className="text-slate-400">
                Enter a new password for the user
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-slate-300">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    className="bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-300"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowResetDialog(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;
