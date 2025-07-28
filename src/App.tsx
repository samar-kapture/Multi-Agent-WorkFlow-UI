import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

import BotCreator from "./pages/BotCreator";
import BotLibrary from "./pages/BotLibrary";
import FlowBuilder from "./pages/FlowBuilder";
import FlowLibrary from "./pages/FlowLibrary";
import AgentChatPage from "./pages/AgentChat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />
            <div className="flex-1 flex flex-col ml-[35px] bg-background">
              <header className="h-12 flex items-center border-b border-border bg-card/50 backdrop-blur">
                <SidebarTrigger className="ml-4" />
                <div className="ml-4">
                  <h2 className="text-sm font-medium text-muted-foreground">
                    Agent Builder Platform
                  </h2>
                </div>
              </header>
              <main className="flex-1 overflow-auto bg-background scrollbar-thin">
        <Routes>
          <Route path="/" element={<BotLibrary />} />
          <Route path="/create" element={<BotCreator />} />
          <Route path="/flow" element={<FlowBuilder />} />
          <Route path="/flows" element={<FlowLibrary />} />
          <Route path="/chat" element={<AgentChatPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
