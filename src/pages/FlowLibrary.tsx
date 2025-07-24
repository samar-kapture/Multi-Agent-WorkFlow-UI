import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Plus } from "lucide-react";
import { API_BASE_URL, CLIENT_ID } from "@/config";

const FlowLibrary = () => {
  const [flows, setFlows] = useState([]);
  const [bots, setBots] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch flows
    fetch(`${API_BASE_URL}/multiagent-core/graph_structure/bot-structure`, {
      headers: {
        accept: "application/json",
        'ngrok-skip-browser-warning': '69420'
      }
    })
      .then(res => res.json())
      .then(data => setFlows(Array.isArray(data) ? data : []))
      .catch(() => setFlows([]));
    // Fetch bots
    fetch(`${API_BASE_URL}/multiagent-core/bot/clients/${CLIENT_ID}/bots?skip=0&limit=100`, {
      headers: {
        accept: "application/json",
        'ngrok-skip-browser-warning': '69420'
      }
    })
      .then(res => res.json())
      .then(data => setBots(Array.isArray(data?.bots) ? data.bots : []))
      .catch(() => setBots([]));
  }, []);

  const filteredFlows = flows.filter(flow =>
    (flow.config_id?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  // Calculate last updated date
  const lastUpdated = flows.length > 0
    ? flows.reduce((latest, f) => {
      const d = f.updated_at || f.created_at;
      if (!d) return latest;
      return !latest || new Date(d) > new Date(latest) ? d : latest;
    }, null)
    : null;

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Flow Library
          </h1>
          <span className="ml-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {flows.length} {flows.length === 1 ? 'Flow' : 'Flows'}
          </span>
          {lastUpdated && (
            <span className="ml-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
              Last updated: {new Date(lastUpdated).toLocaleDateString()}
            </span>
          )}
        </div>
        <Button className="gap-2" onClick={() => navigate('/flow')}>
          <Plus className="w-4 h-4" />
          Create Flow
        </Button>
      </div>

      <div className="max-w-md mb-8">
        <input
          type="text"
          placeholder="Search flows..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 rounded-full border border-primary/30 bg-background/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-150 placeholder:text-muted-foreground/70"
        />
      </div>
      {filteredFlows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <Settings className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No Flows Available</p>
          <p className="text-sm mt-1">Create your first flow to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredFlows.map(flow => (
            <div key={flow.id} className="relative group w-full">
              <button
                className="text-left w-full"
                onClick={e => {
                  // Only navigate if not clicking the delete button
                  if ((e.target as HTMLElement).closest('.delete-flow-btn')) return;
                  navigate(`/flow?flow_id=${flow.id}`);
                }}
                style={{ background: "none", border: "none", padding: 0 }}
              >
                <Card className="relative group transition-all duration-200 border-2 hover:border-primary/60 shadow-md cursor-pointer bg-card/90">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base font-semibold truncate mb-1 flex items-center gap-2">
                          {flow.config_id}
                          <span className="ml-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium">
                            {flow.id}
                          </span>
                        </CardTitle>
                        {/* <CardDescription className="text-xs text-muted-foreground line-clamp-2 mb-1">
                          {flow.description || 'No description'}
                        </CardDescription> */}
                        {/* Show connected bots for this flow */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {bots.filter(bot => flow.structure && Object.values(flow.structure).flat().includes(bot.id)).map(bot => (
                            <span key={bot.id} className="inline-block bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                              {bot.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* Delete button with Dialog */}
                      <Dialog open={deleteDialogOpen && flowToDelete?.id === flow.id} onOpenChange={open => {
                        setDeleteDialogOpen(open);
                        if (!open) setFlowToDelete(null);
                      }}>
                        <DialogTrigger asChild>
                          <button
                            className="ml-2 text-destructive hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity delete-flow-btn"
                            title="Delete Flow"
                            onClick={e => {
                              e.stopPropagation();
                              e.preventDefault();
                              setFlowToDelete(flow);
                              setDeleteDialogOpen(true);
                            }}
                            type="button"
                          >
                            &#128465;
                          </button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Flow</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete the flow <b>{flow.config_id}</b>? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="secondary" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                                Cancel
                              </Button>
                            </DialogClose>
                            <Button variant="destructive" onClick={async () => {
                              setDeleting(true);
                              try {
                                const res = await fetch(`${API_BASE_URL}/multiagent-core/graph_structure/bot-structure/${flow.id}`, {
                                  method: 'DELETE',
                                  headers: {
                                    'accept': 'application/json',
                                    'ngrok-skip-browser-warning': '69420'
                                  }
                                });
                                if (res.ok) {
                                  setFlows(prev => prev.filter(f => f.id !== flow.id));
                                  setDeleteDialogOpen(false);
                                  setFlowToDelete(null);
                                } else {
                                  alert('Failed to delete flow.');
                                }
                              } catch {
                                alert('Failed to delete flow.');
                              }
                              setDeleting(false);
                            }} disabled={deleting}>
                              {deleting ? 'Deleting...' : 'Delete'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4 px-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="bg-muted px-2 py-0.5 rounded">
                        Created: {flow.created_at ? new Date(flow.created_at).toLocaleDateString() : ''}
                      </span>
                      {flow.updated_at && (
                        <span className="bg-muted px-2 py-0.5 rounded">
                          Updated: {new Date(flow.updated_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlowLibrary;
