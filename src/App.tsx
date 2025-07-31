import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";

import BotCreator from "./pages/BotCreator";
import BotLibrary from "./pages/BotLibrary";
import FlowBuilder from "./pages/FlowBuilder";
import FlowLibrary from "./pages/FlowLibrary";
import AgentChatPage from "./pages/AgentChat";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <BotLibrary />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/create" element={
              <ProtectedRoute>
                <Layout>
                  <BotCreator />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/flow" element={
              <ProtectedRoute>
                <Layout>
                  <FlowBuilder />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/flows" element={
              <ProtectedRoute>
                <Layout>
                  <FlowLibrary />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute>
                <Layout>
                  <AgentChatPage />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="*" element={
              <ProtectedRoute>
                <Layout>
                  <NotFound />
                </Layout>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
