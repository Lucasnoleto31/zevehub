import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "@/components/ErrorBoundary";
import OfflineIndicator from "@/components/OfflineIndicator";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Operations from "./pages/Operations";
import OperationDetail from "./pages/OperationDetail";
import Profile from "./pages/Profile";
import PersonalFinances from "./pages/PersonalFinances";
import MarketIntelligence from "./pages/MarketIntelligence";
import Robos from "./pages/Robos";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/register-sw";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Registra o Service Worker para funcionalidade offline
    registerServiceWorker().catch(console.error);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <OfflineIndicator />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/operations" element={<Operations />} />
                <Route path="/operation/:id" element={<OperationDetail />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/financas" element={<PersonalFinances />} />
                <Route path="/inteligencia-mercado" element={<MarketIntelligence />} />
                <Route path="/robos" element={<Robos />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
