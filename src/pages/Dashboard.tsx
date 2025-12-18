import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  LogOut,
  TrendingUp,
  User as UserIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { RecentOperationsTable } from "@/components/dashboard/RecentOperationsTable";
import { EquityCurveChart } from "@/components/dashboard/EquityCurveChart";
import { PerformanceByDayChart } from "@/components/dashboard/PerformanceByDayChart";
import { WinLossDistribution } from "@/components/dashboard/WinLossDistribution";
import { QuickMetricsCards } from "@/components/dashboard/QuickMetricsCards";
import { PeriodFilter, PeriodOption, filterOperationsByPeriod } from "@/components/dashboard/PeriodFilter";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { RestrictedAccess } from "@/components/dashboard/RestrictedAccess";

interface Operation {
  id: string;
  operation_date: string;
  result: number;
  asset: string;
  strategy: string | null;
  contracts: number;
  operation_time: string;
}

// Helper function to calculate advanced metrics
const calculateAdvancedMetrics = (operations: Operation[]) => {
  if (operations.length === 0) {
    return {
      bestTrade: 0,
      worstTrade: 0,
      currentStreak: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      wins: 0,
      losses: 0,
    };
  }

  const results = operations.map(op => op.result);
  const wins = operations.filter(op => op.result > 0);
  const losses = operations.filter(op => op.result < 0);
  
  const bestTrade = Math.max(...results);
  const worstTrade = Math.min(...results);
  
  const totalWins = wins.reduce((sum, op) => sum + op.result, 0);
  const totalLosses = Math.abs(losses.reduce((sum, op) => sum + op.result, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
  
  const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;

  // Calculate current streak
  let currentStreak = 0;
  const sortedOps = [...operations].sort((a, b) => {
    const dateA = `${a.operation_date}${a.operation_time}`;
    const dateB = `${b.operation_date}${b.operation_time}`;
    return dateB.localeCompare(dateA);
  });

  if (sortedOps.length > 0) {
    const firstResult = sortedOps[0].result;
    const isWinStreak = firstResult > 0;
    
    for (const op of sortedOps) {
      if (isWinStreak && op.result > 0) {
        currentStreak++;
      } else if (!isWinStreak && op.result < 0) {
        currentStreak--;
      } else {
        break;
      }
    }
  }

  return {
    bestTrade,
    worstTrade,
    currentStreak,
    profitFactor: isFinite(profitFactor) ? profitFactor : 0,
    avgWin,
    avgLoss: -avgLoss,
    wins: wins.length,
    losses: losses.length,
  };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<string>("aprovado");
  const [allOperations, setAllOperations] = useState<Operation[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("30d");

  // Filter operations based on selected period
  const filteredOperations = useMemo(() => {
    return filterOperationsByPeriod(allOperations, selectedPeriod);
  }, [allOperations, selectedPeriod]);

  // Calculate stats based on filtered operations
  const stats = useMemo(() => {
    const totalOps = filteredOperations.length;
    const totalProfit = filteredOperations.reduce((sum, op) => sum + Number(op.result), 0);
    const winningOps = filteredOperations.filter(op => Number(op.result) > 0).length;
    const winRate = totalOps > 0 ? (winningOps / totalOps) * 100 : 0;
    const avgResult = totalOps > 0 ? totalProfit / totalOps : 0;

    return {
      totalOperations: totalOps,
      totalProfit,
      winRate,
      averageResult: avgResult,
    };
  }, [filteredOperations]);

  // Calculate advanced metrics based on filtered operations
  const advancedMetrics = useMemo(() => {
    return calculateAdvancedMetrics(filteredOperations);
  }, [filteredOperations]);

  // Recent operations (first 5 from filtered)
  const recentOperations = useMemo(() => {
    return filteredOperations.slice(0, 5);
  }, [filteredOperations]);

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

      setProfile(profileData);
      setAccessStatus(profileData?.access_status || "pendente");

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (rolesData) {
        setRoles(rolesData.map((r) => r.role));
      }

      // Buscar o total de operações de todos os usuários
      const { count } = await supabase
        .from("trading_operations")
        .select("*", { count: "exact", head: true });

      console.log(`Total de operações no banco: ${count}`);

      // Buscar TODAS as operações usando paginação para superar o limite de 1000
      let allOps: Operation[] = [];
      const pageSize = 1000;
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: pageData, error: pageError } = await supabase
          .from("trading_operations")
          .select("*")
          .order("operation_date", { ascending: false })
          .order("operation_time", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (pageError) {
          console.error("Erro ao carregar operações:", pageError);
          toast.error("Erro ao carregar operações");
          break;
        }

        if (pageData && pageData.length > 0) {
          allOps = [...allOps, ...pageData];
          page++;
          hasMore = pageData.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      console.log(`Total de operações carregadas: ${allOps.length}`);
      setAllOperations(allOps);
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
  const hasFullAccess = accessStatus === "aprovado" || isAdmin;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se o usuário não tem acesso aprovado, mostrar tela restrita
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

            <RestrictedAccess 
              accessStatus={accessStatus} 
              userName={profile?.full_name}
            />
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-accent/20 to-background relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="particle particle-1" />
          <div className="particle particle-2" />
          <div className="particle particle-3" />
          <div className="particle particle-4" />
          <div className="particle particle-5" />
          <div className="particle particle-6" />
          <div className="glow-orb glow-orb-1" />
          <div className="glow-orb glow-orb-2" />
          <div className="glow-orb glow-orb-3" />
        </div>

        <AppSidebar isAdmin={isAdmin} />

        <div className="flex-1 flex flex-col">
          <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger />
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
                  
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 border-2 border-primary">
                      {profile?.avatar_url && (
                        <AvatarImage src={profile.avatar_url} alt={profile.full_name || "Avatar"} />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground hidden sm:inline">
                      {profile?.full_name || user?.email}
                    </span>
                  </div>
                  
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

          <main className="flex-1 px-4 py-8 overflow-auto">
            {/* Welcome Card */}
            <div className="mb-6 animate-fade-in">
              <Card className="border-2 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardContent className="pt-6 relative z-10">
                  <div className="flex items-center gap-6">
                    <Avatar className="w-20 h-20 border-4 border-primary/20 shadow-xl ring-4 ring-background">
                      {profile?.avatar_url && (
                        <AvatarImage src={profile.avatar_url} alt={profile.full_name || "Avatar"} />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-2xl font-bold">
                        {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-foreground mb-2 tracking-tight">
                        Bem-vindo, {profile?.full_name || "Trader"}!
                      </h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="gap-1 font-medium">
                          <UserIcon className="w-3 h-3" />
                          {profile?.email}
                        </Badge>
                        {roles.map((role) => (
                          <Badge key={role} className="capitalize font-medium bg-primary/10 text-primary hover:bg-primary/20">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Period Filter */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-lg font-semibold text-foreground">Métricas de Performance</h3>
                <PeriodFilter 
                  selectedPeriod={selectedPeriod} 
                  onPeriodChange={setSelectedPeriod} 
                />
              </div>
            </div>

            {/* Main Stats */}
            <DashboardStats stats={stats} />

            {/* Quick Metrics */}
            <div className="mb-6">
              <QuickMetricsCards
                bestTrade={advancedMetrics.bestTrade}
                worstTrade={advancedMetrics.worstTrade}
                currentStreak={advancedMetrics.currentStreak}
                profitFactor={advancedMetrics.profitFactor}
                avgWin={advancedMetrics.avgWin}
                avgLoss={advancedMetrics.avgLoss}
                loading={loading}
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <EquityCurveChart operations={filteredOperations} loading={loading} />
              <PerformanceByDayChart operations={filteredOperations} loading={loading} />
            </div>

            {/* Win/Loss Distribution & Recent Operations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <WinLossDistribution 
                wins={advancedMetrics.wins} 
                losses={advancedMetrics.losses} 
                loading={loading} 
              />
              <div className="lg:col-span-2">
                <RecentOperationsTable operations={recentOperations} />
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
