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
import Financas from "./pages/Financas";
import GerenciamentoRisco from "./pages/GerenciamentoRisco";
import Aprenda from "./pages/Aprenda";
import TrilhaDetail from "./pages/TrilhaDetail";
import LessonView from "./pages/LessonView";
import QuizView from "./pages/QuizView";
import AdminEducacional from "./pages/AdminEducacional";
import Community from "./pages/Community";
import Explore from "./pages/Explore";
import PublicProfile from "./pages/PublicProfile";
import HashtagPage from "./pages/HashtagPage";
import Onboarding from "./pages/Onboarding";
import Contratos from "./pages/Contratos";
import Journal from "./pages/Journal";
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
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/contratos" element={<Contratos />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/operations" element={<Operations />} />
                <Route path="/operation/:id" element={<OperationDetail />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/financas" element={<Financas />} />
                <Route path="/risco" element={<GerenciamentoRisco />} />
                <Route path="/aprenda" element={<Aprenda />} />
                <Route path="/aprenda/admin" element={<AdminEducacional />} />
                <Route path="/aprenda/trilha/:slug" element={<TrilhaDetail />} />
                <Route path="/aprenda/aula/:lessonId" element={<LessonView />} />
                <Route path="/aprenda/quiz/:quizId" element={<QuizView />} />
                <Route path="/perfil/:userId" element={<PublicProfile />} />
                <Route path="/comunidade" element={<Community />} />
                <Route path="/explorar" element={<Explore />} />
                <Route path="/hashtag/:hashtag" element={<HashtagPage />} />
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
