import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { LogOut, TrendingUp, Mail, AlertTriangle, Bell, CheckCircle2, Clock, FileText, Download, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { RestrictedAccess } from "@/components/dashboard/RestrictedAccess";
import { TradingDashboard } from "@/components/trading/TradingDashboard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProfitOperation {
  id: string;
  user_id: string;
  open_time: string;
  close_time: string;
  operation_result: number | null;
  strategy_id: string | null;
  asset: string;
}

interface Strategy {
  id: string;
  name: string;
}

interface UnreadMessage {
  id: string;
  title: string;
  content: string;
  priority: string | null;
  created_at: string;
  is_global: boolean | null;
  attachment_url: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<string>("aprovado");
  const [operations, setOperations] = useState<ProfitOperation[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);
  const [showMessagesDialog, setShowMessagesDialog] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      // Verificar se o trial expirou
      if (profileData?.trial_expires_at && profileData?.access_status === "aprovado") {
        const trialExpires = new Date(profileData.trial_expires_at);
        if (trialExpires < new Date()) {
          // Bloquear automaticamente
          await supabase
            .from("profiles")
            .update({ 
              access_status: "bloqueado",
              trial_expires_at: null 
            })
            .eq("id", session.user.id);
          
          // Criar notificação
          await supabase.from("messages").insert({
            user_id: session.user.id,
            title: "Período de Teste Expirado",
            content: "Seu período de teste de 3 dias expirou. Entre em contato com seu assessor pelo WhatsApp +55 62 9994-4855 para continuar usando a plataforma.",
            priority: "high",
            is_global: false,
          });
          
          setAccessStatus("bloqueado");
          setProfile({ ...profileData, access_status: "bloqueado" });
        } else {
          setProfile(profileData);
          setAccessStatus(profileData?.access_status || "pendente");
        }
      } else {
        setProfile(profileData);
        setAccessStatus(profileData?.access_status || "pendente");
      }

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (rolesData) {
        setRoles(rolesData.map((r) => r.role));
      }

      // Fetch profit_operations
      const { data: opsData, error: opsError } = await supabase
        .from("profit_operations")
        .select("id, user_id, open_time, close_time, operation_result, strategy_id, asset")
        .eq("user_id", session.user.id)
        .order("open_time", { ascending: false });

      if (opsError) {
        console.error("Erro ao carregar operações:", opsError);
        toast.error("Erro ao carregar operações");
      } else {
        setOperations(opsData || []);
      }

      // Fetch strategies
      const { data: strategiesData, error: strategiesError } = await supabase
        .from("strategies")
        .select("id, name")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .order("name");

      if (strategiesError) {
        console.error("Erro ao carregar estratégias:", strategiesError);
      } else {
        setStrategies(strategiesData || []);
      }

      // Fetch unread messages from admin
      const { data: messagesData } = await supabase
        .from("messages")
        .select("id, title, content, priority, created_at, is_global, attachment_url")
        .or(`user_id.eq.${session.user.id},is_global.eq.true`)
        .not("created_by", "is", null)
        .eq("read", false)
        .order("created_at", { ascending: false });

