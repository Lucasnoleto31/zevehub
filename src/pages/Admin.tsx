import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Users, Settings, Clock, CheckCircle, Ban, Film } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClientsTable from "@/components/admin/ClientsTable";
import PendingUsersTable from "@/components/admin/PendingUsersTable";
import PermissionsManager from "@/components/admin/PermissionsManager";
import CreateMessageDialog from "@/components/admin/CreateMessageDialog";
import { ReelsManager } from "@/components/admin/ReelsManager";
import { PremiumPageLayout, PremiumCard, PremiumLoader } from "@/components/layout/PremiumPageLayout";
import { motion } from "framer-motion";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
};

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
      const { count: totalClients } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: activeClients } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      const { count: totalBots } = await supabase
        .from("client_bots")
        .select("*", { count: "exact", head: true });

      const { count: pendingUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("access_status", "pendente");

      const { count: approvedUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("access_status", "aprovado");

      const { count: blockedUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .in("access_status", ["bloqueado", "reprovado"]);

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
    return <PremiumLoader />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <PremiumPageLayout
      title="Painel Administrativo"
      subtitle="Gerencie usuários e permissões"
      icon={Settings}
      maxWidth="full"
    >
      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumCard className="border-2 border-warning/20 bg-warning/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Usuários Pendentes</p>
              <p className="text-3xl font-bold text-warning">{stats.pendingUsers}</p>
              <p className="text-xs text-muted-foreground mt-1">Aguardando aprovação</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="border-2 border-success/20 bg-success/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Usuários Aprovados</p>
              <p className="text-3xl font-bold text-success">{stats.approvedUsers}</p>
              <p className="text-xs text-muted-foreground mt-1">Com acesso liberado</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="border-2 border-destructive/20 bg-destructive/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Bloqueados/Reprovados</p>
              <p className="text-3xl font-bold text-destructive">{stats.blockedUsers}</p>
              <p className="text-xs text-muted-foreground mt-1">Sem acesso</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <Ban className="w-6 h-6 text-destructive" />
            </div>
          </div>
        </PremiumCard>

        <PremiumCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalClients}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.activeClients} ativos</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
        </PremiumCard>
      </motion.div>

      {/* Admin Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="h-14 bg-muted/50 p-1.5 rounded-2xl">
            <TabsTrigger 
              value="pending" 
              className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg rounded-xl font-semibold transition-all duration-300"
            >
              <Clock className="w-4 h-4" />
              Aprovação de Usuários
              {stats.pendingUsers > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-warning text-white rounded-full">
                  {stats.pendingUsers}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="clients"
              className="data-[state=active]:bg-background data-[state=active]:shadow-lg rounded-xl font-semibold transition-all duration-300"
            >
              Gerenciar Clientes
            </TabsTrigger>
            <TabsTrigger 
              value="permissions"
              className="data-[state=active]:bg-background data-[state=active]:shadow-lg rounded-xl font-semibold transition-all duration-300"
            >
              Permissões
            </TabsTrigger>
            <TabsTrigger 
              value="logs"
              className="data-[state=active]:bg-background data-[state=active]:shadow-lg rounded-xl font-semibold transition-all duration-300"
            >
              Logs de Acesso
            </TabsTrigger>
            <TabsTrigger 
              value="reels"
              className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg rounded-xl font-semibold transition-all duration-300"
            >
              <Film className="w-4 h-4" />
              Reels
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <PremiumCard variant="gradient">
              <CardHeader className="p-0 pb-4">
                <CardTitle>Aprovação de Usuários</CardTitle>
                <CardDescription>
                  Analise e aprove os usuários que solicitaram acesso ao Zeve Hub
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <PendingUsersTable onUpdate={loadStats} />
              </CardContent>
            </PremiumCard>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <PremiumCard variant="gradient">
              <CardHeader className="p-0 pb-4">
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
              <CardContent className="p-0">
                <ClientsTable onUpdate={loadStats} />
              </CardContent>
            </PremiumCard>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <PremiumCard variant="gradient">
              <CardHeader className="p-0 pb-4">
                <CardTitle>Gerenciar Permissões</CardTitle>
                <CardDescription>
                  Configure permissões individuais por módulo para cada usuário aprovado
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <PermissionsManager onUpdate={loadStats} />
              </CardContent>
            </PremiumCard>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <PremiumCard variant="gradient">
              <CardHeader className="p-0 pb-4">
                <CardTitle>Logs de Acesso</CardTitle>
                <CardDescription>
                  Histórico de acessos e atividades do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <p className="text-muted-foreground text-center py-8">
                  Funcionalidade em desenvolvimento
                </p>
              </CardContent>
            </PremiumCard>
          </TabsContent>

          <TabsContent value="reels" className="space-y-4">
            <PremiumCard variant="gradient">
              <CardHeader className="p-0 pb-4">
                <CardTitle>Gerenciar Reels</CardTitle>
                <CardDescription>
                  Publique e gerencie vídeos educacionais curtos
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ReelsManager />
              </CardContent>
            </PremiumCard>
          </TabsContent>
        </Tabs>
      </motion.div>
    </PremiumPageLayout>
  );
};

export default Admin;
