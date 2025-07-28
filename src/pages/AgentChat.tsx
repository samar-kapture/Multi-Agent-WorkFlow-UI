
import { SidebarChat } from "../components/SidebarChat";
import { useLocation } from "react-router-dom";

export default function AgentChatPage() {
  // Get query params
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const configId = params.get("config_id") || "";
  const testMode = params.get("test") === "true";

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <SidebarChat configId={configId} testMode={testMode} />
    </div>
  );
}
