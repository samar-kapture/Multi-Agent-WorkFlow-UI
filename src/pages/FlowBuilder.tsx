import { useCallback, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API_BASE_URL, CLIENT_ID } from "@/config";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  NodeMouseHandler,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Button } from "@/components/ui/button";
import { MessageConfigDialog } from "@/components/MessageConfigDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Folder, Save, Play, Plus, Download, Trash2, X, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiService, Bot as BotType } from "@/services/api";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";

// Initial nodes and edges
const initialNodes: Node[] = [
  {
    id: '__start__',
    type: 'default',
    position: { x: 250, y: 0 },
    data: {
      label: 'START',
      description: 'Start Node'
    },
    style: {
      background: 'hsl(142, 76%, 36%)',
      color: 'white',
      border: '1px solid hsl(217 91% 50%)',
      borderRadius: '20px',
      padding: '10px',
    }
  },
  {
    id: '__end__',
    type: 'default',
    position: { x: 250, y: 350 },
    data: {
      label: 'END',
      description: 'END Node'
    },
    style: {
      background: 'hsl(0, 72%, 51%)',
      color: 'white',
      border: '1px solid hsl(262 83% 48%)',
      borderRadius: '20px',
      padding: '10px',
    }
  }
];

const initialEdges: Edge[] = [];

function buildBotStructure(nodes: Node[], edges: Edge[]): Record<string, string[]> {
  const structure: Record<string, string[]> = {};

  // Add all nodes to the structure with string keys, except the END node
  nodes.forEach(node => {
    if (node.data.label !== "END") {
      structure[String(node.id)] = [];
    }
  });

  // Add edges to the structure with string values, skip edges where source is END node
  edges.forEach(edge => {
    const source = String(edge.source);
    const target = String(edge.target);
    // Skip connections from END node
    if (nodes.find(n => n.id === source && n.data.label === "END")) return;
    if (!structure[source]) structure[source] = [];
    structure[source].push(target);
  });

  // Find start and end nodes
  const startNode = nodes.find(n => n.data.label === "START");
  const endNode = nodes.find(n => n.data.label === "END");

  // Add __start__ key
  if (startNode) {
    structure["__start__"] = structure[String(startNode.id)] || [];
  }

  // Replace end node id with __end__ in all connections
  Object.keys(structure).forEach(key => {
    structure[key] = structure[key].map(target =>
      endNode && target === String(endNode.id) ? "__end__" : target
    );
  });

  return structure;
}

