import { useState, useEffect } from "react";
import { API_BASE_URL, CLIENT_ID } from "@/config";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Plus, Settings, Search, Edit, Trash2 } from "lucide-react";
import { apiService } from "@/services/api";
import { FunctionDialog } from "@/components/FunctionDialog";

interface ToolLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTools: string[];
  onToolSelectionChange: (toolIds: string[]) => void;
}

export const ToolLibrary = ({ open, onOpenChange, selectedTools, onToolSelectionChange }: ToolLibraryProps) => {
  // Use the API response shape directly
  const [tools, setTools] = useState<any[]>([]);
  // Track deployment status for tools being added
  const [deployingTools, setDeployingTools] = useState<{ [task_id: string]: any }>({});
  // Track deleting status for tools
  const [deletingTools, setDeletingTools] = useState<{ [tool_id: string]: boolean }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showFunctionDialog, setShowFunctionDialog] = useState(false);
  const [editingTool, setEditingTool] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toolToDelete, setToolToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      loadTools();
    }
  }, [open]);

  const loadTools = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/multiagent-core/tools/clients/${CLIENT_ID}/tools/`, {
        headers: {
          'accept': 'application/json',
          'ngrok-skip-browser-warning': '69420'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch tools');
      const data = await res.json();
      // Always expect an array of tool objects with new API fields
      const toolsArr = Array.isArray(data?.tools) ? data.tools : Array.isArray(data) ? data : [];
      setTools(toolsArr);
    } catch (e) {
      setTools([]);
    }
  };

  // Poll deployment status for a tool
  const pollDeployStatus = (tool: any) => {
    if (!tool.task_id) return;
    setDeployingTools(prev => ({ ...prev, [tool.task_id]: { ...tool, status: 'deploying' } }));
    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/multiagent-core/celery-tasks/deploy-status/${tool.task_id}`);
        const data = await res.json();
        if (data.state === 'SUCCESS') {
          setDeployingTools(prev => {
            const copy = { ...prev };
            // Mark as deployed for a short time before removing
            copy[tool.task_id] = { ...tool, status: 'deployed' };
            setTimeout(() => {
              setDeployingTools(prev2 => {
                const copy2 = { ...prev2 };
                delete copy2[tool.task_id];
                return copy2;
              });
            }, 2000); // Show 'Deployed' for 2 seconds
            return copy;
          });
          // Reload tools from backend
          loadTools();
        } else if (data.state === 'FAILURE') {
          setDeployingTools(prev => ({ ...prev, [tool.task_id]: { ...tool, status: 'error', error: data.error || 'Deployment failed' } }));
        } else {
          // Still deploying, keep polling
          setTimeout(poll, 10000); // 10 seconds
        }
      } catch (e) {
        setDeployingTools(prev => ({ ...prev, [tool.task_id]: { ...tool, status: 'error', error: 'Failed to check deployment status' } }));
      }
    };
    setTimeout(poll, 10000); // 10 seconds
  };

  // toolData may include task_id, original_name, status
  const handleCreateTool = (toolData: any) => {
    setShowFunctionDialog(false);
    if (toolData.task_id) {
      // Add to deployingTools and start polling
      setDeployingTools(prev => ({ ...prev, [toolData.task_id]: toolData }));
      pollDeployStatus(toolData);
    } else {
      // fallback: reload tools
      loadTools();
    }
  };

  const handleUpdateTool = async (toolData: { name: string; description: string; code: string; entry_function?: string; query_description?: string; requirements?: string; env_vars?: string }) => {
    if (!editingTool) return;
    try {
      // Convert fields to correct string format for backend
      const requirementsStr = Array.isArray(toolData.requirements)
        ? JSON.stringify([...new Set([...(toolData.requirements || []), 'flask'])].filter(r => r && r.trim()))
        : (toolData.requirements || '');
      const envVarsStr = (toolData.env_vars && typeof toolData.env_vars === 'object')
        ? JSON.stringify(toolData.env_vars)
        : (toolData.env_vars || '{}');
      const queryDescStr = (toolData.query_description && typeof toolData.query_description === 'object')
        ? JSON.stringify(toolData.query_description)
        : (toolData.query_description || '{}');

      const params = new URLSearchParams({
        entry_function: toolData.entry_function || "",
        function_name: toolData.name,
        description: toolData.description,
        query_description: queryDescStr,
        requirements: requirementsStr,
        env_vars: envVarsStr,
      });
      const url = `${API_BASE_URL}/multiagent-core/tools/clients/${CLIENT_ID}/update-tools/${editingTool.tool_id}?${params.toString()}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'text/plain',
          'ngrok-skip-browser-warning': '69420'
        },
        body: toolData.code,
      });
      if (!res.ok) throw new Error('Failed to update tool');
      loadTools();
      setShowFunctionDialog(false);
      setEditingTool(null);
    } catch (error) {
      console.error('Error updating tool:', error);
    }
  };

  const confirmDeleteTool = (toolId: string) => {
    setToolToDelete(toolId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteTool = async () => {
    if (!toolToDelete) return;
    setDeleting(true);
    setDeleteDialogOpen(false); // Close the dialog immediately
    setDeletingTools(prev => ({ ...prev, [toolToDelete]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/multiagent-core/tools/clients/${CLIENT_ID}/tools`, {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': '69420'
        },
        body: JSON.stringify([toolToDelete]),
      });
      if (!res.ok) throw new Error('Failed to delete tool');
      await res.json();
      setToolToDelete(null);
      // Keep the deleting overlay for a short time after delete
      setTimeout(() => {
        setDeletingTools(prev => {
          const copy = { ...prev };
          delete copy[toolToDelete];
          return copy;
        });
        loadTools();
      }, 2000); // Show 'Deleting...' for 2 seconds
      if (selectedTools.includes(toolToDelete)) {
        onToolSelectionChange(selectedTools.filter(id => id !== toolToDelete));
      }
    } catch (error) {
      setToolToDelete(null);
      setDeletingTools(prev => {
        const copy = { ...prev };
        delete copy[toolToDelete];
        return copy;
      });
      console.error('Error deleting tool:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleEditTool = async (tool: any) => {
    try {
      const res = await fetch(`${API_BASE_URL}/multiagent-core/tools/clients/${CLIENT_ID}/tools/${tool.tool_id}`, {
        headers: {
          'accept': 'application/json',
          'ngrok-skip-browser-warning': '69420'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch tool details');
      const toolData = await res.json();
      console.log('Fetched tool data:', toolData);

      // --- Prefill fields for UI: query_description as key list, requirements as joined string, env_vars as pretty JSON ---
      // Query Description: show keys as comma-separated string (e.g. "pincode, city")
      let queryDescriptionPrefill = '';
      if (toolData.query_description) {
        let qd = toolData.query_description;
        if (typeof qd === 'string') {
          try {
            qd = JSON.parse(qd);
          } catch {
            // fallback: keep as string
          }
        }
        if (qd && typeof qd === 'object' && !Array.isArray(qd)) {
          queryDescriptionPrefill = Object.keys(qd).join(', ');
        } else if (typeof qd === 'string') {
          queryDescriptionPrefill = qd;
        }
      }

      // Requirements: pass as array, filter out 'flask'
      let requirementsArr: string[] = [];
      if (Array.isArray(toolData.requirements)) {
        requirementsArr = toolData.requirements.filter(r => r && r.trim().toLowerCase() !== 'flask');
      } else if (typeof toolData.requirements === 'string') {
        try {
          const arr = JSON.parse(toolData.requirements);
          if (Array.isArray(arr)) {
            requirementsArr = arr.filter(r => r && r.trim().toLowerCase() !== 'flask');
          } else if (toolData.requirements.trim().toLowerCase() !== 'flask' && toolData.requirements.trim()) {
            requirementsArr = [toolData.requirements];
          }
        } catch {
          if (toolData.requirements.trim().toLowerCase() !== 'flask' && toolData.requirements.trim()) {
            requirementsArr = [toolData.requirements];
          }
        }
      }

      // Env Vars: always pass as object, use environment_variables
      let envVarsObj = {};
      const envVarsSource = toolData.environment_variables || toolData.env_vars;
      if (envVarsSource) {
        if (typeof envVarsSource === 'string') {
          try {
            envVarsObj = JSON.parse(envVarsSource);
          } catch {
            envVarsObj = {};
          }
        } else if (typeof envVarsSource === 'object' && !Array.isArray(envVarsSource)) {
          envVarsObj = envVarsSource;
        }
      }

      setEditingTool({
        tool_id: toolData.tool_id,
        name: toolData.original_name || toolData.name || '',
        description: toolData.description || '',
        query_description: toolData.query_description || queryDescriptionPrefill,
        requirements: requirementsArr,
        code: toolData.code || '',
        env_vars: envVarsObj,
        entry_function: toolData.entry_function || '',
        // Add any other fields as needed
      });
      setShowFunctionDialog(true);
    } catch (error) {
      console.error('Error fetching tool details:', error);
      setEditingTool(tool); // fallback to old data if fetch fails
      setShowFunctionDialog(true);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Merge deploying tools (not yet in backend) with loaded tools
  const allTools = [
    ...Object.values(deployingTools),
    ...tools.filter(t => !Object.values(deployingTools).some(dt => dt.original_name === t.original_name)),
  ];

  const filteredTools = allTools.filter(tool =>
    (tool.original_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (tool.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Support both string[] and object[] for selectedTools
  const getSelectedToolIds = () => {
    if (!selectedTools || selectedTools.length === 0) return [];
    if (typeof selectedTools[0] === 'string') return selectedTools;
    // If full tool objects
    return selectedTools.map((t: any) => t.tool_id || t.id);
  };

  const selectedToolIds = getSelectedToolIds();

  const handleToolToggle = (toolId: string) => {
    const newSelection = selectedToolIds.includes(toolId)
      ? selectedToolIds.filter(id => id !== toolId)
      : [...selectedToolIds, toolId];
    onToolSelectionChange(newSelection);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Tool Library
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col h-full">
            {/* Header Actions */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => {
                  setEditingTool(null);
                  setShowFunctionDialog(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Tool
              </Button>
            </div>

            {/* Tools Grid */}
            <div className="flex-1 overflow-auto">
              {filteredTools.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <Settings className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No Tools Available</p>
                  <p className="text-sm mt-1">Create your first tool to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredTools.map((tool) => {
                    const isDeploying = tool.status === 'deploying';
                    const isDeployed = tool.status === 'deployed';
                    const isError = tool.status === 'error';
                    const isDeleting = deletingTools[tool.tool_id];
                    return (
                      <Card key={tool.tool_id || tool.task_id || tool.original_name} className={`relative group transition-all duration-200 border-2 ${(isDeploying || isDeleting) ? 'opacity-60 pointer-events-none' : 'hover:border-primary/60'} shadow-sm`}>
                        {/* Status overlays */}
                        {isDeploying && (
                          <div className="absolute inset-0 bg-gray-200 bg-opacity-80 flex flex-col items-center justify-center z-10 rounded-xl">
                            <span className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-gray-500 mb-2"></span>
                            <span className="text-xs text-gray-700">Deploying...</span>
                          </div>
                        )}
                        {isDeployed && (
                          <div className="absolute inset-0 bg-green-100 bg-opacity-90 flex flex-col items-center justify-center z-10 rounded-xl">
                            <span className="text-xs text-green-700 font-semibold">Deployed</span>
                          </div>
                        )}
                        {isDeleting && (
                          <div className="absolute inset-0 bg-gray-200 bg-opacity-80 flex flex-col items-center justify-center z-10 rounded-xl">
                            <span className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-gray-500 mb-2"></span>
                            <span className="text-xs text-gray-700">Deleting...</span>
                          </div>
                        )}
                        {isError && (
                          <div className="absolute inset-0 bg-red-100 bg-opacity-90 flex flex-col items-center justify-center z-10 rounded-xl">
                            <span className="text-xs text-red-700 font-semibold">Deployment Failed</span>
                            <span className="text-xs text-red-500">{tool.error}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 text-xs border-destructive text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setDeployingTools(prev => {
                                  const copy = { ...prev };
                                  if (tool.task_id) delete copy[tool.task_id];
                                  return copy;
                                });
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                        <CardHeader className="pb-2 pt-4 px-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-4">
                              <Checkbox
                                checked={selectedToolIds.includes(tool.tool_id)}
                                onCheckedChange={() => handleToolToggle(tool.tool_id)}
                                disabled={isDeploying || isError || isDeleting}
                                className="mt-1"
                              />
                              <div className="min-w-0 flex-1">
                                <CardTitle className="text-base font-semibold truncate mb-1">{tool.original_name}</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground line-clamp-2 mb-1">
                                  {tool.description}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTool(tool)}
                                className="p-1 h-7 w-7"
                                disabled={isDeploying || isError || isDeleting}
                                aria-label="Edit tool"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => confirmDeleteTool(tool.tool_id)}
                                className="p-1 h-7 w-7 text-destructive hover:text-destructive"
                                disabled={deleting || isDeploying || isError || isDeleting}
                                aria-label="Delete tool"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 pb-4 px-4">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span className="bg-muted px-2 py-0.5 rounded">Created: {tool.created_at ? formatDate(tool.created_at) : 'Just now'}</span>
                            {tool.updated_at && tool.updated_at !== tool.created_at && (
                              <Badge variant="outline" className="text-xs">Updated</Badge>
                            )}
                            {isDeploying && (
                              <Badge variant="secondary" className="text-xs">Deploying</Badge>
                            )}
                            {isDeployed && (
                              <Badge variant="secondary" className="text-xs">Deployed</Badge>
                            )}
                            {isDeleting && (
                              <Badge variant="secondary" className="text-xs">Deleting</Badge>
                            )}
                            {isError && (
                              <Badge variant="destructive" className="text-xs">Error</Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedTools.length} of {filteredTools.length} tools selected
              </div>
              <Button onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <FunctionDialog
        open={showFunctionDialog}
        onOpenChange={setShowFunctionDialog}
        onSave={editingTool ? handleUpdateTool : handleCreateTool}
        initialTool={editingTool}
      />
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tool?</DialogTitle>
          </DialogHeader>
          <div>Are you sure you want to delete this tool? This action cannot be undone.</div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTool} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};