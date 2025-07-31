import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface MessageConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: {
    welcomeMessage: string;
    reEngage: { time: number; message: string };
  }) => void;
  initialConfig?: {
    welcomeMessage: string;
    reEngage: { time: number; message: string };
  } | null;
}

export const MessageConfigDialog = ({ open, onOpenChange, onSave, initialConfig }: MessageConfigDialogProps) => {
  const [welcomeMessage, setWelcomeMessage] = useState("Thank you for calling!. I am your virtual assistant. I'm here to help.");
  const [reEngage, setReEngage] = useState({ time: 30, message: "Are you still there?" });

  useEffect(() => {
    if (initialConfig) {
      setWelcomeMessage(initialConfig.welcomeMessage);
      setReEngage(initialConfig.reEngage);
    }
  }, [initialConfig, open]);

  const updateReEngage = (field: 'time' | 'message', value: string | number) => {
    setReEngage(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave({
      welcomeMessage,
      reEngage
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Configure Voice Bot messages
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Welcome Message */}
          <div className="space-y-3">
            <div>
              <h3 className="font-medium">Welcome / Trigger Message</h3>
              <p className="text-sm text-muted-foreground">
                The initial greeting message that starts every conversation. This message introduces your bot to users, sets expectations, and establishes a friendly, professional tone for the interaction.
              </p>
            </div>
            <Textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Re-Engage Message */}
          <div className="space-y-3">
            <div>
              <h3 className="font-medium">Re-Engage</h3>
              <p className="text-sm text-muted-foreground">
                Configure bot behaviour when the customer is not responding or goes silent
              </p>
            </div>

            <div className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-2">
                <Label className="text-xs">Time (seconds)</Label>
                <Input
                  type="number"
                  value={reEngage.time}
                  onChange={(e) => updateReEngage('time', parseInt(e.target.value) || 0)}
                  className="h-8"
                  min="1"
                />
              </div>
              <div className="col-span-10">
                <Label className="text-xs">Message</Label>
                <Input
                  value={reEngage.message}
                  onChange={(e) => updateReEngage('message', e.target.value)}
                  placeholder="Enter re-engage message"
                  className="h-8"
                />
              </div>
            </div>
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