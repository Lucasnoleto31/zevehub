import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, Bot, TrendingUp, Activity, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface BotData {
  id: string;
  bot_name: string;
  status: string;
  performance_percentage: number;
  volume_operated: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const BotsComparison = () => {
  const navigate = useNavigate();
  const [bots, setBots] = useState<BotData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      const { data, error } = await supabase
        .from("client_bots")
        .select("*")
        .order("performance_percentage", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setBots(data || []);
    } catch (error) {
      console.error("Erro ao carregar robôs:", error);
    } finally {
      setLoading(false);
    }
  };

  const performanceData = bots.map(bot => ({
    name: bot.bot_name,
    performance: bot.performance_percentage || 0,
  }));

  const volumeData = bots.map(bot => ({
    name: bot.bot_name,
    volume: bot.volume_operated || 0,
  }));

  const statusData = [
    { name: 'Ativo', value: bots.filter(b => b.status === 'active').length },
    { name: 'Inativo', value: bots.filter(b => b.status === 'inactive').length },
    { name: 'Manutenção', value: bots.filter(b => b.status === 'maintenance').length },
  ].filter(item => item.value > 0);

  const totalPerformance = bots.reduce((sum, bot) => sum + (bot.performance_percentage || 0), 0);
  const avgPerformance = bots.length > 0 ? (totalPerformance / bots.length).toFixed(2) : "0";
  const totalVolume = bots.reduce((sum, bot) => sum + (bot.volume_operated || 0), 0);
  const activeBots = bots.filter(b => b.status === 'active').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-xl font-bold">Comparativo de Robôs</h1>
                <p className="text-sm text-muted-foreground">Análise comparativa de performance</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Robôs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-primary" />
                  <span className="text-2xl font-bold">{bots.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Robôs Ativos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-success" />
                  <span className="text-2xl font-bold">{activeBots}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Performance Média
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  <span className="text-2xl font-bold text-success">+{avgPerformance}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Volume Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <span className="text-2xl font-bold">{totalVolume.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Performance por Robô (%)</CardTitle>
              <CardDescription>Comparação de performance entre todos os robôs</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="performance" name="Performance %" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Grid com Volume e Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Volume */}
            <Card>
              <CardHeader>
                <CardTitle>Volume Operado</CardTitle>
                <CardDescription>Comparação de volume entre robôs</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="volume" name="Volume" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Status */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Status</CardTitle>
                <CardDescription>Status atual dos robôs</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tabela Comparativa */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes Comparativos</CardTitle>
              <CardDescription>Visão detalhada de todos os robôs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Robô</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-right py-3 px-4 font-medium">Performance</th>
                      <th className="text-right py-3 px-4 font-medium">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bots.map((bot) => (
                      <tr 
                        key={bot.id} 
                        className="border-b hover:bg-accent/5 cursor-pointer transition-colors"
                        onClick={() => navigate(`/bot/${bot.id}`)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4 text-primary" />
                            <span className="font-medium">{bot.bot_name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={bot.status === "active" ? "default" : "secondary"}>
                            {bot.status === "active" ? "Ativo" : bot.status === "inactive" ? "Inativo" : "Manutenção"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-semibold text-success">
                            {bot.performance_percentage ? `+${bot.performance_percentage}%` : "--"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {bot.volume_operated ? bot.volume_operated.toLocaleString() : "0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BotsComparison;