      if (messagesData && messagesData.length > 0) {
        setUnreadMessages(messagesData);
        setShowMessagesDialog(true);
      }

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/auth");
  };

  const getPriorityConfig = (priority: string | null) => {
    switch (priority) {
      case "urgent":
        return { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", label: "Urgente", badgeVariant: "destructive" as const };
      case "high":
        return { icon: Bell, color: "text-orange-500", bg: "bg-orange-500/10", label: "Alta", badgeVariant: "default" as const };
      case "low":
        return { icon: Clock, color: "text-muted-foreground", bg: "bg-muted/50", label: "Baixa", badgeVariant: "secondary" as const };
      default:
        return { icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10", label: "Normal", badgeVariant: "outline" as const };
    }
  };

  const markCurrentMessageAsRead = async () => {
    if (unreadMessages.length === 0) return;
    
    const currentMessage = unreadMessages[currentMessageIndex];
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("id", currentMessage.id);
  };

  const handleNextMessage = async () => {
    await markCurrentMessageAsRead();
    if (currentMessageIndex < unreadMessages.length - 1) {
      setCurrentMessageIndex(prev => prev + 1);
    }
  };

  const handlePrevMessage = () => {
    if (currentMessageIndex > 0) {
      setCurrentMessageIndex(prev => prev - 1);
    }
  };

  const handleCloseMessages = async () => {
    // Mark all messages as read
    const messageIds = unreadMessages.map(m => m.id);
    await supabase
      .from("messages")
      .update({ read: true })
      .in("id", messageIds);
    
    setShowMessagesDialog(false);
    setUnreadMessages([]);
  };

  const currentMessage = unreadMessages[currentMessageIndex];

  const isAdmin = roles.includes("admin");
  const hasFullAccess = accessStatus === "aprovado" || isAdmin;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-primary/20 rounded-full" />
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-transparent border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!hasFullAccess) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-accent/20 to-background">
          <div className="flex-1 flex flex-col">
            <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
              <div className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h1 className="text-xl font-bold text-foreground">Portal Zeve</h1>
                        <p className="text-xs text-muted-foreground">Gestão e Performance</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                      <LogOut className="w-4 h-4" />
                      Sair
                    </Button>
                  </div>
                </div>
              </div>
            </header>

            <RestrictedAccess accessStatus={accessStatus} userName={profile?.full_name} />
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-background relative overflow-hidden">
        {/* Ambient Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-radial from-primary/10 via-transparent to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-radial from-violet-500/10 via-transparent to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-radial from-cyan-500/5 via-transparent to-transparent rounded-full blur-3xl" />
        </div>

        <AppSidebar isAdmin={isAdmin} />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
            <div className="px-4 lg:px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                      <TrendingUp className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="hidden sm:block">
                      <h1 className="text-lg font-bold text-foreground">Portal Zeve</h1>
                      <p className="text-[10px] text-muted-foreground -mt-0.5">Gestão e Performance</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <ThemeToggle />
                  
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/50 border border-border/40">
                    <Avatar className="h-7 w-7 border-2 border-primary/30">
                      {profile?.avatar_url && (
                        <AvatarImage src={profile.avatar_url} alt={profile.full_name || "Avatar"} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground hidden md:inline max-w-[100px] truncate">
                      {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}
                    </span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSignOut}
                    className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 px-4 lg:px-6 py-6 overflow-auto">
            <div className="max-w-[1600px] mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <TradingDashboard 
                  operations={operations} 
                  strategies={strategies} 
                />
              </motion.div>
            </div>
          </main>
        </div>
      </div>

      {/* Messages Dialog */}
      <Dialog open={showMessagesDialog} onOpenChange={setShowMessagesDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          {currentMessage && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${getPriorityConfig(currentMessage.priority).bg}`}>
                      <Mail className={`w-5 h-5 ${getPriorityConfig(currentMessage.priority).color}`} />
                    </div>
                    <Badge variant="secondary">
                      {currentMessageIndex + 1} de {unreadMessages.length}
                    </Badge>
                  </div>
                  <Badge variant={getPriorityConfig(currentMessage.priority).badgeVariant}>
                    {getPriorityConfig(currentMessage.priority).label}
                  </Badge>
                </div>
                <DialogTitle className="text-xl mt-3">{currentMessage.title}</DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(currentMessage.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                    {currentMessage.content}
                  </p>
                </div>

                {currentMessage.attachment_url && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-lg bg-red-500/10">
                        <FileText className="w-8 h-8 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Anexo PDF</p>
                        <p className="text-sm text-muted-foreground">Clique para visualizar</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open(currentMessage.attachment_url!, "_blank")}
                        >
                          <ExternalLink className="w-4 h-4" />
                          Abrir
                        </Button>
                        <Button variant="default" size="sm" className="gap-2" asChild>
                          <a href={currentMessage.attachment_url} download>
                            <Download className="w-4 h-4" />
                            Baixar
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={handlePrevMessage}
                    disabled={currentMessageIndex === 0}
                    className="flex-1 sm:flex-none gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleNextMessage}
                    disabled={currentMessageIndex === unreadMessages.length - 1}
                    className="flex-1 sm:flex-none gap-2"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <Button onClick={handleCloseMessages} className="w-full sm:w-auto">
                  {unreadMessages.length === 1 ? "Continuar para o Dashboard" : "Marcar todas como lidas e continuar"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Dashboard;
