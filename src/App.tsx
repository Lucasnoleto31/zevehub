import { lazy, Suspense } from "react";
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
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/register-sw";

// Lazy loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const Operations = lazy(() => import("./pages/Operations"));
const OperationDetail = lazy(() => import("./pages/OperationDetail"));
const Trading = lazy(() => import("./pages/Trading"));
const Profile = lazy(() => import("./pages/Profile"));
const Financas = lazy(() => import("./pages/Financas"));
const GerenciamentoRisco = lazy(() => import("./pages/GerenciamentoRisco"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Mensagens = lazy(() => import("./pages/Mensagens"));
const Impostos = lazy(() => import("./pages/Impostos"));
const CalendarioEconomico = lazy(() => import("./pages/CalendarioEconomico"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="relative">
      <div className="w-20 h-20 border-4 border-primary/20 rounded-full" />
      <div className="absolute top-0 left-0 w-20 h-20 border-4 border-transparent border-t-primary rounded-full animate-spin" />
    </div>
  </div>
);

const App = () => {
  useEffect(() => {
    registerServiceWorker().catch(console.error);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <AuthProvider>
              <TourProvider>
                <Toaster />
                <Sonner />
                <OfflineIndicator />
                <TourOverlay />
                <TourLauncher />
                <BrowserRouter>
                  <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
                      <Route path="/operations" element={<ProtectedRoute><Operations /></ProtectedRoute>} />
                      <Route path="/operation/:id" element={<ProtectedRoute><OperationDetail /></ProtectedRoute>} />
                      <Route path="/trading" element={<ProtectedRoute><Trading /></ProtectedRoute>} />
                      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                      <Route path="/financas" element={<ProtectedRoute><Financas /></ProtectedRoute>} />
                      <Route path="/risco" element={<ProtectedRoute><GerenciamentoRisco /></ProtectedRoute>} />
                      <Route path="/mensagens" element={<ProtectedRoute><Mensagens /></ProtectedRoute>} />
                      <Route path="/impostos" element={<ProtectedRoute><Impostos /></ProtectedRoute>} />
                      <Route path="/calendario" element={<ProtectedRoute><CalendarioEconomico /></ProtectedRoute>} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </TourProvider>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
