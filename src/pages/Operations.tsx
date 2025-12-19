import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, TrendingUp } from "lucide-react";
import OperationForm from "@/components/operations/OperationForm";
import OperationsTable from "@/components/operations/OperationsTable";
import OperationsDashboard from "@/components/operations/OperationsDashboard";
import OperationImport from "@/components/operations/OperationImport";
import DeleteAllOperations from "@/components/operations/DeleteAllOperations";
import DeleteOperationsByStrategy from "@/components/operations/DeleteOperationsByStrategy";
import StrategyManager from "@/components/operations/StrategyManager";
import { OperationsFilters, type FilterValues } from "@/components/operations/OperationsFilters";
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

const Operations = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    strategies: [],
    asset: "",
    contractsMin: "",
    contractsMax: "",
    timeFrom: "",
    timeTo: "",
    resultType: "all",
  });

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

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const hasAdminRole = rolesData?.some(r => r.role === "admin");
      setIsAdmin(hasAdminRole || false);
    } catch (error) {
      console.error("Erro ao verificar usuário:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PremiumLoader />;
  }

  return (
    <PremiumPageLayout
      title="Operações do Sistema"
      subtitle="Gerencie e analise suas operações"
      icon={TrendingUp}
      maxWidth="full"
      headerActions={
        isAdmin && (
          <div className="flex gap-2">
            <DeleteOperationsByStrategy userId={user?.id} />
            <DeleteAllOperations userId={user?.id} />
          </div>
        )
      }
    >
      <Tabs defaultValue="register" className="space-y-6">
        <motion.div variants={itemVariants}>
          <TabsList className="grid w-full max-w-2xl grid-cols-3 h-14 bg-muted/50 p-1.5 rounded-2xl">
            <TabsTrigger 
              value="register" 
              className="data-[state=active]:bg-background data-[state=active]:shadow-lg rounded-xl font-semibold transition-all duration-300"
            >
              Registrar
            </TabsTrigger>
            <TabsTrigger 
              value="strategies"
              className="data-[state=active]:bg-background data-[state=active]:shadow-lg rounded-xl font-semibold transition-all duration-300"
            >
              Estratégias
            </TabsTrigger>
            <TabsTrigger 
              value="dashboard"
              className="data-[state=active]:bg-background data-[state=active]:shadow-lg rounded-xl font-semibold transition-all duration-300"
            >
              Dashboard Geral
            </TabsTrigger>
          </TabsList>
        </motion.div>

        <TabsContent value="register" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="lg:col-span-1 space-y-6">
              <PremiumCard variant="gradient">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-primary" />
                    </div>
                    Nova Operação
                  </CardTitle>
                  <CardDescription>
                    Registre os detalhes da sua operação
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <OperationForm userId={user?.id} />
                </CardContent>
              </PremiumCard>

              <OperationImport userId={user?.id} />
            </motion.div>

            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
              <OperationsFilters 
                userId={user?.id} 
                onFiltersChange={setFilters}
              />
              <PremiumCard>
                <CardHeader className="p-0 pb-4">
                  <CardTitle>Histórico de Operações</CardTitle>
                  <CardDescription>
                    Todas as operações registradas no sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <OperationsTable 
                    userId={user?.id} 
                    isAdmin={isAdmin}
                    filters={filters}
                  />
                </CardContent>
              </PremiumCard>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="strategies">
          <motion.div variants={itemVariants}>
            <StrategyManager userId={user?.id} />
          </motion.div>
        </TabsContent>

        <TabsContent value="dashboard">
          <motion.div variants={itemVariants}>
            <OperationsDashboard userId={user?.id} />
          </motion.div>
        </TabsContent>
      </Tabs>
    </PremiumPageLayout>
  );
};

export default Operations;
