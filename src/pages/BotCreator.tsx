import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { API_BASE_URL, CLIENT_ID } from "@/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Save, Play, Settings, X, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PromptDialog } from "@/components/PromptDialog";
import { ToolLibrary } from "@/components/ToolLibrary";
import { KBLibrary } from "@/components/KBLibrary";
import { apiService, Bot as BotType, Tool } from "@/services/api";
import { useLocation } from "react-router-dom";
import { Editor } from "@monaco-editor/react";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";

const BotCreator = () => {
  // Bot type: true = Intelligent, false = Non-Intelligent
  const [isIntelligentBot, setIsIntelligentBot] = useState(true);
  const [pythonCode, setPythonCode] = useState(`# Example Function\ndef handle_message(message):\n    # This function receives a message and returns a response\n    return f\"You said: {message}\"\n\n# Example usage:\n# response = handle_message('Hello!')\n# print(response)  # Output: You said: Hello!\n`);
  const location = useLocation();
  const [botName, setBotName] = useState("");
  const [botDescription, setBotDescription] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [allTools, setAllTools] = useState<Tool[]>([]);
  const [selectedKBs, setSelectedKBs] = useState<string[]>([]);
  const [allKBs, setAllKBs] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState("Azure OpenAI");
  const [engineModel] = useState("gpt-4o"); // static as per requirements
  const [engineAuth] = useState(""); // static empty
  const [maxToken, setMaxToken] = useState(400);
  const [temperature, setTemperature] = useState(0.3);
  const [closingKeyword, setClosingKeyword] = useState("");
  const [tone, setTone] = useState("casual");
  const [agentPrompt, setAgentPrompt] = useState("");
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showToolLibrary, setShowToolLibrary] = useState(false);
  const [showKBLibrary, setShowKBLibrary] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authenticatedFetch = useAuthenticatedFetch();


  const models = ["OpenAI", "Azure OpenAI", "Deepseek"];
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
      authenticatedFetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/bots/${editId}`, {
        headers: {
          accept: "application/json",
          // 'ngrok-skip-browser-warning': '69420'
        }
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch bot');
          return res.json();
        })
        .then(bot => {
          setBotName(bot.bot_name || "");
          setBotDescription(bot.bot_description || "");
          setAgentPrompt(bot.user_prompt || "");
          setSelectedModel(bot.llm_provider || "Azure OpenAI");
          setMaxToken(bot.max_token || 400);
          setTemperature(bot.temperature || 0.3);
          setClosingKeyword(bot.closing_keyword || "");
          setTone(bot.tone || "casual");
          // Ensure selectedTools is always an array of string IDs
          const toolIds = Array.isArray(bot.tools)
            ? bot.tools.map((t: any) => typeof t === 'object' ? t.tool_id || t.id : t)
            : [];
          setSelectedTools(toolIds);
          
          // Handle Knowledge Bases if present
          const kbIds = Array.isArray(bot.knowledgebases)
            ? bot.knowledgebases.map((kb: any) => typeof kb === 'object' ? kb.knowledgebase_id || kb.kb_id || kb.id : kb)
            : [];
          setSelectedKBs(kbIds);
          
          setTimeout(() => {
            loadTools();
            loadKBs();
          }, 0);
          setIsEditing(true);
          setEditingBotId(editId);
        })
        .catch(() => {
          // If fetch fails, clear form
          setBotName("");
          setBotDescription("");
          setAgentPrompt("");
          setSelectedModel("Azure OpenAI");
          setMaxToken(400);
          setTemperature(0.3);
          setClosingKeyword("");
          setTone("casual");
          setSelectedTools([]);
          setSelectedKBs([]);
          setIsEditing(false);
          setEditingBotId(null);
        });
    } else if (isClone && cloneBotId) {
      // Clone mode: fetch from API, but set name as (Copy) and not editing
      authenticatedFetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/bots/${cloneBotId}`, {
        headers: {
          accept: "application/json",
          // 'ngrok-skip-browser-warning': '69420'
        }
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch bot');
          return res.json();
        })
        .then(bot => {
          setBotName(`${bot.bot_name} (Copy)` || "");
          setBotDescription(bot.bot_description || "");
          setAgentPrompt(bot.user_prompt || "");
          setSelectedModel(bot.llm_provider || "Azure OpenAI");
          setMaxToken(bot.max_token || 400);
          setTemperature(bot.temperature || 0.3);
          setClosingKeyword(bot.closing_keyword || "");
          setTone(bot.tone || "casual");
          const toolIds2 = Array.isArray(bot.tools)
            ? bot.tools.map((t: any) => typeof t === 'object' ? t.tool_id || t.id : t)
            : [];
          setSelectedTools(toolIds2);
          
          const kbIds2 = Array.isArray(bot.knowledgebases)
            ? bot.knowledgebases.map((kb: any) => typeof kb === 'object' ? kb.knowledgebase_id || kb.kb_id || kb.id : kb)
            : [];
          setSelectedKBs(kbIds2);
          
          setTimeout(() => {
            loadTools();
            loadKBs();
          }, 0);
          setIsEditing(false);
          setEditingBotId(null);
        })
        .catch(() => {
          // If fetch fails, fallback to stateBot if available
          if (stateBot) {
            setBotName(`${stateBot.bot_name || stateBot.name} (Copy)` || "");
            setBotDescription(stateBot.bot_description || stateBot.description || "");
            setAgentPrompt(stateBot.user_prompt || "");
            setSelectedModel(stateBot.llm_provider || stateBot.llm_model || "Azure OpenAI");
            setMaxToken(stateBot.max_token || 400);
            setTemperature(stateBot.temperature || 0.3);
            setClosingKeyword(stateBot.closing_keyword || "");
            setTone(stateBot.tone || "casual");
            const toolIds3 = Array.isArray(stateBot.tools || stateBot.functions)
              ? (stateBot.tools || stateBot.functions).map((t: any) => typeof t === 'object' ? t.tool_id || t.id : t)
              : [];
            setSelectedTools(toolIds3);
            
            const kbIds3 = Array.isArray(stateBot.knowledgebases)
              ? stateBot.knowledgebases.map((kb: any) => typeof kb === 'object' ? kb.knowledgebase_id || kb.kb_id || kb.id : kb)
              : [];
            setSelectedKBs(kbIds3);
            
            setTimeout(() => {
              loadTools();
              loadKBs();
            }, 0);
          } else {
            setBotName("");
            setBotDescription("");
            setAgentPrompt("");
            setSelectedModel("Azure OpenAI");
            setMaxToken(400);
            setTemperature(0.3);
            setClosingKeyword("");
            setTone("casual");
            setSelectedTools([]);
            setSelectedKBs([]);
            setTimeout(() => {
              loadTools();
              loadKBs();
            }, 0);
          }
          setIsEditing(false);
          setEditingBotId(null);
        });
    } else if (stateBot) {
      // Fallback: prefill from navigation state (for clone)
      setBotName(isClone ? `${stateBot.bot_name || stateBot.name} (Copy)` : stateBot.bot_name || stateBot.name || "");
      setBotDescription(stateBot.bot_description || stateBot.description || "");
      setAgentPrompt(stateBot.user_prompt || "");
      setSelectedModel(stateBot.llm_provider || stateBot.llm_model || "Azure OpenAI");
      setMaxToken(stateBot.max_token || 400);
      setTemperature(stateBot.temperature || 0.3);
      setClosingKeyword(stateBot.closing_keyword || "");
      setTone(stateBot.tone || "casual");
      const toolIds4 = Array.isArray(stateBot.tools || stateBot.functions)
        ? (stateBot.tools || stateBot.functions).map((t: any) => typeof t === 'object' ? t.tool_id || t.id : t)
        : [];
      setSelectedTools(toolIds4);
      
      const kbIds4 = Array.isArray(stateBot.knowledgebases)
        ? stateBot.knowledgebases.map((kb: any) => typeof kb === 'object' ? kb.knowledgebase_id || kb.kb_id || kb.id : kb)
        : [];
      setSelectedKBs(kbIds4);
      
      setTimeout(() => {
        loadTools();
        loadKBs();
      }, 0);
      setIsEditing(false);
      setEditingBotId(null);
    } else {
      // If nothing, clear form
      setBotName("");
      setBotDescription("");
      setAgentPrompt("");
      setSelectedModel("Azure OpenAI");
      setMaxToken(400);
      setTemperature(0.3);
      setClosingKeyword("");
      setTone("casual");
      setSelectedTools([]);
      setSelectedKBs([]);
      setIsEditing(false);
      setEditingBotId(null);
    }
  }, [location.state, searchParams]);

  // Always load all tools and KBs on mount
  useEffect(() => {
    loadTools();
    loadKBs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also load tools and KBs whenever selectedTools or selectedKBs changes
  useEffect(() => {
    loadTools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTools]);

  useEffect(() => {
    loadKBs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKBs]);

  // Always load the full tool objects for the selected tool IDs (fetch from backend)
  const loadTools = async () => {
    if (!selectedTools.length) {
      setAllTools([]);
      return;
    }
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/tools`, {
        headers: {
          'accept': 'application/json',
          // 'ngrok-skip-browser-warning': '69420'
        }
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

  // Load Knowledge Bases from the backend
  const loadKBs = async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/knowledgebases`, {
        headers: {
          'accept': 'application/json',
          // 'ngrok-skip-browser-warning': '69420'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch knowledge bases');
      const data = await res.json();
      
      const kbsArr = Array.isArray(data?.knowledgebases) ? data.knowledgebases : Array.isArray(data) ? data : [];
      
      // Map all KBs to consistent format, handling both field naming conventions
      const allMapped = kbsArr.map((kb: any) => ({
        id: kb.knowledgebase_id || kb.kb_id, // Handle both field names
        name: kb.name || kb.kb_name, // Handle both field names
        description: kb.description,
        createdAt: kb.created_at || kb.createdAt,
        ...kb
      }));
      
      // If no KBs selected, show empty list but keep all KBs loaded for potential selection
      if (!selectedKBs.length) {
        setAllKBs([]);
        return;
      }
      
      // Filter for selectedKBs with more robust matching
      const filtered = allMapped.filter((kb: any) =>
        selectedKBs.some((sel: any) => {
          if (!sel) return false;
          if (typeof sel === 'object') {
            return (sel.knowledgebase_id === kb.id || sel.kb_id === kb.id || sel.id === kb.id);
          }
          // Handle string comparison with type conversion
          return String(sel) === String(kb.id);
        })
      );
      
      setAllKBs(filtered);
    } catch (e) {
      console.error('Failed to load KBs:', e);
      setAllKBs([]);
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
      // Compose API payload with new field structure
      const payload = {
        bot_name: botName,
        bot_description: botDescription,
        user_prompt: agentPrompt,
        closing_keyword: closingKeyword,
        tone,
        llm_provider: selectedModel,
        model_name: engineModel,
        api_key: engineAuth,
        max_token: maxToken,
        temperature: temperature
      };

      let response;
      let botIdToBind = editingBotId;
      if (isEditing && editingBotId) {
        // Update existing bot (PUT)
        response = await authenticatedFetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/bots/${encodeURIComponent(editingBotId)}`,
          {
            method: 'PUT',
            headers: {
              'accept': 'application/json',
              'Content-Type': 'application/json',
              // 'ngrok-skip-browser-warning': '69420'
            },
            body: JSON.stringify(payload)
          }
        );
      } else {
        // Create new bot (POST)
        response = await authenticatedFetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/bots`, {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
            // 'ngrok-skip-browser-warning': '69420'
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
        // Always stringify tool IDs to avoid UUID type mismatch, and filter out null/undefined
        const params = selectedTools
          .filter(id => id !== null && id !== undefined)
          .map(id => {
            // id is guaranteed not null/undefined here due to filter
            const safeId = id as any;
            let toolId = typeof safeId === 'object' ? (safeId.tool_id || safeId.id) : safeId;
            if (typeof toolId !== 'string') toolId = String(toolId);
            return `tool_ids=${encodeURIComponent(toolId.trim().toLowerCase())}`;
          })
          .join('&');
        const bindUrl = `${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/tools/bots/${botIdToBind}?${params}`;
        const bindRes = await authenticatedFetch(bindUrl, {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            // 'ngrok-skip-browser-warning': '69420'
          },
          body: ''
        });
        if (!bindRes.ok) throw new Error('Failed to bind tools');

        // Bind Knowledge Bases to bot
        if (selectedKBs.length > 0) {
          const kbParams = selectedKBs
            .filter(id => id !== null && id !== undefined)
            .map(id => {
              const safeId = id as any;
              let kbId = typeof safeId === 'object' ? (safeId.knowledgebase_id || safeId.kb_id || safeId.id) : safeId;
              if (typeof kbId !== 'string') kbId = String(kbId);
              return `knowledgebase_ids=${encodeURIComponent(kbId.trim())}`;
            })
            .join('&');
          const kbBindUrl = `${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/knowledgebases/bots/${botIdToBind}?${kbParams}`;
          const kbBindRes = await authenticatedFetch(kbBindUrl, {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              // 'ngrok-skip-browser-warning': '69420'
            },
            body: ''
          });
          if (!kbBindRes.ok) throw new Error('Failed to bind knowledge bases');
        }
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

  const handleRemoveTool = (toolId: string) => {
    setSelectedTools(selectedTools.filter(id => id !== toolId));
  };

  const handleRemoveKB = (kbId: string) => {
    setSelectedKBs(selectedKBs.filter(id => id !== kbId));
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

  const getSelectedKBsData = () => {
    const result = allKBs.filter(kb => {
      return selectedKBs.some((sel: any) => {
        if (!sel) return false;
        if (typeof sel === 'object') {
          return (sel.knowledgebase_id === kb.id || sel.kb_id === kb.id || sel.id === kb.id);
        }
        // Handle string comparison with type conversion
        return String(sel) === String(kb.id);
      });
    });
    
    return result;
  };

  return (

    <>
      <div className="container mx-auto p-8 space-y-8 bg-background min-h-screen">
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
            <Button 
              onClick={handleTestBot} 
              variant="outline" 
              className="gap-2 px-4"
              disabled
            >
              <Play className="w-4 h-4" />
              Test
            </Button>
            <Button 
              onClick={handleSaveBot} 
              className="gap-2 px-4"
              disabled={!isIntelligentBot}
            >
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
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl">Bot Details</CardTitle>
                  {!isIntelligentBot && (
                    <Badge variant="secondary" className="text-xs">
                      Coming Soon
                    </Badge>
                  )}
                </div>
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
                  disabled={!isIntelligentBot}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bot-description">Description</Label>
                <Textarea
                  id="bot-description"
                  placeholder="Describe what your bot does..."
                  value={botDescription}
                  onChange={(e) => setBotDescription(e.target.value)}
                  className="h-20 resize-none"
                  disabled={!isIntelligentBot}
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
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        {toneOptions.map(option => (
                          <SelectItem key={option} value={option}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <div className="h-[350px] border border-code-border rounded-lg overflow-hidden relative bg-muted/20">
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                    <div className="text-center space-y-3">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                        <Bot className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Non-Intelligent Bot</h3>
                        <p className="text-sm text-muted-foreground mt-1">This feature is coming soon!</p>
                        <p className="text-xs text-muted-foreground mt-2">Switch to Intelligent Bot to continue building.</p>
                      </div>
                    </div>
                  </div>
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
                      readOnly: true,
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advanced sections only for intelligent bots */}
        {isIntelligentBot && (
          <>
            {/* LLM Model Configuration - Full Width */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-xl">LLM Model</CardTitle>
                <CardDescription>
                  Select the language model that will power your bot's intelligence.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Model Selection */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Model Provider</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose your preferred language model provider
                      </p>
                    </div>
                    <div className="space-y-3">
                      {models.map((model) => (
                        <label 
                          key={model} 
                          htmlFor={model} 
                          className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                        >
                          <input
                            type="radio"
                            id={model}
                            name="model"
                            checked={selectedModel === model}
                            onChange={() => setSelectedModel(model)}
                            className="w-4 h-4 text-primary cursor-pointer"
                          />
                          <span className="text-sm font-medium flex-1 cursor-pointer">{model}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Agent Prompt */}
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label className="text-sm font-medium">Agent Prompt</Label>
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
                    <div className="flex-1">
                      {agentPrompt ? (
                        <div className="p-4 bg-accent/20 border border-border rounded-lg h-40 overflow-hidden">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {agentPrompt.length > 200 ? `${agentPrompt.substring(0, 350)}...` : agentPrompt}
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 border-2 border-dashed border-border rounded-lg h-40 flex items-center justify-center">
                          <div className="text-center">
                            <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                            <p className="text-sm text-muted-foreground">No agent prompt configured</p>
                            <p className="text-xs text-muted-foreground mt-1">Click Configure to set up your agent's behavior</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tools and Knowledge Bases - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Tools */}
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Settings className="w-5 h-5" />
                        Tools
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Select and manage custom functions that are essential for the bot operations.
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowToolLibrary(true)}
                        variant="outline"
                        className="gap-2 px-4"
                      >
                        <Settings className="w-4 h-4" />
                        Tool Library
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedTools.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                      <Settings className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No Tools Selected</p>
                      <p className="text-sm mt-1">Select tools from the library or create new ones</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getSelectedToolsData().map((tool) => (
                        <div key={`tool-${tool.id}`} className="flex items-center justify-between p-4 border border-border rounded-xl bg-card/50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-foreground">{tool.name}</div>
                              <Badge variant="secondary" className="text-xs">Tool</Badge>
                            </div>
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
                  )}
                </CardContent>
              </Card>

              {/* Right Column: Knowledge Bases */}
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <FileText className="w-5 h-5" />
                        Knowledge Bases
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Select and manage knowledge bases that provide context and information to your bot.
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowKBLibrary(true)}
                        variant="outline"
                        className="gap-2 px-4"
                      >
                        <FileText className="w-4 h-4" />
                        KB Library
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedKBs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                      <FileText className="w-8 h-8 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No Knowledge Bases Selected</p>
                      <p className="text-sm mt-1">Select KBs from the library or create new ones</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getSelectedKBsData().map((kb) => (
                        <div key={`kb-${kb.id}`} className="flex items-center justify-between p-4 border border-border rounded-xl bg-card/50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-foreground">{kb.name}</div>
                              <Badge variant="outline" className="text-xs">Knowledge Base</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">{kb.description}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Created: {kb.createdAt ? new Date(kb.createdAt).toLocaleDateString() : ''}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveKB(kb.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Dialogs */}
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

      <KBLibrary
        open={showKBLibrary}
        onOpenChange={setShowKBLibrary}
        selectedKBs={selectedKBs}
        onKBSelectionChange={setSelectedKBs}
      />
    </>
  );
};

export default BotCreator;