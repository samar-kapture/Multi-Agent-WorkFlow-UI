import { useState, useEffect } from "react";
import { API_BASE_URL, CLIENT_ID } from "@/config";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Plus, FileText, Search, Edit, Trash2 } from "lucide-react";
import { KBDialog } from "./KBDialog";
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch";

interface KBLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedKBs: string[];
  onKBSelectionChange: (kbIds: string[]) => void;
}

export const KBLibrary = ({ open, onOpenChange, selectedKBs, onKBSelectionChange }: KBLibraryProps) => {
  const [knowledgebases, setKnowledgebases] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showKBDialog, setShowKBDialog] = useState(false);
  const [editingKB, setEditingKB] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [kbToDelete, setKbToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const authenticatedFetch = useAuthenticatedFetch();

  useEffect(() => {
    if (open) {
      loadKnowledgebases();
    }
  }, [open]);

  const loadKnowledgebases = async () => {
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/knowledgebases`, {
        headers: {
          'accept': 'application/json',
        }
      });
      if (!res.ok) throw new Error('Failed to fetch knowledge bases');
      const data = await res.json();
      // API returns array directly, not wrapped in an object
      const kbsArr = Array.isArray(data) ? data : [];
      setKnowledgebases(kbsArr);
    } catch (e) {
      setKnowledgebases([]);
    }
  };

  const handleCreateKB = (kbData: any) => {
    setShowKBDialog(false);
    loadKnowledgebases(); // Reload after creation
  };

  const handleEditKB = (kb: any) => {
    setEditingKB(kb);
    setShowKBDialog(true);
  };

  const handleDeleteKB = async (kbId: string) => {
    setDeleting(true);
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/multiagent-core/clients/${CLIENT_ID}/knowledgebases`, {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([kbId])
      });
      if (!res.ok) throw new Error('Failed to delete knowledge base');
      
      // Remove from selected KBs if it was selected
      if (selectedKBs.includes(kbId)) {
        onKBSelectionChange(selectedKBs.filter(id => id !== kbId));
      }
      
      loadKnowledgebases();
    } catch (e) {
      console.error('Error deleting knowledge base:', e);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setKbToDelete(null);
    }
  };

  const handleKBToggle = (kbId: string, checked: boolean) => {
    if (checked) {
      onKBSelectionChange([...selectedKBs, kbId]);
    } else {
      onKBSelectionChange(selectedKBs.filter(id => id !== kbId));
    }
  };

  const filteredKBs = knowledgebases.filter(kb =>
    kb.kb_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kb.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader className="pb-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Knowledge Base Library
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col h-full -mt-4">
            {/* Header Actions */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search knowledge bases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => {
                  setEditingKB(null);
                  setShowKBDialog(true);
                }}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Create KB
              </Button>
            </div>

            {/* Knowledge Bases Grid */}
            <div className="flex-1 overflow-auto scrollbar-thin">
              {filteredKBs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  <FileText className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No Knowledge Bases Available</p>
                  <p className="text-sm mt-1">Create your first knowledge base to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredKBs.map((kb) => (
                    <Card key={kb.kb_id} className="relative group transition-all duration-200 border-2 hover:border-primary/60 shadow-sm">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-4">
                            <Checkbox
                              checked={selectedKBs.includes(kb.kb_id)}
                              onCheckedChange={(checked) => 
                                handleKBToggle(kb.kb_id, checked as boolean)
                              }
                              className="mt-1"
                            />
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-base font-semibold truncate mb-1">{kb.kb_name}</CardTitle>
                              <CardDescription className="text-xs text-muted-foreground line-clamp-2 mb-1">
                                {kb.description || "No description provided"}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditKB(kb)}
                              className="p-1 h-7 w-7"
                              aria-label="Edit knowledge base"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setKbToDelete(kb.kb_id);
                                setDeleteDialogOpen(true);
                              }}
                              className="p-1 h-7 w-7 text-destructive hover:text-destructive"
                              aria-label="Delete knowledge base"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 pb-4 px-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span className="bg-muted px-2 py-0.5 rounded">Type: {kb.kb_type || 'RAG'}</span>
                          <span className="bg-muted px-2 py-0.5 rounded">
                            Created: {kb.created_at ? new Date(kb.created_at).toLocaleDateString() : 'Unknown'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedKBs.length} of {filteredKBs.length} knowledge bases selected
              </div>
              <Button onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Knowledge Base</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this knowledge base? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => kbToDelete && handleDeleteKB(kbToDelete)}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* KB Creation/Edit Dialog */}
      <KBDialog
        open={showKBDialog}
        onOpenChange={setShowKBDialog}
        onSave={handleCreateKB}
        initialKB={editingKB}
      />
    </>
  );
};
