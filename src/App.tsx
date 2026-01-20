import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "@/components/ErrorBoundary";
import OfflineIndicator from "@/components/OfflineIndicator";
import { TourProvider } from "@/contexts/TourContext";
import { TourOverlay } from "@/components/tour/TourOverlay";
import { TourLauncher } from "@/components/tour/TourLauncher";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Operations from "./pages/Operations";
import OperationDetail from "./pages/OperationDetail";
import Profile from "./pages/Profile";
import Financas from "./pages/Financas";
import GerenciamentoRisco from "./pages/GerenciamentoRisco";
import Onboarding from "./pages/Onboarding";
import Mensagens from "./pages/Mensagens";
import Impostos from "./pages/Impostos";
import CalendarioEconomico from "./pages/CalendarioEconomico";

import Trading from "./pages/Trading";
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
            <TourProvider>
              <Toaster />
              <Sonner />
              <OfflineIndicator />
              <TourOverlay />
              <TourLauncher />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/admin" element={<Admin />} />
                  
                  <Route path="/operations" element={<Operations />} />
                  <Route path="/operation/:id" element={<OperationDetail />} />
                  <Route path="/trading" element={<Trading />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/financas" element={<Financas />} />
                  <Route path="/risco" element={<GerenciamentoRisco />} />
                  <Route path="/mensagens" element={<Mensagens />} />
                  <Route path="/impostos" element={<Impostos />} />
                  <Route path="/calendario" element={<CalendarioEconomico />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TourProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
