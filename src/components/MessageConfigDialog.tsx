import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus } from "lucide-react";

interface MessageConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: {
    welcomeMessage: string;
    reEngageMessages: { time: number; message: string }[];
    closingMessage: string;
  }) => void;
  initialConfig?: {
    welcomeMessage: string;
    reEngageMessages: { time: number; message: string }[];
    closingMessage: string;
  } | null;
}

export const MessageConfigDialog = ({ open, onOpenChange, onSave, initialConfig }: MessageConfigDialogProps) => {
  const [welcomeMessage, setWelcomeMessage] = useState("Thank you for calling Kapture. I am your virtual assistant. I'm here to help.");
  const [reEngageMessages, setReEngageMessages] = useState([
    { time: 30, message: "Are you still there?" },
    { time: 30, message: "" }
  ]);
  const [closingMessage, setClosingMessage] = useState("Thank you for choosing Kapture. We look forward to serving you! Have a great day!");

  useEffect(() => {
    if (initialConfig) {
      setWelcomeMessage(initialConfig.welcomeMessage);
      setReEngageMessages(initialConfig.reEngageMessages);
      setClosingMessage(initialConfig.closingMessage);
    }
  }, [initialConfig, open]);

  const addReEngageMessage = () => {
    setReEngageMessages([...reEngageMessages, { time: 30, message: "" }]);
  };

  const removeReEngageMessage = (index: number) => {
    setReEngageMessages(reEngageMessages.filter((_, i) => i !== index));
  };

  const updateReEngageMessage = (index: number, field: 'time' | 'message', value: string | number) => {
    const updated = reEngageMessages.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setReEngageMessages(updated);
  };

  const handleSave = () => {
    onSave({
      welcomeMessage,
      reEngageMessages,
      closingMessage
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
                Provides a customizable greeting to engage users and set the tone for their interaction.
              </p>
            </div>
            <Textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Re-Engage Messages
          <div className="space-y-3">
            <div>
              <h3 className="font-medium">Re - Engage</h3>
              <p className="text-sm text-muted-foreground">
                Configure bot behaviour when the customer is not responding or goes silent
              </p>
            </div>

            <div className="space-y-4">
              {reEngageMessages.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-1">
                    <span className="text-sm font-medium">{index + 1}.</span>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Time</Label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={item.time}
                        onChange={(e) => updateReEngageMessage(index, 'time', parseInt(e.target.value) || 0)}
                        className="h-8"
                      />
                      <span className="text-sm text-muted-foreground">Sec</span>
                    </div>
                  </div>
                  <div className="col-span-8">
                    <Label className="text-xs">Message</Label>
                    <Input
                      value={item.message}
                      onChange={(e) => updateReEngageMessage(index, 'message', e.target.value)}
                      placeholder="Enter"
                      className="h-8"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeReEngageMessage(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" onClick={addReEngageMessage} className="gap-2">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div> */}

          {/* Closing Message */}
          <div className="space-y-3">
            <div>
              <h3 className="font-medium">Closing / Ending Message</h3>
              <p className="text-sm text-muted-foreground">
                Provides a customizable closing message before disconnecting the call
              </p>
            </div>
            <Textarea
              value={closingMessage}
              onChange={(e) => setClosingMessage(e.target.value)}
              className="min-h-[80px]"
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