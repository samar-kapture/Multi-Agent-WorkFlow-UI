import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (prompt: string) => void;
  initialValue?: string;
}

export const PromptDialog = ({ open, onOpenChange, onSave, initialValue = "" }: PromptDialogProps) => {
  const [prompt, setPrompt] = useState(initialValue);

  // Sync prop to state when dialog opens or initialValue changes
  useEffect(() => {
    if (open) setPrompt(initialValue || "");
  }, [open, initialValue]);

  const handleSave = () => {
    onSave(prompt);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agent Prompt</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-prompt">Agent Prompt</Label>
            <p className="text-sm text-muted-foreground">
              Configure the main system prompt that defines your agent's behavior and capabilities
            </p>
            <Textarea
              id="agent-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your agent prompt..."
              className="min-h-[200px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};