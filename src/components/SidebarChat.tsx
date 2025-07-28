
import { useEffect, useRef, useState } from "react";
import { SendHorizonal, Loader2 } from "lucide-react";
import { WS_URL, CLIENT_ID } from "@/config";

function ReengageDialog({ open, onSubmit }: { open: boolean, onSubmit: (time: number, message: string) => void }) {
  const [time, setTime] = useState(10);
  const [message, setMessage] = useState("Hi, are you still there?");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card p-6 rounded-xl shadow-lg w-full max-w-xs">
        <h2 className="text-lg font-bold mb-4">Re-engagement Settings</h2>
        <div className="mb-3">
          <label className="block text-sm mb-1">Re-engage after (seconds):</label>
          <input
            type="number"
            min={1}
            value={time}
            onChange={e => setTime(Number(e.target.value))}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-1">Re-engagement message:</label>
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full px-3 py-2 rounded border border-border bg-background"
          />
        </div>
        <button
          className="w-full py-2 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition"
          onClick={() => onSubmit(time, message)}
        >
          Continue to Chat
        </button>
      </div>
    </div>
  );
}

function randomConversationId() {
  return (
    "conv-" +
    Math.random().toString(36).substring(2, 10) +
    Date.now().toString().slice(-4)
  );
}

interface SidebarChatProps {
  configId?: string;
  testMode?: boolean;
}

export const SidebarChat = ({ configId = "", testMode = false }: SidebarChatProps) => {
  // If configId is not provided, show error and do not render chat UI
  if (!configId) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-background">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-destructive mb-2">Agent Chat Unavailable</h2>
          <p className="text-muted-foreground">This page can only be accessed via the FlowBuilder Test Bot button.</p>
        </div>
      </div>
    );
  }
  // Reengagement config state
  const [reengageDialogOpen, setReengageDialogOpen] = useState(true);
  const [reengageTime, setReengageTime] = useState(10);
  const [reengageMessage, setReengageMessage] = useState("Hi, are you still there?");
  const [messages, setMessages] = useState([
    { role: "system", content: "Start a conversation with your agent." },
  ]);
  const [input, setInput] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(randomConversationId());
  // If configId is provided, use it as configVersion
  const [configVersion, setConfigVersion] = useState(configId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom on new message
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // If configId changes, update configVersion
  useEffect(() => {
    setConfigVersion(configId);
  }, [configId]);

  useEffect(() => {
    if (reengageDialogOpen) return; // Don't open websocket until dialog is closed
    const socket = new window.WebSocket(WS_URL);
    setWs(socket);
    setWsConnected(false);
    socket.onopen = () => {
      setWsConnected(true);
      // Optionally send INIT event on open
    };
    socket.onmessage = (event) => {
      console.log('[WebSocket] Received:', event.data);
      try {
        const data = JSON.parse(event.data);
        if (data && data.response) {
          setMessages((msgs) => [
            ...msgs,
            { role: "assistant", content: data.response },
          ]);
        }
      } catch (err) {
        // Only show invalid JSON if there is no previous assistant message
        setMessages((msgs) => [
          ...msgs,
          { role: "assistant", content: event.data },
        ]);
      }
      setLoading(false);
    };
    socket.onerror = () => {
      setLoading(false);
      setWsConnected(false);
    };
    socket.onclose = () => {
      setLoading(false);
      setWsConnected(false);
    };
    return () => {
      socket.close();
    };
  }, [conversationId, reengageDialogOpen]);

  // Render the dialog after all hooks, just before the return
  if (reengageDialogOpen) {
    return (
      <ReengageDialog
        open={reengageDialogOpen}
        onSubmit={(time, message) => {
          setReengageTime(time);
          setReengageMessage(message);
          setReengageDialogOpen(false);
        }}
      />
    );
  }

  const sendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !ws || ws.readyState !== 1) return;
    const isInit = messages.length === 1;
    const payload = {
      input: input.trim(),
      client_id: CLIENT_ID,
      config_version: configVersion,
      conversation_id: conversationId,
      event_type: isInit ? "INIT" : "",
      reengage: {
        time: reengageTime,
        message: reengageMessage
      }
    };
    ws.send(JSON.stringify(payload));
    setMessages((msgs) => [
      ...msgs,
      { role: "user", content: input.trim() },
    ]);
    setInput("");
    setLoading(true);
  };

  const startNewConversation = () => {
    setConversationId(randomConversationId());
    setMessages([
      { role: "system", content: "Start a conversation with your agent." },
    ]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="font-bold text-xl text-primary flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square-dots"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" /><path d="M12 8v.01" /><path d="M16 8v.01" /><path d="M8 8v.01" /></svg>
            Agent Chat
            <span title={wsConnected ? 'Connected' : 'Disconnected'} className="ml-3 flex items-center">
              <span
                className={`inline-block w-3 h-3 rounded-full border border-border shadow ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}
                aria-label={wsConnected ? 'WebSocket connected' : 'WebSocket disconnected'}
              />
            </span>
          </span>
        </div>
      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-all duration-150 ml-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
          onClick={startNewConversation}
          type="button"
          title="Start a new conversation"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New
        </button>
      </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 bg-gradient-to-b from-background via-card to-background">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={
              msg.role === "user"
                ? "flex justify-end"
                : msg.role === "assistant"
                  ? "flex justify-start"
                  : "flex justify-center"
            }
          >
            <div
              className={`rounded-2xl px-5 py-3 text-base max-w-[75%] shadow-md whitespace-pre-line transition-all duration-200
                ${msg.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto rounded-br-md"
                  : msg.role === "assistant"
                    ? "bg-accent text-accent-foreground mr-auto rounded-bl-md"
                    : "bg-muted text-muted-foreground mx-auto text-center"}
              `}
              style={{ wordBreak: 'break-word', lineHeight: 1.6 }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={sendMessage}
        className="flex items-center gap-4 px-6 py-4 border-t border-border bg-card backdrop-blur-md sticky bottom-0 z-10 shadow-sm"
        autoComplete="off"
      >
        <input
          className="flex-1 rounded-full border border-border px-5 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring bg-input shadow-sm placeholder:text-muted-foreground"
          placeholder="Type your message and press Enter..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          autoFocus
        />
        <button
          type="submit"
          className="rounded-full p-3 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 shadow-md transition-all duration-150"
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <SendHorizonal className="w-6 h-6" />}
        </button>
      </form>
    </div>
  );
};
