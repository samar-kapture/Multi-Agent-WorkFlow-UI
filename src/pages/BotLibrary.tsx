import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/config";
import { Dialog } from "@/components/ui/dialog";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Book, Search, Edit, Trash2, Play, Copy, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService, Bot as BotType, Tool } from "@/services/api";

const BotLibrary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [bots, setBots] = useState<BotType[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [botToDelete, setBotToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // Also refetch when coming back from create/edit page
    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadData = async () => {
    try {
      // Fetch bots from API
      const res = await fetch(`${API_BASE_URL}/multiagent-core/bot/clients/kapture/bots?skip=0&limit=100`, {
        headers: { 'accept': 'application/json' }
      });
      const botsData = await res.json();
      // The API returns { total, skip, limit, bots: [...] }
      const botsArr = Array.isArray(botsData?.bots) ? botsData.bots : [];
      // Map API bots to local BotType structure for display
      setBots(botsArr.map(apiBot => {
        const botObj: any = {
          id: apiBot.bot_id,
          name: apiBot.name,
          description: apiBot.description,
          agentPrompt: apiBot.final_prompt,
          createdAt: apiBot.created_at,
          updatedAt: apiBot.updated_at,
          // Prefer tools (array of objects), fallback to functions (array of ids), fallback to []
          functions: Array.isArray(apiBot.tools)
            ? apiBot.tools.map((t: any) => t.tool_id || t.id)
            : Array.isArray(apiBot.functions)
              ? apiBot.functions
              : [],
        };
        if (Array.isArray(apiBot.tools)) botObj._tools = apiBot.tools;
        return botObj;
      }));
    } catch (e) {
      setBots([]);
    }
    // Still load tools from local apiService
    const allTools = apiService.getTools();
    setTools(allTools);
  };

  const filteredBots = bots.filter(bot =>
    (bot.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (bot.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditBot = (botId: string) => {
    navigate(`/create?edit=${botId}`);
  };

  const confirmDeleteBot = (botId: string) => {
    setBotToDelete(botId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteBot = async () => {
    if (!botToDelete) return;
    try {
      const res = await fetch(`${API_BASE_URL}/multiagent-core/bot/clients/kapture/bots/${botToDelete}`, {
        method: 'DELETE',
        headers: { 'accept': '*/*' }
      });
      if (!res.ok) throw new Error('Failed to delete bot');
      setDeleteDialogOpen(false);
      setBotToDelete(null);
      loadData();
      toast({
        title: "Bot Deleted",
        description: "Bot has been successfully deleted.",
      });
    } catch (error) {
      setDeleteDialogOpen(false);
      setBotToDelete(null);
      toast({
        title: "Error",
        description: "Failed to delete bot. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleTestBot = async (botId: string) => {
    try {
      await apiService.testBot(botId, { input: 'test' });
      toast({
        title: "Bot Test Successful",
        description: "Your bot is working correctly!",
      });
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Bot testing failed. Please check your configuration.",
        variant: "destructive"
      });
    }
  };

  const handleCloneBot = async (botId: string) => {
    try {
      // Fetch the latest bot details from the API
      const res = await fetch(`${API_BASE_URL}/multiagent-core/bot/clients/kapture/bots/${botId}`, {
        headers: { 'accept': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch bot');
      const bot = await res.json();
      // Remove id, createdAt, updatedAt so it will be treated as a new bot
      const clonedBot = {
        ...bot,
        name: `${bot.name} (Copy)`
      };
      delete (clonedBot as any).bot_id;
      delete (clonedBot as any).created_at;
      delete (clonedBot as any).updated_at;
      // Pass the cloned bot as state to the create page, and also pass the original botId for prefill
      navigate('/create', { state: { bot: clonedBot, isClone: true, bot_id: botId } });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clone bot. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getBotTools = (bot: any) => {
    // If bot._tools is present and is array of objects, use it directly
    if (Array.isArray(bot._tools) && bot._tools.length > 0 && typeof bot._tools[0] === 'object') {
      return bot._tools.map((t: any) => ({
        id: t.tool_id || t.id,
        name: t.original_name || t.name,
        description: t.description,
        ...t
      }));
    }
    // Otherwise, fallback to matching ids in tools[]
    if (!bot.functions || !Array.isArray(bot.functions)) return [];
    return tools.filter(tool => bot.functions.includes(tool.id));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Book className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Bot Library</h1>
            <p className="text-muted-foreground">Manage and organize your created bots</p>
          </div>
        </div>
        <Button asChild className="gap-2">
          <Link to="/create">
            <Bot className="w-4 h-4" />
            Create Bot
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search bots by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bots</p>
                <p className="text-2xl font-bold">{bots.length}</p>
              </div>
              <Book className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Bots</p>
                <p className="text-2xl font-bold">{bots.length}</p>
              </div>
              <Play className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        {/*
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tools</p>
                <p className="text-2xl font-bold">
                  {bots.reduce((acc, bot) => {
                    // Prefer _tools if present, else functions
                    if (Array.isArray((bot as any)._tools)) {
                      return acc + (bot as any)._tools.length;
                    }
                    return acc + (Array.isArray(bot.functions) ? bot.functions.length : 0);
                  }, 0)}
                </p>
              </div>
              <Edit className="w-8 h-8 text-info" />
            </div>
          </CardContent>
        </Card>
        */}

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-sm font-bold">
                  {(() => {
                    const validBots = bots.filter(b => b.updatedAt && !isNaN(new Date(b.updatedAt).getTime()));
                    if (validBots.length === 0) return 'N/A';
                    const maxDate = new Date(Math.max(...validBots.map(b => new Date(b.updatedAt).getTime())));
                    return formatDate(maxDate.toISOString());
                  })()}
                </p>
              </div>
              <Book className="w-8 h-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bot Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBots.map((bot) => (
          <Card key={bot.id} className="shadow-card hover:shadow-glow transition-all duration-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{bot.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {bot.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Tools */}
              <div>
                {/* <p className="text-sm font-medium mb-2">Tools ({Array.isArray((bot as any)._tools) ? (bot as any)._tools.length : (Array.isArray(bot.functions) ? bot.functions.length : 0)})</p> */}
                <div className="flex flex-wrap gap-1">
                  {getBotTools(bot).slice(0, 3).map((tool) => (
                    <Badge key={tool.id} variant="secondary" className="text-xs">
                      {tool.name}
                    </Badge>
                  ))}
                  {Array.isArray(bot.functions) && bot.functions.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{bot.functions.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Metadata */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Created: {formatDate(bot.createdAt)}</p>
                <p>Modified: {formatDate(bot.updatedAt)}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTestBot(bot.id)}
                  className="flex-1 gap-1"
                >
                  <Play className="w-3 h-3" />
                  Test
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditBot(bot.id)}
                  className="flex-1 gap-1"
                >
                  <Edit className="w-3 h-3" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCloneBot(bot.id)}
                  className="gap-1"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => confirmDeleteBot(bot.id)}
                  className="gap-1 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBots.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="p-8 text-center">
            <Book className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No bots found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "No bots match your search criteria. Try adjusting your search terms."
                : "You haven't created any bots yet. Start building your first intelligent agent!"
              }
            </p>
            {!searchQuery && (
              <Button asChild>
                <Link to="/create">Create Your First Bot</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    {/* Delete Confirmation Dialog */}
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Bot?</DialogTitle>
        </DialogHeader>
        <div>Are you sure you want to delete this bot?<br></br>This action cannot be undone.</div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDeleteBot}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
  );
};

export default BotLibrary;