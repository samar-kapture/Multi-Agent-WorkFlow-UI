import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Editor from '@monaco-editor/react';
import { Tool } from "@/services/api";
import { API_BASE_URL, CLIENT_ID } from "@/config";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";

interface FunctionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (func: {
    name: string;
    description: string;
    code: string;
    task_id?: string;
    original_name?: string;
    status?: string;
  }) => void;
  initialTool?: Tool | null;
}

export const FunctionDialog = ({ open, onOpenChange, onSave, initialTool }: FunctionDialogProps) => {
  const [functionName, setFunctionName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState(`# Function implementation\ndef function_name():\n    # Your code here\n    return {\n        'success': True,\n        'data': 'Function executed successfully'\n    }\n`);
  const [entryFunction, setEntryFunction] = useState("");
  const [queryFields, setQueryFields] = useState([
    { key: '', description: '', type: '' }
  ]);
  const [requirements, setRequirements] = useState<string[]>([""]);
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const authenticatedFetch = useAuthenticatedFetch();

  useEffect(() => {
    if (open && initialTool) {
      // Prefill form with initial tool data
      setFunctionName((initialTool as any).original_name || initialTool.name || "");
      setDescription(initialTool.description || "");
      setEntryFunction((initialTool as any).entry_function || "");
      
      // Prefill queryFields
      let qf = (initialTool as any).query_description || (initialTool as any).query_fields;
      const queryFieldsArray = [];
      
      if (qf && typeof qf === 'object' && !Array.isArray(qf)) {
        // Handle object format: {"key": {"description": "desc", "type": "type"}}
        for (const key in qf) {
          if (qf.hasOwnProperty(key)) {
            queryFieldsArray.push({
              key: key,
              description: qf[key].description || "",
              type: qf[key].type || "str"
            });
          }
        }
      } else if (Array.isArray(qf) && qf.length > 0) {
        // Handle array format (legacy)
        queryFieldsArray.push(...qf);
      }
      
      if (queryFieldsArray.length > 0) {
        setQueryFields(queryFieldsArray);
      } else {
        setQueryFields([{ key: '', description: '', type: '' }]);
      }
      
      // Prefill requirements array (filter empty strings)
      let reqs = (initialTool as any).requirements;
      let filteredReqs: string[] = [];
      if (Array.isArray(reqs)) {
        filteredReqs = reqs.filter((r: any) => r && typeof r === 'string' && r.trim());
      } else if (typeof reqs === 'string') {
        try {
          const parsed = JSON.parse(reqs);
          if (Array.isArray(parsed)) {
            filteredReqs = parsed.filter((r: any) => r && typeof r === 'string' && r.trim());
          }
        } catch {
          if (reqs.trim()) {
            filteredReqs = [reqs];
          }
        }
      }
      setRequirements(filteredReqs.length > 0 ? filteredReqs : [""]);
      
      // Prefill envVars as key-value pairs
      let envVarsArr: { key: string; value: string }[] = [];
      const ev = (initialTool as any).env_vars;
      if (ev && typeof ev === 'object' && !Array.isArray(ev)) {
        for (const k in ev) {
          if (!Object.prototype.hasOwnProperty.call(ev, k)) continue;
          envVarsArr.push({ key: k, value: String(ev[k]) });
        }
      }
      setEnvVars(envVarsArr.length > 0 ? envVarsArr : [{ key: '', value: '' }]);
      setCode((initialTool as any).code || code);
    } else {
      // Reset form for new tool
      setFunctionName("");
      setDescription("");
      setEntryFunction("");
      setQueryFields([{ key: '', description: '', type: '' }]);
      setRequirements([""]);
      setEnvVars([{ key: '', value: '' }]);
      setCode(`# Function implementation\ndef function_name():\n    # Your code here\n    return {\n        'success': True,\n        'data': 'Function executed successfully'\n    }\n`);
    }
    setError("");
  }, [initialTool, open]);

  const handleAddQueryField = () => {
    setQueryFields([...queryFields, { key: '', description: '', type: '' }]);
  };

  const handleRemoveQueryField = (idx: number) => {
    setQueryFields(queryFields.filter((_, i) => i !== idx));
  };

  const handleQueryFieldChange = (idx: number, field: string, value: string) => {
    setQueryFields(queryFields.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const handleAddRequirement = () => {
    setRequirements([...requirements, ""]);
  };

  const handleRemoveRequirement = (idx: number) => {
    setRequirements(requirements.filter((_, i) => i !== idx));
  };

  const handleRequirementChange = (idx: number, value: string) => {
    setRequirements(requirements.map((r, i) => i === idx ? value : r));
  };

  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const handleRemoveEnvVar = (idx: number) => {
    setEnvVars(envVars.filter((_, i) => i !== idx));
  };

  const handleEnvVarChange = (idx: number, field: string, value: string) => {
    setEnvVars(envVars.map((ev, i) => i === idx ? { ...ev, [field]: value } : ev));
  };

  const handleSave = async () => {
    // Custom Function validation
    if (!functionName.trim()) {
      setError("Function name is required");
      return;
    }

    if (!entryFunction.trim()) {
      setError("Entry function is required");
      return;
    }

    if (!code.trim()) {
      setError("Function code is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Handle Custom Function creation/update
      const filteredQueryFields = queryFields.filter(qf => qf.key.trim() || qf.description.trim() || qf.type.trim());
      const filteredRequirements = requirements.filter(r => r.trim());
      
      // Add flask as default requirement and remove duplicates
      const allRequirements = ["flask", ...filteredRequirements];
      const uniqueRequirements = Array.from(new Set(allRequirements.map(r => r.toLowerCase())))
        .map(lowerReq => allRequirements.find(req => req.toLowerCase() === lowerReq))
        .filter(Boolean) as string[];
      
      const filteredEnvVars = envVars.filter(ev => ev.key.trim() || ev.value.trim());
      
      // Convert envVars array to object format
      const envVarsObj: { [key: string]: string } = {};
      filteredEnvVars.forEach(ev => {
        if (ev.key.trim()) {
          envVarsObj[ev.key.trim()] = ev.value;
        }
      });

      // Convert queryFields to the required format: {"key": {"description": "desc", "type": "type"}}
      const queryDescription: { [key: string]: { description: string; type: string } } = {};
      filteredQueryFields.forEach(qf => {
        if (qf.key.trim()) {
          queryDescription[qf.key.trim()] = {
            description: qf.description || "",
            type: qf.type || "str"
          };
        }
      });

      // Prepare query parameters
      const queryParams = new URLSearchParams({
        original_name: functionName,
        description: description,
        entry_function: entryFunction,
        query_description: JSON.stringify(queryDescription),
        requirements: JSON.stringify(uniqueRequirements),
        env_vars: JSON.stringify(envVarsObj)
      });

      let response;
      if (initialTool) {
        // Update existing tool
        response = await authenticatedFetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/tools/${(initialTool as any).tool_id}?${queryParams}`, {
          method: 'PUT',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'text/plain',
          },
          body: code
        });
      } else {
        // Create new tool
        response = await authenticatedFetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/tools?${queryParams}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'text/plain',
          },
          body: code
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // If creating new tool, start polling for deployment status
      if (!initialTool && result.task_id) {
        // Close dialog immediately and let ToolLibrary handle the deployment status
        onSave({
          name: functionName,
          description: description,
          code: code,
          task_id: result.task_id,
          original_name: functionName,
          status: 'deploying',
          ...result
        });
        setLoading(false);
      } else {
        onSave({
          name: functionName,
          description: description,
          code: code,
          ...result
        });
        setLoading(false);
      }
    } catch (error) {
      console.error('Error saving function:', error);
      setError(error instanceof Error ? error.message : 'Failed to save function');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              {initialTool ? 'Edit Tool' : 'Create Tool'}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6 flex-1 px-6 pb-3 min-h-0">
          {/* Left side - Form (scrollable) */}
          <div className="space-y-4 overflow-y-auto scrollbar-thin pr-2 min-h-0">
            {/* Custom Function Form */}
            <div className="space-y-2 px-1">
              <Label htmlFor="function-name">Function Name</Label>
              <Input
                id="function-name"
                placeholder="Enter name"
                value={functionName}
                onChange={(e) => setFunctionName(e.target.value)}
                className="focus:ring-2 focus:ring-offset-2"
              />
            </div>

            <div className="space-y-2 px-1">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this function does"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="focus:ring-2 focus:ring-offset-2"
              />
            </div>

            <div className="space-y-2 px-1">
              <Label htmlFor="entry-function">Entry Function</Label>
              <Input
                id="entry-function"
                placeholder="main_function_name"
                value={entryFunction}
                onChange={(e) => setEntryFunction(e.target.value)}
                className="focus:ring-2 focus:ring-offset-2"
              />
            </div>

            {/* Query Fields */}
            <div className="space-y-3 px-1">
              <div className="flex items-center justify-between">
                <Label>Query Fields</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddQueryField}
                  className="text-xs px-2 py-1"
                >
                  Add Field
                </Button>
              </div>
              {queryFields.map((field, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <Input
                      placeholder="Key"
                      value={field.key}
                      onChange={(e) => handleQueryFieldChange(idx, 'key', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="col-span-5">
                    <Input
                      placeholder="Description"
                      value={field.description}
                      onChange={(e) => handleQueryFieldChange(idx, 'description', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      placeholder="Type"
                      value={field.type}
                      onChange={(e) => handleQueryFieldChange(idx, 'type', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveQueryField(idx)}
                      className="text-xs px-1 py-1 h-8"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Requirements */}
            <div className="space-y-3 px-1">
              <div className="flex items-center justify-between">
                <Label>Requirements</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRequirement}
                  className="text-xs px-2 py-1"
                >
                  Add Requirement
                </Button>
              </div>
              {requirements.map((req, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    placeholder="package-name"
                    value={req}
                    onChange={(e) => handleRequirementChange(idx, e.target.value)}
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveRequirement(idx)}
                    className="text-xs px-2 py-1"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>

            {/* Environment Variables */}
            <div className="space-y-3 px-1 pb-3">
              <div className="flex items-center justify-between">
                <Label>Environment Variables</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddEnvVar}
                  className="text-xs px-2 py-1"
                >
                  Add Variable
                </Button>
              </div>
              {envVars.map((envVar, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Input
                      placeholder="Variable Name"
                      value={envVar.key}
                      onChange={(e) => handleEnvVarChange(idx, 'key', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="col-span-6">
                    <Input
                      placeholder="Value"
                      value={envVar.value}
                      onChange={(e) => handleEnvVarChange(idx, 'value', e.target.value)}
                      className="text-xs"
                      type="password"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveEnvVar(idx)}
                      className="text-xs px-1 py-1 h-8"
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Code Editor */}
          <div className="flex flex-col min-h-0">
            {/* Custom Function Code Editor */}
            <div className="flex-1 flex flex-col min-h-0">
              <Label className="mb-2">Function Code</Label>
              <div className="flex-1 border border-border rounded-lg overflow-hidden min-h-0">
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  value={code}
                  onChange={value => setCode(value || "")}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    lineNumbers: "on",
                    wordWrap: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Error and Actions */}
        <div className="border-t border-border p-6 pt-4">
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save & Deploy"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
