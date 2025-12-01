import { useEffect, useState } from "react";
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
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOperations: 0,
    totalProfit: 0,
    winRate: 0,
    averageResult: 0,
  });
  const [recentOperations, setRecentOperations] = useState<any[]>([]);

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

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (rolesData) {
        setRoles(rolesData.map((r) => r.role));
      }

      const { data: operations, error: opsError } = await supabase
        .from("trading_operations")
        .select("*")
        .eq("user_id", session.user.id)
        .order("operation_date", { ascending: false })
        .order("operation_time", { ascending: false });

      if (opsError) {
        console.error("Erro ao carregar operações:", opsError);
        toast.error("Erro ao carregar operações");
      }

      if (operations) {
        const totalOps = operations.length;
        const totalProfit = operations.reduce((sum, op) => sum + Number(op.result), 0);
        const winningOps = operations.filter(op => Number(op.result) > 0).length;
        const winRate = totalOps > 0 ? (winningOps / totalOps) * 100 : 0;
        const avgResult = totalOps > 0 ? totalProfit / totalOps : 0;

        setStats({
          totalOperations: totalOps,
          totalProfit,
          winRate,
          averageResult: avgResult,
        });

        setRecentOperations(operations.slice(0, 5));
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
            <div className="mb-8 animate-fade-in">
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

            <DashboardStats stats={stats} />
            <RecentOperationsTable operations={recentOperations} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
