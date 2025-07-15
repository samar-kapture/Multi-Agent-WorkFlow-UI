import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { API_BASE_URL } from "@/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, Save, Play, Settings, Plus, X, MessageCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FunctionDialog } from "@/components/FunctionDialog";
import { MessageConfigDialog } from "@/components/MessageConfigDialog";
import { PromptDialog } from "@/components/PromptDialog";
import { ToolLibrary } from "@/components/ToolLibrary";
import { apiService, Bot as BotType, Tool } from "@/services/api";
import { useLocation } from "react-router-dom";
import { Editor } from "@monaco-editor/react";

const BotCreator = () => {
  // Bot type: true = Intelligent, false = Non-Intelligent
  const [isIntelligentBot, setIsIntelligentBot] = useState(true);
  const [pythonCode, setPythonCode] = useState(`# Example Function\ndef handle_message(message):\n    # This function receives a message and returns a response\n    return f\"You said: {message}\"\n\n# Example usage:\n# response = handle_message('Hello!')\n# print(response)  # Output: You said: Hello!\n`);
  const location = useLocation();
  const [botName, setBotName] = useState("");
  const [botDescription, setBotDescription] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [selectedModel, setSelectedModel] = useState("OpenAI");
  const [engineModel] = useState("gpt-4o"); // static as per requirements
  const [engineAuth] = useState(""); // static empty
  const [maxToken, setMaxToken] = useState(400);
  const [temperature, setTemperature] = useState(0.3);
  const [closingKeyword, setClosingKeyword] = useState("");
  const [tone, setTone] = useState("casual");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [messageConfig, setMessageConfig] = useState<any>({ welcome_message: '', closing_message: '', reengagement_messages: [] });
  const [showFunctionDialog, setShowFunctionDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showToolLibrary, setShowToolLibrary] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();


  const models = ["Gemini", "OpenAI", "Deepseek"];
  const toneOptions = ["casual", "professional", "friendly"];

  // Load all tools on mount and whenever selectedTools changes
  useEffect(() => {
    loadTools();
  }, [selectedTools]);

  useEffect(() => {
    // Always check for edit param first, then clone, then fallback to state
    const editId = searchParams.get('edit');
    const stateBot = location.state?.bot;
    const isClone = location.state?.isClone;
    const cloneBotId = location.state?.bot_id;
    const botId = editId || cloneBotId;

    if (editId) {
      // Edit mode: always fetch from API
      fetch(`${API_BASE_URL}/multiagent-core/bot/clients/kapture/bots/${editId}`, {
        headers: { accept: "application/json" }
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch bot');
          return res.json();
        })
        .then(bot => {
          setBotName(bot.name || "");
          setBotDescription(bot.description || "");
          setAgentPrompt(bot.user_prompt || "");
          setSelectedModel(bot.llm_model || "OpenAI");
          setMaxToken(bot.max_token || 400);
          setTemperature(bot.temperature || 0.3);
          setClosingKeyword(bot.closing_keyword || "");
          setTone(bot.tone || "casual");
          setMessageConfig({
            welcome_message: bot.welcome_message ?? '',
            closing_message: bot.closing_message ?? '',
            reengagement_messages: bot.reengagement_messages ?? []
          });
          // Ensure selectedTools is always an array of string IDs
          const toolIds = Array.isArray(bot.tools || bot.functions)
            ? (bot.tools || bot.functions).map((t: any) => typeof t === 'object' ? t.tool_id || t.id : t)
            : [];
          setSelectedTools(toolIds);
          setTimeout(() => loadTools(), 0);
          setIsEditing(true);
          setEditingBotId(editId);
        })
        .catch(() => {
          // If fetch fails, clear form
          setBotName("");
          setBotDescription("");
          setAgentPrompt("");
          setSelectedModel("OpenAI");
          setMaxToken(400);
          setTemperature(0.3);
          setClosingKeyword("");
          setTone("casual");
          setMessageConfig({ welcome_message: '', closing_message: '', reengagement_messages: [] });
          setSelectedTools([]);
          setIsEditing(false);
          setEditingBotId(null);
        });
    } else if (isClone && cloneBotId) {
      // Clone mode: fetch from API, but set name as (Copy) and not editing
      fetch(`${API_BASE_URL}/multiagent-core/bot/clients/kapture/bots/${cloneBotId}`, {
        headers: { accept: "application/json" }
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch bot');
          return res.json();
        })
        .then(bot => {
          setBotName(`${bot.name} (Copy)` || "");
          setBotDescription(bot.description || "");
          setAgentPrompt(bot.user_prompt || "");
          setSelectedModel(bot.llm_model || "OpenAI");
          setMaxToken(bot.max_token || 400);
          setTemperature(bot.temperature || 0.3);
          setClosingKeyword(bot.closing_keyword || "");
          setTone(bot.tone || "casual");
          setMessageConfig({
            welcome_message: bot.welcome_message ?? '',
            closing_message: bot.closing_message ?? '',
            reengagement_messages: bot.reengagement_messages ?? []
          });
          const toolIds2 = Array.isArray(bot.tools || bot.functions)
            ? (bot.tools || bot.functions).map((t: any) => typeof t === 'object' ? t.tool_id || t.id : t)
            : [];
          setSelectedTools(toolIds2);
          setTimeout(() => loadTools(), 0);
          setIsEditing(false);
          setEditingBotId(null);
        })
        .catch(() => {
          // If fetch fails, fallback to stateBot if available
          if (stateBot) {
            setBotName(`${stateBot.name} (Copy)` || "");
            setBotDescription(stateBot.description || "");
            setAgentPrompt(stateBot.user_prompt || "");
            setSelectedModel(stateBot.llm_model || "OpenAI");
            setMaxToken(stateBot.max_token || 400);
            setTemperature(stateBot.temperature || 0.3);
            setClosingKeyword(stateBot.closing_keyword || "");
            setTone(stateBot.tone || "casual");
            setMessageConfig({
              welcome_message: stateBot.welcome_message ?? '',
              closing_message: stateBot.closing_message ?? '',
              reengagement_messages: stateBot.reengagement_messages ?? []
            });
            const toolIds3 = Array.isArray(stateBot.tools || stateBot.functions)
              ? (stateBot.tools || stateBot.functions).map((t: any) => typeof t === 'object' ? t.tool_id || t.id : t)
              : [];
            setSelectedTools(toolIds3);
            setTimeout(() => loadTools(), 0);
          } else {
            setBotName("");
            setBotDescription("");
            setAgentPrompt("");
            setSelectedModel("OpenAI");
            setMaxToken(400);
            setTemperature(0.3);
            setClosingKeyword("");
            setTone("casual");
            setMessageConfig({ welcome_message: '', closing_message: '', reengagement_messages: [] });
            setSelectedTools([]);
            setTimeout(() => loadTools(), 0);
          }
          setIsEditing(false);
          setEditingBotId(null);
        });
    } else if (stateBot) {
      // Fallback: prefill from navigation state (for clone)
      setBotName(isClone ? `${stateBot.name} (Copy)` : stateBot.name || "");
      setBotDescription(stateBot.description || "");
      setAgentPrompt(stateBot.user_prompt || "");
      setSelectedModel(stateBot.llm_model || "OpenAI");
      setMaxToken(stateBot.max_token || 400);
      setTemperature(stateBot.temperature || 0.3);
      setClosingKeyword(stateBot.closing_keyword || "");
      setTone(stateBot.tone || "casual");
      setMessageConfig({
        welcome_message: stateBot.welcome_message ?? '',
        closing_message: stateBot.closing_message ?? '',
        reengagement_messages: stateBot.reengagement_messages ?? []
      });
      const toolIds4 = Array.isArray(stateBot.tools || stateBot.functions)
        ? (stateBot.tools || stateBot.functions).map((t: any) => typeof t === 'object' ? t.tool_id || t.id : t)
        : [];
      setSelectedTools(toolIds4);
      setTimeout(() => loadTools(), 0);
      setIsEditing(false);
      setEditingBotId(null);
    } else {
      // If nothing, clear form
      setBotName("");
      setBotDescription("");
      setAgentPrompt("");
      setSelectedModel("OpenAI");
      setMaxToken(400);
      setTemperature(0.3);
      setClosingKeyword("");
      setTone("casual");
      setMessageConfig({ welcome_message: '', closing_message: '', reengagement_messages: [] });
      setSelectedTools([]);
      setIsEditing(false);
      setEditingBotId(null);
    }
  }, [location.state, searchParams]);

  // Always load all tools on mount (not just when selectedTools changes)
  useEffect(() => {
    loadTools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also load tools whenever selectedTools changes (to update the list)
  useEffect(() => {
    loadTools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTools]);

  // Always load the full tool objects for the selected tool IDs (fetch from backend)
  const loadTools = async () => {
    if (!selectedTools.length) {
      setAllTools([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/multiagent-core/tools/clients/kapture/tools/`, {
        headers: { 'accept': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch tools');
      const data = await res.json();
      const toolsArr = Array.isArray(data?.tools) ? data.tools : Array.isArray(data) ? data : [];
      // Map API fields to internal Tool type and filter for selectedTools (string or object)
      const mapped = toolsArr
        .filter((t: any) =>
          selectedTools.some((sel: any) =>
            sel && typeof sel === 'object'
              ? (sel.tool_id === t.tool_id || sel.id === t.tool_id)
              : sel === t.tool_id
          )
        )
        .map((t: any) => ({
          id: t.tool_id,
          name: t.original_name || t.name,
          description: t.description,
          createdAt: t.created_at || t.createdAt,
          ...t
        }));
      setAllTools(mapped);
    } catch (e) {
      setAllTools([]);
    }
  };

  const loadBotForEditing = (botId: string) => {
    const bot = apiService.getBotById(botId);
    if (bot) {
      setBotName(bot.name);
      setBotDescription(bot.description);
      setSelectedTools(bot.functions);
      setSelectedModel(bot.selectedModel);
      setAgentPrompt(bot.agentPrompt);
      setMessageConfig(bot.messageConfig);
      setIsEditing(true);
      setEditingBotId(botId);
    }
  };

  const handleSaveBot = async () => {
    if (!botName.trim()) {
      toast({
        title: "Validation Error",
        description: "Bot name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      // Compose API payload
      const payload = {
        name: botName,
        description: botDescription,
        user_prompt: agentPrompt,
        welcome_message: messageConfig?.welcome_message || "",
        closing_message: messageConfig?.closing_message || "",
        closing_keyword: closingKeyword,
        tone,
        llm_model: selectedModel,
        engine_model: engineModel,
        engine_auth: engineAuth,
        max_token: maxToken,
        temperature: temperature
      };

      let response;
      let botIdToBind = editingBotId;
      if (isEditing && editingBotId) {
        // Update existing bot (PUT)
        response = await fetch(`${API_BASE_URL}/multiagent-core/bot/clients/kapture/bots/${encodeURIComponent(editingBotId)}`,
          {
            method: 'PUT',
            headers: {
              'accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          }
        );
      } else {
        // Create new bot (POST)
        response = await fetch(`${API_BASE_URL}/multiagent-core/bot/clients/kapture/bots`, {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) throw new Error('API error');

      // Get bot id for binding tools
      if (!isEditing) {
        const botData = await response.json();
        botIdToBind = botData.bot_id || botData.id;
      }

      // Bind tools to bot
      if (botIdToBind) {
        const params = selectedTools.map(id => `tool_ids=${encodeURIComponent(id)}`).join('&');
        const bindUrl = `${API_BASE_URL}/multiagent-core/tools/clients/kapture/bots/${botIdToBind}/tools/bind?${params}`;
        const bindRes = await fetch(bindUrl, {
          method: 'POST',
          headers: { 'accept': 'application/json' },
          body: ''
        });
        if (!bindRes.ok) throw new Error('Failed to bind tools');
      }

      toast({
        title: isEditing ? "Bot Updated" : "Bot Created",
        description: `Bot "${botName}" has been ${isEditing ? 'updated' : 'created'} successfully!`,
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'save'} bot. Please try again.`,
        variant: "destructive"
      });
    }
  };

  const handleTestBot = async () => {
    if (!botName.trim()) {
      toast({
        title: "Validation Error",
        description: "Bot name is required for testing",
        variant: "destructive"
      });
      return;
    }

    try {
      await apiService.testBot('test', { input: 'test' });
      toast({
        title: "Bot Test Successful",
        description: "Your bot configuration is working correctly!",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Bot testing failed. Please check your configuration.",
        variant: "destructive"
      });
    }
  };

  const handleAddFunction = async (toolData: { name: string; description: string; code: string }) => {
    try {
      const newTool = await apiService.createTool(toolData);
      // Map API fields to internal Tool type
      const t = newTool as any;
      const mappedTool = {
        id: t.tool_id,
        name: t.original_name || t.name,
        description: t.description,
        createdAt: t.created_at || t.createdAt,
        ...newTool
      };
      setAllTools([...allTools, mappedTool]);
      setSelectedTools([...selectedTools, mappedTool.id]);
      toast({
        title: "Tool Created",
        description: `Tool \"${toolData.name}\" has been created and added to this bot.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create tool. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRemoveTool = (toolId: string) => {
    setSelectedTools(selectedTools.filter(id => id !== toolId));
  };

  const handleMessageConfig = (config: any) => {
    // Defensive: always ensure reengagement_messages is an array
    setMessageConfig({
      welcome_message: config?.welcome_message ?? '',
      closing_message: config?.closing_message ?? '',
      reengagement_messages: Array.isArray(config?.reengagement_messages) ? config.reengagement_messages : []
    });
    toast({
      title: "Message Configuration Saved",
      description: "Message settings have been updated.",
    });
  };

  const handlePromptSave = (prompt: string) => {
    setAgentPrompt(prompt);
    toast({
      title: "Agent Prompt Saved",
      description: "Agent prompt has been updated.",
    });
  };

  const getSelectedToolsData = () => {
    // Defensive: selectedTools may contain string IDs or tool objects, and sel may be null
    return allTools.filter(tool =>
      selectedTools.some((sel: any) =>
        sel && typeof sel === 'object'
          ? (sel.tool_id === tool.id || sel.id === tool.id)
          : sel === tool.id
      )
    );
  };

  return (

    <>
      <div className="container mx-auto p-8 space-y-8">
        {/* Header (no toggle here) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{isEditing ? 'Edit Bot' : 'Bot Creator'}</h1>
              <p className="text-muted-foreground">
                {isEditing ? 'Modify your intelligent agent' : 'Design and configure your intelligent agent'}
              </p>
            </div>
          </div>
          {/* Update/Create and Test buttons always visible */}
          <div className="flex gap-2">
            <Button onClick={handleTestBot} variant="outline" className="gap-2 px-4">
              <Play className="w-4 h-4" />
              Test
            </Button>
            <Button onClick={handleSaveBot} className="gap-2 px-4">
              <Save className="w-4 h-4" />
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Bot Details</CardTitle>
                <CardDescription>
                  {isIntelligentBot ? "Define your bot's basic information and identity" : "Define your bot's basic information and logic"}
                </CardDescription>
              </div>
              {/* Bot Type Toggle always visible here */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Bot Type:</span>
                <Switch
                  checked={isIntelligentBot}
                  onCheckedChange={setIsIntelligentBot}
                  id="bot-type-toggle"
                />
                <span className="ml-2 text-sm">
                  {isIntelligentBot ? "Intelligent" : "Non-Intelligent"}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bot-name">Bot Name</Label>
                <Input
                  id="bot-name"
                  placeholder="Enter bot name..."
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bot-description">Description</Label>
                <Textarea
                  id="bot-description"
                  placeholder="Describe what your bot does..."
                  value={botDescription}
                  onChange={(e) => setBotDescription(e.target.value)}
                  className="h-11 resize-none"
                />
              </div>
              {isIntelligentBot && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="closing-keyword">Closing Keyword</Label>
                    <Input
                      id="closing-keyword"
                      placeholder="e.g. goodbye"
                      value={closingKeyword}
                      onChange={(e) => setClosingKeyword(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tone">Tone</Label>
                    <div className="relative">
                      <select
                        id="tone"
                        value={tone}
                        onChange={e => setTone(e.target.value)}
                        className="h-11 w-full border border-border rounded-md px-3 bg-white text-base focus:outline-none focus:ring-2 focus:ring-primary transition shadow-sm appearance-none pr-10"
                      >
                        {toneOptions.map(option => (
                          <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        ▼
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-token">Max Token: <span className="font-semibold text-primary">{maxToken}</span></Label>
                    <div className="flex items-center gap-3">
                      <input
                        id="max-token"
                        type="range"
                        min={100}
                        max={1000}
                        step={10}
                        value={maxToken}
                        onChange={e => setMaxToken(Number(e.target.value))}
                        className="w-full accent-primary h-2 rounded-lg appearance-none bg-border focus:outline-none focus:ring-2 focus:ring-primary transition"
                      />
                      <span className="w-12 text-right text-sm text-muted-foreground">{maxToken}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature: <span className="font-semibold text-primary">{temperature}</span></Label>
                    <div className="flex items-center gap-3">
                      <input
                        id="temperature"
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={temperature}
                        onChange={e => setTemperature(Number(e.target.value))}
                        className="w-full accent-primary h-2 rounded-lg appearance-none bg-border focus:outline-none focus:ring-2 focus:ring-primary transition"
                      />
                      <span className="w-12 text-right text-sm text-muted-foreground">{temperature}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            {!isIntelligentBot && (
              <div className="space-y-2">
                <Label htmlFor="python-code">Python Code</Label>
                <div className="h-[350px] border border-code-border rounded-lg overflow-hidden">
                  <Editor
                    height="100%"
                    defaultLanguage="python"
                    value={pythonCode}
                    onChange={value => setPythonCode(value || "")}
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advanced sections only for intelligent bots */}
        {/* ...existing code... */}

        {isIntelligentBot && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Tools */}
            <div className="space-y-8">
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Settings className="w-5 h-5" />
                        Tools
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Select and manage tools/functions that are essential for the bot operations.
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowToolLibrary(true)}
                        variant="outline"
                        className="gap-2 px-4"
                      >
                        <Settings className="w-4 h-4" />
                        Manage Tools
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedTools.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                      <Settings className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No Tools Selected</p>
                      <p className="text-sm mt-1">Select tools from the library or create a new one</p>
                    </div>
                  ) : null}
                  {/* Always show selected tools summary, even if empty */}
                  <div className="space-y-3 mt-2">
                    {getSelectedToolsData().map((tool) => (
                      <div key={tool.id} className="flex items-center justify-between p-4 border border-border rounded-xl bg-card/50">
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{tool.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">{tool.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Created: {tool.createdAt ? new Date(tool.createdAt).toLocaleDateString() : ''}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTool(tool.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Model Selection, Prompt, Message Config */}
            <div className="space-y-8">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-xl">LLM Model</CardTitle>
                  <CardDescription>
                    Select the language model that will power your bot's intelligence.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    {models.map((model) => (
                      <div key={model} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                        <input
                          type="radio"
                          id={model}
                          name="model"
                          checked={selectedModel === model}
                          onChange={() => setSelectedModel(model)}
                          className="w-4 h-4 text-primary"
                        />
                        <Label htmlFor={model} className="text-sm font-medium cursor-pointer flex-1">{model}</Label>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Agent Prompt</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Configure the system prompt that defines your agent's behavior
                        </p>
                      </div>
                      <Button
                        onClick={() => setShowPromptDialog(true)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Configure
                      </Button>
                    </div>
                    {agentPrompt && (
                      <div className="p-3 bg-accent/20 border border-border rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          {agentPrompt.substring(0, 100)}
                          {agentPrompt.length > 100 ? "..." : ""}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Message Configuration</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Configure welcome, closing, and re-engagement messages
                        </p>
                      </div>
                      <Button
                        onClick={() => setShowMessageDialog(true)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Configure
                      </Button>
                    </div>
                  </div> */}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <FunctionDialog
        open={showFunctionDialog}
        onOpenChange={setShowFunctionDialog}
        onSave={handleAddFunction}
      />

      <MessageConfigDialog
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
        onSave={handleMessageConfig}
        initialConfig={{
          welcomeMessage: messageConfig?.welcome_message ?? '',
          closingMessage: messageConfig?.closing_message ?? '',
          reEngageMessages: Array.isArray(messageConfig?.reengagement_messages) ? messageConfig.reengagement_messages : []
        }}
      />

      <PromptDialog
        open={showPromptDialog}
        onOpenChange={setShowPromptDialog}
        onSave={handlePromptSave}
        initialValue={agentPrompt}
      />

      <ToolLibrary
        open={showToolLibrary}
        onOpenChange={setShowToolLibrary}
        selectedTools={selectedTools}
        onToolSelectionChange={setSelectedTools}
      />
    </>
  );
};

export default BotCreator;