import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Editor from '@monaco-editor/react';
import { Tool } from "@/services/api";
import { API_BASE_URL, CLIENT_ID } from "@/config";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [polling, setPolling] = useState(false);
  const [pollingMsg, setPollingMsg] = useState("");
  let pollingInterval: NodeJS.Timeout | null = null;

  useEffect(() => {
    if (initialTool) {
      setFunctionName((initialTool as any).name);
      setDescription((initialTool as any).description);
      setEntryFunction((initialTool as any).entry_function || "");
      // Prefill queryFields from query_description (object with keys)
      let qFields: { key: string; description: string; type: string }[] = [];
      const queryDesc = (initialTool as any).query_description;
      if (queryDesc && typeof queryDesc === 'object' && !Array.isArray(queryDesc)) {
        for (const key in queryDesc) {
          if (!Object.prototype.hasOwnProperty.call(queryDesc, key)) continue;
          const val = queryDesc[key];
          let desc = '';
          let typ = '';
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            desc = typeof val.description === 'string' ? val.description : '';
            typ = typeof val.type === 'string' ? val.type : '';
          }
          qFields.push({ key, description: desc, type: typ });
        }
      }
      // Always set at least one empty field for UI
      setQueryFields(qFields.length > 0 ? qFields : [{ key: '', description: '', type: '' }]);
      // Prefill requirements as array of strings, but never show 'flask' in UI
      const reqs = (initialTool as any).requirements;
      let filteredReqs: string[] = [];
      if (Array.isArray(reqs)) {
        filteredReqs = reqs.filter(r => r.trim().toLowerCase() !== 'flask');
      } else if (typeof reqs === 'string') {
        try {
          const arr = JSON.parse(reqs);
          if (Array.isArray(arr)) {
            filteredReqs = arr.filter(r => typeof r === 'string' && r.trim().toLowerCase() !== 'flask');
          } else if (reqs.trim().toLowerCase() !== 'flask' && reqs.trim()) {
            filteredReqs = [reqs];
          }
        } catch {
          if (reqs.trim().toLowerCase() !== 'flask' && reqs.trim()) {
            filteredReqs = [reqs];
          }
        }
      }
      setRequirements(filteredReqs.length > 0 ? filteredReqs : [""]);
      // Prefill envVars as key-value pairs (always JSON object)
      let envVarsArr: { key: string; value: string }[] = [];
      const ev = (initialTool as any).env_vars;
      console.log('Initial env vars:', ev);
      if (ev && typeof ev === 'object' && !Array.isArray(ev)) {
        for (const k in ev) {
          if (!Object.prototype.hasOwnProperty.call(ev, k)) continue;
          envVarsArr.push({ key: k, value: String(ev[k]) });
        }
      }
      setEnvVars(envVarsArr.length > 0 ? envVarsArr : [{ key: '', value: '' }]);
      setCode((initialTool as any).code);
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

  // Requirements handlers
  const handleAddRequirement = () => {
    setRequirements([...requirements, ""]);
  };

  const handleRemoveRequirement = (idx: number) => {
    setRequirements(requirements.filter((_, i) => i !== idx));
  };

  const handleRequirementChange = (idx: number, value: string) => {
    setRequirements(requirements.map((req, i) => i === idx ? value : req));
  };

  // Env Vars handlers
  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const handleRemoveEnvVar = (idx: number) => {
    setEnvVars(envVars.filter((_, i) => i !== idx));
  };

  const handleEnvVarChange = (idx: number, field: 'key' | 'value', value: string) => {
    setEnvVars(envVars.map((ev, i) => i === idx ? { ...ev, [field]: value } : ev));
  };

  // Polling is now handled in ToolLibrary, not here

  const handleSave = async () => {
    setError("");
    setPolling(false);
    setPollingMsg("");
    if (!functionName.trim() || !entryFunction.trim() || !code.trim()) {
      setError("Function name, entry function, and code are required.");
      return;
    }
    // Validate query fields
    for (const q of queryFields) {
      if (!q.key.trim() || !q.type.trim()) {
        setError("Each query field must have a key and type.");
        return;
      }
    }
    setLoading(true);
    try {
      // Always include 'flask' in requirements sent to backend, never show in UI, never send duplicates
      let reqs = requirements.map(r => r.trim()).filter(Boolean);
      reqs.push('flask');
      reqs = Array.from(new Set(reqs)).filter(r => r.length > 0); // remove duplicates and empty

      // Build queryDescription JSON from fields, only non-empty key/type
      const queryDescObj: Record<string, { description: string; type: string }> = {};
      queryFields.forEach(q => {
        if (q.key.trim() && q.type.trim()) {
          queryDescObj[q.key.trim()] = {
            description: q.description.trim(),
            type: q.type.trim()
          };
        }
      });

      // Build envVars JSON from fields, only non-empty key
      const envVarsObj: Record<string, string> = {};
      envVars.forEach(ev => {
        if (ev.key.trim()) {
          envVarsObj[ev.key.trim()] = ev.value;
        }
      });

      // If editing, use correct update endpoint and PUT with query params, code as body
      const toolId = initialTool && ((initialTool as any).tool_id || (initialTool as any).id || (initialTool as any)._id);
      const buildParams = () => {
        const params = new URLSearchParams();
        if (entryFunction && entryFunction.trim()) params.append("entry_function", entryFunction);
        if (functionName && functionName.trim()) params.append("function_name", functionName);
        if (description && description.trim()) params.append("description", description);
        if (Object.keys(queryDescObj).length > 0) params.append("query_description", JSON.stringify(queryDescObj));
        (reqs.length > 0 ? reqs : ['flask']).forEach(r => {
          if (r && r.trim()) params.append("requirements", r);
        });
        if (Object.keys(envVarsObj).length > 0) params.append("env_vars", JSON.stringify(envVarsObj));
        return params;
      };

      if (toolId) {
        // UPDATE: PUT with query params, code as body
        const params = buildParams();
        const url = `${API_BASE_URL}/multiagent-core/tools/clients/${CLIENT_ID}/update-tools/${toolId}?${params.toString()}`;
        const response = await fetch(url, {
          method: "PUT",
          headers: {
            accept: "application/json",
            "Content-Type": "text/plain",
            'ngrok-skip-browser-warning': '69420'
          },
          body: code
        });
        if (!response.ok) {
          setError("Failed to update tool. Please check your input and try again.");
          setLoading(false);
          return;
        }
        const toolResp = await response.json();
        if ((toolResp.status === "task-submitted" && toolResp.task_id) || (toolResp.status === "success" && toolResp.task_id)) {
          onSave({
            name: functionName,
            description,
            code,
            task_id: toolResp.task_id,
            original_name: functionName,
            status: 'deploying',
          });
          setFunctionName("");
          setDescription("");
          setEntryFunction("");
          setQueryFields([{ key: '', description: '', type: '' }]);
          setRequirements([""]);
          setEnvVars([{ key: '', value: '' }]);
          setCode("");
          setLoading(false);
          onOpenChange(false);
        } else {
          setError("Unexpected response from server.");
          setLoading(false);
        }
        return;
      }
      // CREATE: POST with query params, code as body, Content-Type: text/plain
      const params = buildParams();
      const url = `${API_BASE_URL}/multiagent-core/tools/clients/${CLIENT_ID}/deploy-tools?${params.toString()}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          accept: "application/json",
          "Content-Type": "text/plain",
          // 'ngrok-skip-browser-warning': '69420'
        },
        body: code
      });
      if (!response.ok) {
        setError("Failed to create tool. Please check your input and try again.");
        setLoading(false);
        return;
      }
      const toolResp = await response.json();
      if ((toolResp.status === "task-submitted" && toolResp.task_id) || (toolResp.status === "success" && toolResp.task_id)) {
        // Pass tool info and task_id to parent for background polling
        onSave({
          name: functionName,
          description,
          code,
          task_id: toolResp.task_id,
          original_name: functionName,
          status: 'deploying',
        });
        // Only reset form after successful API call and onSave
        setFunctionName("");
        setDescription("");
        setEntryFunction("");
        setQueryFields([{ key: '', description: '', type: '' }]);
        setRequirements([""]);
        setEnvVars([{ key: '', value: '' }]);
        setCode("");
        setLoading(false);
        onOpenChange(false);
      } else {
        setError("Unexpected response from server.");
        setLoading(false);
      }
    } catch (e) {
      setError("Failed to " + (initialTool ? "update" : "create") + " tool. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]" aria-describedby="function-dialog-desc">
        <span id="function-dialog-desc" style={{ display: 'none' }}>
          {initialTool ? 'Edit an existing tool. Fill out the fields and update the tool.' : 'Create a new tool. Fill out the fields and save.'}
        </span>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {initialTool ? 'Edit Tool' : 'Create Tool'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 h-full">
          {/* Left side - Form (scrollable) */}
          <div className="space-y-4 flex flex-col h-full max-h-[70vh] overflow-auto scrollbar-thin pr-2">
            <div className="space-y-2">
              <Label htmlFor="function-name">Function Name</Label>
              <Input
                id="function-name"
                placeholder="Enter name"
                value={functionName}
                onChange={(e) => setFunctionName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry-function">Entry Function Name</Label>
              <Input
                id="entry-function"
                placeholder="e.g. main_function"
                value={entryFunction}
                onChange={e => setEntryFunction(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter function description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Query Description</Label>
              {queryFields.map((q, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input
                    placeholder="Key Name"
                    value={q.key}
                    onChange={e => handleQueryFieldChange(idx, 'key', e.target.value)}
                    className="w-1/4"
                  />
                  <Input
                    placeholder="Key Description"
                    value={q.description}
                    onChange={e => handleQueryFieldChange(idx, 'description', e.target.value)}
                    className="w-2/4"
                  />
                  <Input
                    placeholder="Type (e.g. str, int)"
                    value={q.type}
                    onChange={e => handleQueryFieldChange(idx, 'type', e.target.value)}
                    className="w-1/4"
                  />
                  {queryFields.length > 1 && (
                    <Button type="button" variant="ghost" onClick={() => handleRemoveQueryField(idx)} className="text-destructive px-2">✕</Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={handleAddQueryField} className="mt-1">+ Add Field</Button>
            </div>
            <div className="space-y-2">
              <Label>Requirements</Label>
              {requirements.map((req, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input
                    placeholder="Requirement name"
                    value={req}
                    onChange={e => handleRequirementChange(idx, e.target.value)}
                    className="w-4/5"
                  />
                  {requirements.length > 1 && (
                    <Button type="button" variant="ghost" onClick={() => handleRemoveRequirement(idx)} className="text-destructive px-2">✕</Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={handleAddRequirement} className="mt-1">+ Add Requirement</Button>
            </div>
            <div className="space-y-2">
              <Label>Env Vars</Label>
              {envVars.map((ev, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input
                    placeholder="Key"
                    value={ev.key}
                    onChange={e => handleEnvVarChange(idx, 'key', e.target.value)}
                    className="w-2/5"
                  />
                  <Input
                    placeholder="Value"
                    value={ev.value}
                    onChange={e => handleEnvVarChange(idx, 'value', e.target.value)}
                    className="w-2/5"
                  />
                  {envVars.length > 1 && (
                    <Button type="button" variant="ghost" onClick={() => handleRemoveEnvVar(idx)} className="text-destructive px-2">✕</Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={handleAddEnvVar} className="mt-1">+ Add Env Var</Button>
            </div>
            {error && <div className="text-destructive text-sm pt-2">{error}</div>}
          </div>
          
          {/* Right side - Code Editor and Save Button */}
          <div className="space-y-2 flex flex-col h-full">
            <Label>Function Code</Label>
            <div className="h-[500px] border border-code-border rounded-lg overflow-hidden flex-1">
              <Editor
                height="100%"
                defaultLanguage="python"
                value={code}
                onChange={(value) => setCode(value || "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  wordWrap: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
            {polling && (
              <div className="text-center text-sm text-muted-foreground py-2">{pollingMsg}</div>
            )}
            <div className="pt-4">
              <Button onClick={handleSave} className="w-full" disabled={loading || polling}>
                {loading || polling ? "Saving..." : "Save & Update"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};