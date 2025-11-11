import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  LogOut,
  TrendingUp,
  Bot,
  MessageSquare,
  Activity,
  User as UserIcon,
  Shield,
  Settings,
  Bell,
  LineChart,
} from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import BotsList from "@/components/dashboard/BotsList";
import MessagesList from "@/components/dashboard/MessagesList";
import BotsPerformanceChart from "@/components/dashboard/BotsPerformanceChart";
import RecentOperations from "@/components/dashboard/RecentOperations";
import NotificationsPopover from "@/components/dashboard/NotificationsPopover";
import AdvancedTools from "@/components/dashboard/AdvancedTools";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { ThemeToggle } from "@/components/ThemeToggle";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [botsStats, setBotsStats] = useState({ total: 0, active: 0, avgPerformance: 0 });
  const { unreadCount } = useRealtimeNotifications(user?.id);

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

      // Buscar perfil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      // Buscar roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (rolesData) {
        setRoles(rolesData.map((r) => r.role));
      }

      // Buscar estatísticas dos robôs
      const { data: botsData } = await supabase
        .from("client_bots")
        .select("status, performance_percentage");

      if (botsData) {
        const total = botsData.length;
        const active = botsData.filter(b => b.status === 'active').length;
        const validPerformances = botsData
          .filter(b => b.performance_percentage !== null)
          .map(b => b.performance_percentage);
        const avgPerformance = validPerformances.length > 0
          ? validPerformances.reduce((a, b) => a + b, 0) / validPerformances.length
          : 0;
        
        setBotsStats({ total, active, avgPerformance });
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

  const isAdmin = roles.includes("admin");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Portal Zeve</h1>
                <p className="text-xs text-muted-foreground">Gestão e Performance</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <NotificationsPopover userId={user?.id || ""} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/operations")}
                className="gap-2"
              >
                <LineChart className="w-4 h-4" />
                Operações
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Admin
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <Card className="gradient-card border-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-primary/20">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl">
                    {profile?.full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    Bem-vindo, {profile?.full_name || "Cliente"}!
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="gap-1">
                      <UserIcon className="w-3 h-3" />
                      {profile?.email}
                    </Badge>
                    {roles.map((role) => (
                      <Badge key={role} variant="secondary" className="gap-1">
                        <Shield className="w-3 h-3" />
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-slide-up">
          <StatsCard
            title="Robôs Cadastrados"
            value={botsStats.total.toString()}
            icon={<Bot className="w-5 h-5" />}
            description={botsStats.active > 0 ? `${botsStats.active} ativo(s)` : "Nenhum robô ativo"}
            trend={botsStats.active > 0 ? `${botsStats.active}/${botsStats.total}` : "--"}
          />
          <StatsCard
            title="Performance Média"
            value={botsStats.avgPerformance > 0 ? `${botsStats.avgPerformance.toFixed(1)}%` : "0%"}
            icon={<Activity className="w-5 h-5" />}
            description={botsStats.avgPerformance > 0 ? "Dos robôs cadastrados" : "Aguardando dados"}
            trend={botsStats.avgPerformance > 0 ? `+${botsStats.avgPerformance.toFixed(1)}%` : "--"}
          />
          <StatsCard
            title="Mensagens"
            value={unreadCount.toString()}
            icon={
              <div className="relative">
                <MessageSquare className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                )}
              </div>
            }
            description={unreadCount > 0 ? `${unreadCount} não lida(s)` : "Nenhuma mensagem nova"}
            trend={unreadCount > 0 ? "🔔" : "--"}
          />
        </div>

        {/* Performance Chart */}
        <div className="mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <BotsPerformanceChart />
        </div>

        {/* Operations Section */}
        <div className="mb-8 animate-slide-up" style={{ animationDelay: "0.15s" }}>
          <RecentOperations userId={user?.id || ""} />
        </div>

        {/* Advanced Tools Section */}
        <div className="mb-8 animate-slide-up" style={{ animationDelay: "0.18s" }}>
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Ferramentas Avançadas
              </CardTitle>
              <CardDescription>
                Gestão de banca, metas, análise temporal e relatórios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdvancedTools userId={user?.id || ""} />
            </CardContent>
          </Card>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Robôs Cadastrados
                </CardTitle>
                <CardDescription>
                  Visualize todos os robôs cadastrados pela assessoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BotsList userId={user?.id || ""} />
              </CardContent>
            </Card>
          </div>

          <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Mensagens e Comunicados
                </CardTitle>
                <CardDescription>
                  Atualizações importantes da assessoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MessagesList userId={user?.id || ""} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
