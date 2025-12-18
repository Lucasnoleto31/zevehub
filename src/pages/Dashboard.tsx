import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { LogOut, TrendingUp, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RecentOperationsTable } from "@/components/dashboard/RecentOperationsTable";
import { EquityCurveChart } from "@/components/dashboard/EquityCurveChart";
import { PerformanceByDayChart } from "@/components/dashboard/PerformanceByDayChart";
import { WinLossDistribution } from "@/components/dashboard/WinLossDistribution";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { RestrictedAccess } from "@/components/dashboard/RestrictedAccess";
import MonthlyComparisonChart from "@/components/dashboard/MonthlyComparisonChart";
import PerformanceHeatmap from "@/components/dashboard/PerformanceHeatmap";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { EnhancedPeriodFilter, filterOperationsByPeriod, type PeriodOption } from "@/components/dashboard/EnhancedPeriodFilter";
import { StatsOverview } from "@/components/dashboard/StatsOverview";

interface Operation {
  id: string;
  operation_date: string;
  result: number;
  asset: string;
  strategy: string | null;
  contracts: number;
  operation_time: string;
}

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

  const filteredOperations = useMemo(() => {
    return filterOperationsByPeriod(allOperations, selectedPeriod);
  }, [allOperations, selectedPeriod]);

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

  const advancedMetrics = useMemo(() => {
    return calculateAdvancedMetrics(filteredOperations);
  }, [filteredOperations]);

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
            <div className="max-w-[1600px] mx-auto space-y-6">
              {/* Hero Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <DashboardHero
                  userName={profile?.full_name || "Trader"}
                  userEmail={profile?.email || user?.email || ""}
                  avatarUrl={profile?.avatar_url}
                  roles={roles}
                  stats={stats}
                  advancedMetrics={advancedMetrics}
                />
              </motion.div>

              {/* Period Filter */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <EnhancedPeriodFilter
                  selectedPeriod={selectedPeriod}
                  onPeriodChange={setSelectedPeriod}
                  totalOperations={filteredOperations.length}
                />
              </motion.div>

              {/* Stats Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <StatsOverview
                  stats={stats}
                  advancedMetrics={advancedMetrics}
                  loading={loading}
                />
              </motion.div>

              {/* Charts Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                <EquityCurveChart operations={filteredOperations} loading={loading} />
                <PerformanceByDayChart operations={filteredOperations} loading={loading} />
              </motion.div>

              {/* Monthly & Heatmap */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                <MonthlyComparisonChart operations={allOperations} loading={loading} />
                <PerformanceHeatmap operations={filteredOperations} />
              </motion.div>

              {/* Distribution & Recent Operations */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              >
                <WinLossDistribution 
                  wins={advancedMetrics.wins} 
                  losses={advancedMetrics.losses} 
                  loading={loading} 
                />
                <div className="lg:col-span-2">
                  <RecentOperationsTable operations={recentOperations} />
                </div>
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
