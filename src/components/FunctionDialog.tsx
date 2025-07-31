import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import Editor from '@monaco-editor/react';
import { Tool } from "@/services/api";
import { API_BASE_URL, CLIENT_ID } from "@/config";
import { Upload } from "lucide-react";

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
    knowledgebase_id?: string;
    isKnowledgeBase?: boolean;
  }) => void;
  initialTool?: Tool | null;
}

export const FunctionDialog = ({ open, onOpenChange, onSave, initialTool }: FunctionDialogProps) => {
  // Tool type: true = Custom Function, false = Knowledge Base
  const [isCustomFunction, setIsCustomFunction] = useState(true);
  const [functionName, setFunctionName] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState(`# Function implementation\ndef function_name():\n    # Your code here\n    return {\n        'success': True,\n        'data': 'Function executed successfully'\n    }\n`);
  const [entryFunction, setEntryFunction] = useState("");
  const [queryFields, setQueryFields] = useState([
    { key: '', description: '', type: '' }
  ]);
  const [requirements, setRequirements] = useState<string[]>([""]);
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([{ key: '', value: '' }]);
  
  // Knowledge Base specific states
  const [kbName, setKbName] = useState("");
  const [kbDescription, setKbDescription] = useState("");
  const [kbFile, setKbFile] = useState<File | null>(null);
  const [kbType, setKbType] = useState("RAG");
  const [embeddingTopK, setEmbeddingTopK] = useState(4);
  const [embeddingThreshold, setEmbeddingThreshold] = useState(0.5);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [embeddingModel, setEmbeddingModel] = useState("");
  const [modelKey, setModelKey] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [polling, setPolling] = useState(false);
  const [pollingMsg, setPollingMsg] = useState("");
  let pollingInterval: NodeJS.Timeout | null = null;

  useEffect(() => {
    if (initialTool) {
      setIsCustomFunction(true); // Default to custom function for existing tools
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
      setIsCustomFunction(true);
      setFunctionName("");
      setDescription("");
      setEntryFunction("");
      setQueryFields([{ key: '', description: '', type: '' }]);
      setRequirements([""]);
      setEnvVars([{ key: '', value: '' }]);
      setCode(`# Function implementation\ndef function_name():\n    # Your code here\n    return {\n        'success': True,\n        'data': 'Function executed successfully'\n    }\n`);
      // Reset Knowledge Base fields
      setKbName("");
      setKbDescription("");
      setKbFile(null);
      setKbType("RAG");
      setEmbeddingTopK(4);
      setEmbeddingThreshold(0.5);
      setShowAdvancedOptions(false);
      setEmbeddingModel("");
      setModelKey("");
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

  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setKbFile(file);
    }
  };

  // Polling is now handled in ToolLibrary, not here

  const handleSave = async () => {
    setError("");
    setPolling(false);
    setPollingMsg("");
    
    if (isCustomFunction) {
      // Custom Function validation
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
    } else {
      // Knowledge Base validation
      if (!kbName.trim() || !kbDescription.trim() || !kbFile) {
        setError("Knowledge Base name, description, and file are required.");
        return;
      }
      if (embeddingTopK < 1 || embeddingTopK > 10) {
        setError("Embedding top_k must be between 1 and 10.");
        return;
      }
      if (embeddingThreshold < 0.0 || embeddingThreshold > 1.0) {
        setError("Embedding threshold must be between 0.0 and 1.0.");
        return;
      }
    }
    
    setLoading(true);
    try {
      if (isCustomFunction) {
        // Handle Custom Function creation/update (existing logic)
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
          const url = `${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/tools/${toolId}?${params.toString()}`;
          const response = await fetch(url, {
            method: "PUT",
            headers: {
              accept: "application/json",
              "Content-Type": "text/plain",
              // 'ngrok-skip-browser-warning': '69420'
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
            resetForm();
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
        const url = `${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/tools?${params.toString()}`;
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
          resetForm();
          setLoading(false);
          onOpenChange(false);
        } else {
          setError("Unexpected response from server.");
          setLoading(false);
        }
      } else {
        // Handle Knowledge Base creation
        try {
          const formData = new FormData();
          formData.append('file', kbFile);

          const params = new URLSearchParams({
            knowledgebase_name: kbName.trim(),
            description: kbDescription.trim(),
            kb_type: kbType,
            embedding_top_k: embeddingTopK.toString(),
            embedding_threshold: embeddingThreshold.toString()
          });

          const response = await fetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/knowledgebases?${params.toString()}`, {
            method: "POST",
            headers: {
              'accept': 'application/json',
              // 'ngrok-skip-browser-warning': '69420'
            },
            body: formData
          });

          if (!response.ok) {
            setError("Failed to create knowledge base. Please check your input and try again.");
            setLoading(false);
            return;
          }

          const kbResp = await response.json();
          if (kbResp.status === "success" && kbResp.knowledgebase_id) {
            // Pass KB info to parent including the knowledgebase_id for binding
            onSave({
              name: kbName,
              description: kbDescription,
              code: "", // KB doesn't have code
              original_name: kbName,
              status: 'success',
              knowledgebase_id: kbResp.knowledgebase_id,
              isKnowledgeBase: true,
            });
            resetForm();
            setLoading(false);
            onOpenChange(false);
          } else {
            setError("Unexpected response from server.");
            setLoading(false);
          }
        } catch (error) {
          setError("Failed to create knowledge base. Please try again.");
          setLoading(false);
        }
      }
    } catch (e) {
      setError("Failed to " + (initialTool ? "update" : "create") + " tool. Please try again.");
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFunctionName("");
    setDescription("");
    setEntryFunction("");
    setQueryFields([{ key: '', description: '', type: '' }]);
    setRequirements([""]);
    setEnvVars([{ key: '', value: '' }]);
    setCode("");
    setKbName("");
    setKbDescription("");
    setKbFile(null);
    setKbType("RAG");
    setEmbeddingTopK(4);
    setEmbeddingThreshold(0.5);
    setShowAdvancedOptions(false);
    setEmbeddingModel("");
    setModelKey("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]" aria-describedby="function-dialog-desc">
        <span id="function-dialog-desc" style={{ display: 'none' }}>
          {initialTool ? 'Edit an existing tool. Fill out the fields and update the tool.' : 'Create a new tool. Fill out the fields and save.'}
        </span>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <DialogTitle className="flex items-center gap-2">
                  {initialTool ? 'Edit Tool' : (isCustomFunction ? 'Create Tool' : 'Create Knowledge Base')}
                </DialogTitle>
              </div>
            </div>
            {/* Tool Type Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Tool Type:</span>
              <Switch
                checked={isCustomFunction}
                onCheckedChange={setIsCustomFunction}
                id="tool-type-toggle"
                disabled={!!initialTool} // Disable toggle when editing existing tool
              />
              <span className="ml-2 text-sm">
                {isCustomFunction ? "Custom Function" : "Knowledge Base"}
              </span>
            </div>
          </div>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6 h-full">
          {/* Left side - Form (scrollable) */}
          <div className="space-y-4 flex flex-col h-full max-h-[70vh] overflow-auto scrollbar-thin pr-2 pl-1">
            {isCustomFunction ? (
              // Custom Function Form
              <>
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
                  <Label htmlFor="entry-function">Entry Function Name</Label>
                  <Input
                    id="entry-function"
                    placeholder="e.g. main_function"
                    value={entryFunction}
                    onChange={e => setEntryFunction(e.target.value)}
                    className="focus:ring-2 focus:ring-offset-2"
                  />
                </div>
                <div className="space-y-2 px-1">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter function description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="focus:ring-2 focus:ring-offset-2"
                  />
                </div>
                <div className="space-y-2 px-1">
                  <Label>Query Description</Label>
                  {queryFields.map((q, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 items-center px-1">
                      <Input
                        placeholder="Key Name"
                        value={q.key}
                        onChange={e => handleQueryFieldChange(idx, 'key', e.target.value)}
                        className="w-1/4 min-w-0 focus:ring-2 focus:ring-offset-1"
                      />
                      <Input
                        placeholder="Key Description"
                        value={q.description}
                        onChange={e => handleQueryFieldChange(idx, 'description', e.target.value)}
                        className="w-2/4 min-w-0 focus:ring-2 focus:ring-offset-1"
                      />
                      <Input
                        placeholder="Type (e.g. str, int)"
                        value={q.type}
                        onChange={e => handleQueryFieldChange(idx, 'type', e.target.value)}
                        className="w-1/4 min-w-0 focus:ring-2 focus:ring-offset-1"
                      />
                      {queryFields.length > 1 && (
                        <Button type="button" variant="ghost" onClick={() => handleRemoveQueryField(idx)} className="text-destructive px-2 flex-shrink-0">✕</Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={handleAddQueryField} className="mt-1 ml-1">+ Add Field</Button>
                </div>
                <div className="space-y-2 px-1">
                  <Label>Requirements</Label>
                  {requirements.map((req, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 items-center px-1">
                      <Input
                        placeholder="Requirement name"
                        value={req}
                        onChange={e => handleRequirementChange(idx, e.target.value)}
                        className="flex-1 min-w-0 focus:ring-2 focus:ring-offset-1"
                      />
                      {requirements.length > 1 && (
                        <Button type="button" variant="ghost" onClick={() => handleRemoveRequirement(idx)} className="text-destructive px-2 flex-shrink-0">✕</Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={handleAddRequirement} className="mt-1 ml-1">+ Add Requirement</Button>
                </div>
                <div className="space-y-2 px-1">
                  <Label>Env Vars</Label>
                  {envVars.map((ev, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 items-center px-1">
                      <Input
                        placeholder="Key"
                        value={ev.key}
                        onChange={e => handleEnvVarChange(idx, 'key', e.target.value)}
                        className="flex-1 min-w-0 focus:ring-2 focus:ring-offset-1"
                      />
                      <Input
                        placeholder="Value"
                        value={ev.value}
                        onChange={e => handleEnvVarChange(idx, 'value', e.target.value)}
                        className="flex-1 min-w-0 focus:ring-2 focus:ring-offset-1"
                      />
                      {envVars.length > 1 && (
                        <Button type="button" variant="ghost" onClick={() => handleRemoveEnvVar(idx)} className="text-destructive px-2 flex-shrink-0">✕</Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={handleAddEnvVar} className="mt-1 ml-1">+ Add Env Var</Button>
                </div>
              </>
            ) : (
              // Knowledge Base Form
              <>
                <div className="space-y-2 px-1">
                  <Label htmlFor="kb-name">Knowledge Base Name</Label>
                  <Input
                    id="kb-name"
                    placeholder="Enter knowledge base name"
                    value={kbName}
                    onChange={(e) => setKbName(e.target.value)}
                    className="focus:ring-2 focus:ring-offset-2"
                  />
                </div>
                <div className="space-y-2 px-1">
                  <Label htmlFor="kb-description">Description</Label>
                  <Textarea
                    id="kb-description"
                    placeholder="Enter knowledge base description"
                    value={kbDescription}
                    onChange={(e) => setKbDescription(e.target.value)}
                    rows={3}
                    className="focus:ring-2 focus:ring-offset-2"
                  />
                </div>
                <div className="space-y-2 px-1">
                  <Label htmlFor="kb-type">Knowledge Base Type</Label>
                  <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/50">
                    <input
                      type="radio"
                      id="rag-type"
                      name="kb-type"
                      checked={kbType === "RAG"}
                      onChange={() => setKbType("RAG")}
                      className="w-4 h-4 text-primary"
                    />
                    <Label htmlFor="rag-type" className="text-sm font-medium cursor-pointer flex-1">RAG (Retrieval Augmented Generation)</Label>
                  </div>
                </div>
                <div className="space-y-2 px-1">
                  <Label htmlFor="embedding-top-k">Embedding Top K: <span className="font-semibold text-primary">{embeddingTopK}</span></Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="embedding-top-k"
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={embeddingTopK}
                      onChange={e => setEmbeddingTopK(Number(e.target.value))}
                      className="w-full accent-primary h-2 rounded-lg appearance-none bg-border focus:outline-none focus:ring-2 focus:ring-primary transition"
                    />
                    <span className="w-8 text-right text-sm text-muted-foreground">{embeddingTopK}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Number of top results to retrieve (1-10)</p>
                </div>
                <div className="space-y-2 px-1">
                  <Label htmlFor="embedding-threshold">Embedding Threshold: <span className="font-semibold text-primary">{embeddingThreshold.toFixed(2)}</span></Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="embedding-threshold"
                      type="range"
                      min={0.0}
                      max={1.0}
                      step={0.01}
                      value={embeddingThreshold}
                      onChange={e => setEmbeddingThreshold(Number(e.target.value))}
                      className="w-full accent-primary h-2 rounded-lg appearance-none bg-border focus:outline-none focus:ring-2 focus:ring-primary transition"
                    />
                    <span className="w-12 text-right text-sm text-muted-foreground">{embeddingThreshold.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Similarity threshold for retrieving results (0.0-1.0)</p>
                </div>
                <div className="space-y-2 px-1">
                  <div className="flex items-center justify-between">
                    <Label>Advanced Options</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                      className="gap-2"
                    >
                      {showAdvancedOptions ? 'Hide' : 'Show'} Advanced
                    </Button>
                  </div>
                  {showAdvancedOptions && (
                    <div className="space-y-3 p-3 border border-border rounded-lg bg-muted/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          Coming Soon
                        </Badge>
                        <span className="text-sm text-muted-foreground">These options will be available in future releases</span>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="embedding-model">Embedding Model</Label>
                        <Input
                          id="embedding-model"
                          placeholder="e.g. text-embedding-ada-002"
                          value={embeddingModel}
                          onChange={(e) => setEmbeddingModel(e.target.value)}
                          className="focus:ring-2 focus:ring-offset-2"
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model-key">Model Key</Label>
                        <Input
                          id="model-key"
                          placeholder="Enter model API key"
                          type="password"
                          value={modelKey}
                          onChange={(e) => setModelKey(e.target.value)}
                          className="focus:ring-2 focus:ring-offset-2"
                          disabled
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2 px-1">
                  <Label htmlFor="kb-file">Upload File</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-4">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <div>
                      <input
                        id="kb-file"
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.xls"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('kb-file')?.click()}
                        className="mb-2"
                      >
                        Choose File
                      </Button>
                      {kbFile && (
                        <p className="text-sm text-muted-foreground">
                          Selected: {kbFile.name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Supported formats: PDF, DOC, DOCX, TXT, MD, CSV, XLSX, XLS
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
            {error && <div className="text-destructive text-sm pt-2 px-1">{error}</div>}
          </div>
          
          {/* Right side - Code Editor and Save Button OR Knowledge Base Preview */}
          <div className="space-y-2 flex flex-col h-full">
            {isCustomFunction ? (
              // Custom Function Code Editor
              <>
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
              </>
            ) : (
              // Knowledge Base Preview
              <>
                <Label>Knowledge Base Preview</Label>
                <div className="h-[500px] border border-border rounded-lg overflow-hidden flex-1 bg-muted/20">
                  <div className="p-6 space-y-4">
                    <div className="text-center space-y-3">
                      <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                      <div>
                        <p className="text-lg font-medium text-muted-foreground">Knowledge Base Configuration</p>
                        <p className="text-sm text-muted-foreground">Review your settings below</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 bg-card/50 p-4 rounded-lg border">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Name:</span>
                        <span className="text-sm text-muted-foreground">{kbName || "Not specified"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Type:</span>
                        <span className="text-sm text-muted-foreground">{kbType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Top K:</span>
                        <span className="text-sm text-muted-foreground">{embeddingTopK}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Threshold:</span>
                        <span className="text-sm text-muted-foreground">{embeddingThreshold.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">File:</span>
                        <span className="text-sm text-muted-foreground">{kbFile?.name || "No file selected"}</span>
                      </div>
                    </div>

                    {kbDescription && (
                      <div className="bg-card/50 p-4 rounded-lg border">
                        <p className="text-sm font-medium mb-2">Description:</p>
                        <p className="text-sm text-muted-foreground">{kbDescription}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            {polling && (
              <div className="text-center text-sm text-muted-foreground py-2">{pollingMsg}</div>
            )}
            <div className="pt-4">
              <Button 
                onClick={handleSave} 
                className="w-full" 
                disabled={loading || polling}
              >
                {loading || polling ? "Saving..." : isCustomFunction ? "Save & Deploy" : "Create Knowledge Base"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};