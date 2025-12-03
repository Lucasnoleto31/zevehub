import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Users, Shield, Activity, Settings, Clock, CheckCircle, XCircle, Ban } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClientsTable from "@/components/admin/ClientsTable";
import PendingUsersTable from "@/components/admin/PendingUsersTable";
import CreateMessageDialog from "@/components/admin/CreateMessageDialog";
import { ThemeToggle } from "@/components/ThemeToggle";

const Admin = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    totalBots: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    blockedUsers: 0,
  });
  const [clients, setClients] = useState<Array<{ id: string; full_name: string; email: string }>>([]);

  useEffect(() => {
    checkAdminAccess();
    loadStats();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Verificar se é admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin");

      if (!roles || roles.length === 0) {
        toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Erro ao verificar acesso:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Total de clientes
      const { count: totalClients } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Clientes ativos
      const { count: activeClients } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Total de bots
      const { count: totalBots } = await supabase
        .from("client_bots")
        .select("*", { count: "exact", head: true });

      // Usuários pendentes
      const { count: pendingUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("access_status", "pendente");

      // Usuários aprovados
      const { count: approvedUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("access_status", "aprovado");

      // Usuários bloqueados/reprovados
      const { count: blockedUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .in("access_status", ["bloqueado", "reprovado"]);

      // Lista de clientes para mensagens
      const { data: clientsData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");

      setClients(clientsData || []);
      
      setStats({
        totalClients: totalClients || 0,
        activeClients: activeClients || 0,
        totalBots: totalBots || 0,
        pendingUsers: pendingUsers || 0,
        approvedUsers: approvedUsers || 0,
        blockedUsers: blockedUsers || 0,
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold text-foreground">Painel Administrativo</h1>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-2 border-yellow-500/20 bg-yellow-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Pendentes</CardTitle>
              <Clock className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.pendingUsers}</div>
              <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500/20 bg-green-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Aprovados</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.approvedUsers}</div>
              <p className="text-xs text-muted-foreground">Com acesso liberado</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-red-500/20 bg-red-500/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bloqueados/Reprovados</CardTitle>
              <Ban className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.blockedUsers}</div>
              <p className="text-xs text-muted-foreground">Sem acesso</p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground">{stats.activeClients} ativos</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Aprovação de Usuários
              {stats.pendingUsers > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-yellow-500 text-white rounded-full">
                  {stats.pendingUsers}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="clients">Gerenciar Clientes</TabsTrigger>
            <TabsTrigger value="permissions">Permissões</TabsTrigger>
            <TabsTrigger value="logs">Logs de Acesso</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Aprovação de Usuários</CardTitle>
                    <CardDescription>
                      Analise e aprove os usuários que solicitaram acesso ao Zeve Hub
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <PendingUsersTable onUpdate={loadStats} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Clientes Cadastrados</CardTitle>
                    <CardDescription>
                      Gerencie permissões, status e informações dos clientes
                    </CardDescription>
                  </div>
                  <CreateMessageDialog clients={clients} onMessageCreated={loadStats} />
                </div>
              </CardHeader>
              <CardContent>
                <ClientsTable onUpdate={loadStats} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Permissões</CardTitle>
                <CardDescription>
                  Configure permissões individuais por módulo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Funcionalidade em desenvolvimento
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Acesso</CardTitle>
                <CardDescription>
                  Histórico de acessos e atividades do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Funcionalidade em desenvolvimento
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
