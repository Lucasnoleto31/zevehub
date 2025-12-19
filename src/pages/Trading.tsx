import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PremiumPageLayout, PremiumCard, PremiumSection } from "@/components/layout/PremiumPageLayout";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Target, 
  BarChart3, 
  Calendar,
  Clock,
  DollarSign,
  Activity,
  Zap,
  BookOpen,
  PieChart
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const Trading = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PremiumPageLayout
      title="Trading"
      subtitle="Gerencie suas operações de trading e acompanhe seu desempenho"
      icon={TrendingUp}
      showBackButton
      backTo="/dashboard"
    >
      <Tabs defaultValue="journal" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-4 gap-2 bg-card/50 p-1.5 h-auto">
          <TabsTrigger value="journal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Diário</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Análises</span>
          </TabsTrigger>
          <TabsTrigger value="planner" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Planejamento</span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Estatísticas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="journal" className="mt-6 space-y-6">
          <PremiumSection
            title="Diário de Trades"
            subtitle="Registre e acompanhe todas as suas operações"
            icon={BookOpen}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <motion.div variants={itemVariants}>
                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Trades Hoje
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-500">0</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-blue-500" />
                      Resultado Hoje
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-blue-500">R$ 0,00</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Target className="h-4 w-4 text-yellow-500" />
                      Taxa de Acerto
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-yellow-500">0%</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Zap className="h-4 w-4 text-purple-500" />
                      Payoff
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-purple-500">0:0</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </PremiumSection>

          <PremiumCard className="p-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum trade registrado hoje</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Comece a registrar suas operações para ter um histórico completo e análises detalhadas do seu desempenho.
              </p>
              <Button className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Registrar Trade
              </Button>
            </div>
          </PremiumCard>
        </TabsContent>

        <TabsContent value="analysis" className="mt-6 space-y-6">
          <PremiumSection
            title="Análises de Mercado"
            subtitle="Visualize gráficos e tendências do mercado"
            icon={BarChart3}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PremiumCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Activity className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Análise Técnica</h3>
                    <p className="text-sm text-muted-foreground">Indicadores e padrões</p>
                  </div>
                </div>
                <div className="h-48 flex items-center justify-center border border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground">Gráfico em desenvolvimento</p>
                </div>
              </PremiumCard>

              <PremiumCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Tendências</h3>
                    <p className="text-sm text-muted-foreground">Movimentos do mercado</p>
                  </div>
                </div>
                <div className="h-48 flex items-center justify-center border border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground">Gráfico em desenvolvimento</p>
                </div>
              </PremiumCard>
            </div>
          </PremiumSection>
        </TabsContent>

        <TabsContent value="planner" className="mt-6 space-y-6">
          <PremiumSection
            title="Planejamento de Trades"
            subtitle="Planeje suas operações antes de executar"
            icon={Target}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <PremiumCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/10">
                    <Calendar className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trades Planejados</p>
                    <p className="text-xl font-bold">0</p>
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Target className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Execução</p>
                    <p className="text-xl font-bold">0%</p>
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Próximo Trade</p>
                    <p className="text-xl font-bold">-</p>
                  </div>
                </div>
              </PremiumCard>
            </div>

            <PremiumCard className="p-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Target className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum trade planejado</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Planeje suas operações com antecedência para melhorar sua disciplina e resultados.
                </p>
                <Button variant="outline" className="gap-2">
                  <Target className="h-4 w-4" />
                  Criar Plano de Trade
                </Button>
              </div>
            </PremiumCard>
          </PremiumSection>
        </TabsContent>

        <TabsContent value="statistics" className="mt-6 space-y-6">
          <PremiumSection
            title="Estatísticas Detalhadas"
            subtitle="Métricas avançadas do seu trading"
            icon={PieChart}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <PremiumCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Ganhos</p>
                    <p className="text-xl font-bold text-green-500">R$ 0,00</p>
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <TrendingUp className="h-5 w-5 text-red-500 rotate-180" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Perdas</p>
                    <p className="text-xl font-bold text-red-500">R$ 0,00</p>
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Resultado Líquido</p>
                    <p className="text-xl font-bold text-blue-500">R$ 0,00</p>
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Activity className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Drawdown Máx.</p>
                    <p className="text-xl font-bold text-purple-500">0%</p>
                  </div>
                </div>
              </PremiumCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PremiumCard className="p-6">
                <h3 className="font-semibold mb-4">Distribuição por Ativo</h3>
                <div className="h-48 flex items-center justify-center border border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground">Sem dados suficientes</p>
                </div>
              </PremiumCard>

              <PremiumCard className="p-6">
                <h3 className="font-semibold mb-4">Performance por Horário</h3>
                <div className="h-48 flex items-center justify-center border border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground">Sem dados suficientes</p>
                </div>
              </PremiumCard>
            </div>
          </PremiumSection>
        </TabsContent>
      </Tabs>
    </PremiumPageLayout>
  );
};

export default Trading;