const FlowBuilder = () => {
  // Message config state (same as BotCreator)
  const [messageConfig, setMessageConfig] = useState<any>({ 
    welcome_message: 'Hello and Welcome! How can I help you today?', 
    closing_message: '', 
    reengagement: { time: 30, message: "Are you still there?" }
  });
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  // Handler for saving message config
  const handleMessageConfig = (config: any) => {
    setMessageConfig({
      welcome_message: config?.welcomeMessage || 'Hello and Welcome! How can I help you today?',
      closing_message: '', // Keep for API compatibility but don't use from dialog
      reengagement: config?.reEngage ?? { time: 30, message: "Are you still there?" }
    });
    toast({
      title: "Message Configuration Saved",
      description: "Message settings have been updated.",
    });
  };
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [isPrefilled, setIsPrefilled] = useState(false);
  const [allBots, setAllBots] = useState([]);
  const location = useLocation();
  // Edge removal handler
  const onEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    setSelectedEdge(edge.id);
  }, []);

  const removeSelectedEdge = () => {
    if (selectedEdge) {
      setEdges(eds => eds.filter(e => e.id !== selectedEdge));
      setSelectedEdge(null);
    }
  };

  // Compute which nodes have more than one outgoing edge
  const getMultiOutgoingNodeIds = () => {
    const outgoing: Record<string, number> = {};
    edges.forEach(edge => {
      outgoing[edge.source] = (outgoing[edge.source] || 0) + 1;
    });
    return Object.keys(outgoing).filter(nodeId => outgoing[nodeId] > 1);
  };

  // Compute edge styles: if source node has >1 outgoing, make edge dotted
  const getStyledEdges = () => {
    const multiOutgoing = new Set(getMultiOutgoingNodeIds());
    return edges.map(edge => {
      if (multiOutgoing.has(edge.source)) {
        return {
          ...edge,
          style: { ...edge.style, strokeDasharray: '4 3' }
        };
      }
      return { ...edge, style: { ...edge.style, strokeDasharray: undefined } };
    });
  };
  const [selectedBot, setSelectedBot] = useState<string | null>(null);
  const [availableBots, setAvailableBots] = useState<BotType[]>([]);
  const [flowName, setFlowName] = useState("Untitled Flow");
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const authenticatedFetch = useAuthenticatedFetch();

  useEffect(() => {
    loadAvailableBots();
    // Fetch all bots for node name mapping
    authenticatedFetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/bots?skip=0&limit=100`, {
      headers: {
        'accept': 'application/json',
        // 'ngrok-skip-browser-warning': '69420'
      }
    })
      .then(res => res.json())
      .then(data => setAllBots(Array.isArray(data?.bots) ? data.bots : []))
      .catch(() => setAllBots([]));
    const handleFocus = () => loadAvailableBots();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill graph if flow_id is present in query string
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const flowId = params.get('flow_id');
    if (!flowId || isPrefilled) return;
    // Wait for allBots to be loaded before reconstructing nodes
    if (!allBots || allBots.length === 0) {
      // Try again after allBots is loaded
      return;
    }
    // First get all flows to find the config_id for the given flow_id
    authenticatedFetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/graph-structure?skip=0&limit=100`, {
      headers: {
        'accept': 'application/json',
        // 'ngrok-skip-browser-warning': '69420'
      }
    })
      .then(res => res.json())
      .then((data) => {
        const flows = Array.isArray(data?.graphs) ? data.graphs : [];
        const flow = flows.find(f => f.id === flowId);
        if (!flow || !flow.config_id) return;
        
        // Now fetch the detailed flow data using config_id
        return authenticatedFetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/graph-structure/config/${encodeURIComponent(flow.config_id)}`, {
          headers: {
            'accept': 'application/json',
            // 'ngrok-skip-browser-warning': '69420'
          }
        });
      })
      .then(res => res ? res.json() : null)
      .then((detailedFlow) => {
        if (!detailedFlow || !detailedFlow.structure) return;
        // Reconstruct nodes and edges from structure
        const structure = detailedFlow.structure;
        const nodeIds = Object.keys(structure).filter(id => id !== '__start__');
        // Map id to name (use bot_id and bot_name for new API structure)
        const botIdToName = {};
        allBots.forEach(bot => {
          if (bot.bot_id) botIdToName[bot.bot_id] = bot.bot_name || bot.name;
          if (bot.id) botIdToName[bot.id] = bot.bot_name || bot.name;
        });
        // Build nodes
        const newNodes: Node[] = [
          {
            id: '__start__',
            type: 'default',
            position: { x: 250, y: 0 },
            data: { label: 'START', description: 'Start Node' },
            style: {
              background: 'hsl(142, 76%, 36%)', color: 'white', border: '1px solid hsl(217 91% 50%)', borderRadius: '20px', padding: '10px',
            }
          },
          {
            id: '__end__',
            type: 'default',
            position: { x: 250, y: 350 },
            data: { label: 'END', description: 'END Node' },
            style: {
              background: 'hsl(0, 72%, 51%)', color: 'white', border: '1px solid hsl(262 83% 48%)', borderRadius: '20px', padding: '10px',
            }
          },
          ...nodeIds.filter(id => id !== '__end__').map((id, idx) => {
            // Only show bot name if id matches a bot id, else show id
            const label = botIdToName[id] || id;
            return {
              id,
              type: 'default',
              position: { x: 200 + 100 * idx, y: 100 + 60 * idx },
              data: { label, description: '' },
              style: {
                background: 'hsl(217, 91%, 60%)', color: 'white', border: '1px solid hsl(217, 91%, 60%)', borderRadius: '8px', padding: '10px',
              }
            };
          })
        ];
        // Build edges
        const newEdges: Edge[] = [];
        Object.entries(structure).forEach(([source, targets]) => {
          if (!Array.isArray(targets)) return;
          targets.forEach(target => {
            if (target && source !== target) {
              newEdges.push({ id: `${source}->${target}`, source, target, type: 'default' });
            }
          });
        });
        setNodes(newNodes);
        setEdges(newEdges);
        setFlowName(detailedFlow.config_id || 'Untitled Flow');
        setEditingFlowId(detailedFlow.id || null);
        setMessageConfig({
          welcome_message: detailedFlow.welcome_message || 'Hello and Welcome! How can I help you today?',
          closing_message: detailedFlow.closing_message || '',
          reengagement: detailedFlow.reengagement || { time: 30, message: "Are you still there?" }
        });
        setIsPrefilled(true);
      })
      .catch(() => {
        // If any error occurs, just continue with empty flow
      });
  }, [location.search, isPrefilled, setNodes, setEdges, allBots, authenticatedFetch]);

  const loadAvailableBots = async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/bots?skip=0&limit=100`, {
        headers: {
          'accept': 'application/json',
          // 'ngrok-skip-browser-warning': '69420'
        }
      });
      const botsData = await res.json();
      const botsArr = Array.isArray(botsData?.bots) ? botsData.bots : [];
      setAvailableBots(botsArr.map(apiBot => ({
        id: apiBot.bot_id || apiBot.id, // prefer bot_id, fallback to id
        name: apiBot.bot_name || apiBot.name,
        description: apiBot.bot_description || apiBot.description,
        agentPrompt: apiBot.user_prompt || apiBot.final_prompt,
        createdAt: apiBot.created_at,
        updatedAt: apiBot.updated_at,
        functions: [],
      })));
    } catch (e) {
      setAvailableBots([]);
    }
  };

  // Node colors: avoid start (green) and end (red) node colors
  const getNodeColor = (index: number) => {
    // Avoid: 'hsl(142, 76%, 36%)' (green), 'hsl(0, 72%, 51%)' (red)
    // Use other vibrant colors
    const colors = [
      'hsl(217, 91%, 60%)', // blue
      'hsl(262, 83%, 58%)', // purple
      'hsl(38, 92%, 50%)',  // yellow
      'hsl(291, 64%, 42%)', // violet
      'hsl(204, 70%, 53%)', // cyan
      'hsl(12, 88%, 59%)',  // orange
      'hsl(174, 62%, 47%)', // teal
      'hsl(48, 89%, 60%)',  // gold
      'hsl(340, 82%, 52%)', // pink
      'hsl(200, 98%, 39%)', // blue2
      'hsl(300, 76%, 72%)', // light purple
      'hsl(0, 0%, 40%)',    // gray
    ];
    return colors[index % colors.length];
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const addBotToFlow = (bot: BotType, index: number) => {
    const newId = bot.id; // Use the bot_id from API as node id
    const color = getNodeColor(index);
    const newNode: Node = {
      id: newId,
      type: 'default',
      position: { x: Math.random() * 400, y: Math.random() * 300 },
      data: {
        label: bot.name,
        description: bot.description,
        botId: bot.id
      },
      style: {
        background: color,
        color: 'white',
        border: `1px solid ${color}`,
        borderRadius: '8px',
        padding: '10px',
      }
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const removeNode = (nodeId: string) => {
    setNodes((nds) => nds.filter(node => node.id !== nodeId));
    setEdges((eds) => eds.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
  };

  const onNodeClick: NodeMouseHandler = (event, node) => {
    setSelectedNode(node.id);
  };

  const saveFlow = async () => {
    try {
      const bot_structure = buildBotStructure(nodes, edges);
      // Use flow name as-is without any modifications
      const configId = flowName;
      if (editingFlowId) {
        // Update existing flow
        await authenticatedFetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/graph-structure/config`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "accept": "application/json", 'ngrok-skip-browser-warning': '69420' },
          body: JSON.stringify({
            structure: bot_structure,
            welcome_message: messageConfig.welcome_message,
            closing_message: messageConfig.closing_message,
            reengagement: messageConfig.reengagement,
          }),
        });
        toast({
          title: "Flow Updated",
          description: `Flow \"${flowName}\" has been updated successfully!`,
        });
      } else {
        // Create new flow
        await authenticatedFetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/graph-structure/config`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "accept": "application/json", 'ngrok-skip-browser-warning': '69420' },
          body: JSON.stringify({
            client_id: CLIENT_ID,
            config_id: configId,
            structure: bot_structure,
            welcome_message: messageConfig.welcome_message,
            closing_message: messageConfig.closing_message,
            reengagement: messageConfig.reengagement,
          }),
        });
        toast({
          title: "Flow Saved",
          description: `Flow \"${flowName}\" has been saved successfully!`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save flow. Please try again.",
        variant: "destructive"
      });
    }
  };

  const runFlow = async () => {
    try {
      // Mock flow execution
      toast({
        title: "Flow Execution Started",
        description: `Running flow with ${nodes.length} nodes and ${edges.length} connections.`,
      });

      // Simulate execution time
      setTimeout(() => {
        toast({
          title: "Flow Completed",
          description: "Flow execution completed successfully!",
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Execution Failed",
        description: "Flow execution failed. Please check your configuration.",
        variant: "destructive"
      });
    }
  };

  const exportFlow = () => {
    const flowData = { nodes, edges };
    const blob = new Blob([JSON.stringify(flowData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agent-flow.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-card border-r border-border p-4 space-y-4 flex flex-col">
        <div className="flex items-center gap-3 mb-6 flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Folder className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Flow Builder</h1>
            <p className="text-sm text-muted-foreground">Design agent workflows</p>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4">

        {/* Flow Name */}
        <div className="space-y-2">
          <Label htmlFor="flow-name">Flow Name</Label>
          <Input
            id="flow-name"
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            placeholder="Enter flow name..."
            className="h-9"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={saveFlow} size="sm" className="flex-1 gap-1">
            <Save className="w-3 h-3" />
            {editingFlowId ? 'Update' : 'Save'}
          </Button>
          <Button
            onClick={() => {
              const configId = flowName;
              navigate(`/chat?config_id=${encodeURIComponent(configId)}&test=true`);
            }}
            size="sm"
            variant="outline"
            className="flex-1 gap-1 border-2 border-border hover:bg-accent hover:text-accent-foreground"
          >
            <Play className="w-3 h-3" />
            Test Bot
          </Button>
        </div>

        <div className="flex gap-2 mt-2">
          <Button onClick={() => setShowMessageDialog(true)} variant="outline" className="gap-2 w-full border-2 border-border hover:bg-accent hover:text-accent-foreground">
            <Settings className="w-4 h-4" />
            Configure Messages
          </Button>
        </div>

        {/* Available Bots */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Available Bots</CardTitle>
            <CardDescription>
              Drag these bots into your workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 p-0">
            <div style={{ maxHeight: 260, overflowY: 'auto', padding: '0.75rem' }}>
              {availableBots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No bots available</p>
                  <p className="text-xs mt-1">Create a bot first to add it to your flow</p>
                </div>
              ) : (
                availableBots.map((bot, index) => (
                  <div
                    key={bot.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors mb-2"
                    style={{ overflow: "hidden" }}
                    onClick={() => addBotToFlow(bot, index)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: getNodeColor(index) }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block break-words">{bot.name}</span>
                        <span className="text-xs text-muted-foreground block break-words">{bot.description}</span>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Remove Button (Node or Edge) */}
        {(selectedNode || selectedEdge) && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">{selectedNode ? 'Node Actions' : 'Edge Actions'}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (selectedNode && selectedNode !== "__start__" && selectedNode !== "__end__") removeNode(selectedNode);
                  if (selectedEdge) removeSelectedEdge();
                }}
                className="w-full gap-2"
                disabled={selectedNode === "__start__" || selectedNode === "__end__"}
              >
                <Trash2 className="w-4 h-4" />
                {selectedNode
                  ? (selectedNode === "__start__" || selectedNode === "__end__"
                    ? `Cannot Remove ${selectedNode === "__start__" ? 'Start' : 'End'} Node`
                    : 'Remove Selected Node')
                  : 'Remove Selected Edge'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Flow Stats */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Flow Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nodes:</span>
              <span className="font-medium">{nodes.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Connections:</span>
              <span className="font-medium">{edges.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              {edges.length < 1 ? (
                <span className="font-medium text-destructive">Not Ready</span>
              ) : (
                <span className="font-medium text-success">Ready</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Click bots above to add them to the flow</p>
            <p>• Click on nodes to select them</p>
            <p>• Drag nodes to reposition them</p>
            <p>• Connect nodes by dragging from one to another</p>
            <p>• Use controls to zoom and pan</p>
            <p>• Save your work before closing</p>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* MessageConfigDialog */}
      <MessageConfigDialog
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
        onSave={handleMessageConfig}
        initialConfig={{
          welcomeMessage: messageConfig.welcome_message || 'Hello and Welcome! How can I help you today?',
          reEngage: messageConfig.reengagement ?? { time: 30, message: "Are you still there?" }
        }}
      />

      {/* Flow Canvas */}
      <div className="flex-1 relative bg-background overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={getStyledEdges()}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(event, node) => {
            setSelectedNode(node.id);
            setSelectedEdge(null);
          }}
          onEdgeClick={(event, edge) => {
            event.stopPropagation();
            setSelectedEdge(edge.id);
            setSelectedNode(null);
          }}
          fitView
          attributionPosition="top-right"
        >
          <Controls
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              color: 'hsl(var(--foreground))',
              padding: 4,
            }}
            showInteractive={true}
          />
          <MiniMap
            style={{
              height: 120,
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
            nodeColor={n => typeof n.style?.background === 'string' ? n.style.background : 'hsl(var(--primary))'}
            maskColor="rgba(40,40,40,0.7)"
            zoomable
            pannable
          />
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="hsl(var(--border))"
          />
        </ReactFlow>
      </div>
    </div>
  );
};

export default FlowBuilder;