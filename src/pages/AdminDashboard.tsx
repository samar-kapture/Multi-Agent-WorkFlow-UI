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
          created_at: user.created_at,
          status: user.status || user.is_active ? 'active' : 'inactive' // Handle different possible status fields
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-indigo-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-300">Manage clients and users</p>
            </div>
          </div>
          <Button
            onClick={handleAdminLogout}
            variant="outline"
            className="flex items-center gap-2 border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        {/* Main Content */}
        <Card className="w-full bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Settings className="w-5 h-5" />
              System Administration
            </CardTitle>
            <CardDescription className="text-gray-300">
              Manage clients, users, and system settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="clients" className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Client Management
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  User Management
                </TabsTrigger>
              </TabsList>

              {/* Clients Tab */}
              <TabsContent value="clients" className="mt-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-white">Clients</h3>
                  <Dialog open={showCreateClientDialog} onOpenChange={setShowCreateClientDialog}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Create Client
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Client</DialogTitle>
                        <DialogDescription>
                          Add a new client to the system
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateClient} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="client-name">Client Name</Label>
                          <Input
                            id="client-name"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            placeholder="Enter client name"
                            required
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowCreateClientDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create Client"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="border rounded-lg border-gray-600 bg-gray-750">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-600">
                        <TableHead className="text-gray-300">Name</TableHead>
                        <TableHead className="text-gray-300">Client ID</TableHead>
                        <TableHead className="text-gray-300">Created Date</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.map((client) => (
                        <TableRow key={client.id} className="border-gray-600 hover:bg-gray-700">
                          <TableCell className="font-medium text-white">{client.name}</TableCell>
                          <TableCell className="text-gray-300">{client.client_id}</TableCell>
                          <TableCell className="text-gray-300">{new Date(client.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
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
                              className="flex items-center gap-1"
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
                  <h3 className="text-lg font-semibold text-white">Users</h3>
                  <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Create User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>
                          Add a new user to the system
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateUser} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="user-username">Username</Label>
                          <Input
                            id="user-username"
                            value={newUserUsername}
                            onChange={(e) => setNewUserUsername(e.target.value)}
                            placeholder="Enter username"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-email">Email</Label>
                          <Input
                            id="user-email"
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="Enter email"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-password">Password</Label>
                          <div className="relative">
                            <Input
                              id="user-password"
                              type={showPassword ? "text" : "password"}
                              value={newUserPassword}
                              onChange={(e) => setNewUserPassword(e.target.value)}
                              placeholder="Enter password"
                              required
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3"
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
                          <Label htmlFor="user-client">Client</Label>
                          <select
                            id="user-client"
                            value={newUserClientId}
                            onChange={(e) => setNewUserClientId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                          >
                            <option value="">Select a client</option>
                            {clients.map((client) => (
                              <option key={client.id} value={client.client_id}>
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
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create User"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="border rounded-lg border-gray-600 bg-gray-750">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-600">
                        <TableHead className="text-gray-300">Username</TableHead>
                        <TableHead className="text-gray-300">Email</TableHead>
                        <TableHead className="text-gray-300">Client ID</TableHead>
                        <TableHead className="text-gray-300">Created Date</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="border-gray-600 hover:bg-gray-700">
                          <TableCell className="font-medium text-white">{user.username}</TableCell>
                          <TableCell className="text-gray-300">{user.email}</TableCell>
                          <TableCell className="text-gray-300">{user.client_id}</TableCell>
                          <TableCell className="text-gray-300">{new Date(user.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              user.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
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
                              className="flex items-center gap-1"
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Client</DialogTitle>
              <DialogDescription>
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
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteClient}
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete Client"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset User Password</DialogTitle>
              <DialogDescription>
                Enter a new password for the user
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
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
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
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
