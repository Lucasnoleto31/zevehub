import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  BarChart3, 
  Plus,
  BookOpen,
  LineChart,
  PieChart
} from "lucide-react";
import { motion } from "framer-motion";
import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPie, Pie, Cell } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface JournalTrade {
  id: string;
  asset: string;
  market: string;
  trade_date: string;
  entry_time: string | null;
  exit_time: string | null;
  side: string;
  strategy_id: string | null;
  timeframe: string | null;
  entry_price: number | null;
  stop_loss: number | null;
  target: number | null;
  risk_value: number | null;
  contracts: number | null;
  result_value: number | null;
  result_r: number | null;
  status: string;
  emotion_before: string | null;
  emotion_after: string | null;
  followed_plan: boolean | null;
  notes: string | null;
  created_at: string;
  strategies?: { id: string; name: string } | null;
}

interface Strategy {
  id: string;
  name: string;
  description: string | null;
}

const COLORS = ['hsl(var(--success))', 'hsl(var(--destructive))', 'hsl(var(--muted))'];

export default function Journal() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    setIsAdmin(roles?.some(r => r.role === "admin") || false);
    await loadData(user.id);
  };

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      const [tradesRes, strategiesRes] = await Promise.all([
        supabase
          .from("journal_trades")
          .select("*, strategies(id, name)")
          .eq("user_id", userId)
          .order("trade_date", { ascending: false }),
        supabase
          .from("strategies")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true)
      ]);

      if (tradesRes.data) setTrades(tradesRes.data);
      if (strategiesRes.data) setStrategies(strategiesRes.data);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const totalProfit = trades.reduce((sum, t) => sum + (t.result_value || 0), 0);
  const totalTrades = trades.length;
  const wins = trades.filter(t => t.status === "Gain").length;
  const losses = trades.filter(t => t.status === "Loss").length;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  
  const avgWin = wins > 0 
    ? trades.filter(t => t.status === "Gain").reduce((sum, t) => sum + (t.result_value || 0), 0) / wins 
    : 0;
  const avgLoss = losses > 0 
    ? Math.abs(trades.filter(t => t.status === "Loss").reduce((sum, t) => sum + (t.result_value || 0), 0) / losses)
    : 0;
  const expectancy = avgLoss > 0 ? ((winRate / 100) * avgWin) - ((1 - winRate / 100) * avgLoss) : avgWin;

  // Calculate max drawdown
  let maxDrawdown = 0;
  let peak = 0;
  let runningTotal = 0;
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );
  
  sortedTrades.forEach(trade => {
    runningTotal += trade.result_value || 0;
    if (runningTotal > peak) peak = runningTotal;
    const drawdown = peak - runningTotal;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  });

  // Equity curve data
  const equityCurve = sortedTrades.reduce((acc: { date: string; equity: number }[], trade, index) => {
    const prevEquity = index > 0 ? acc[index - 1].equity : 0;
    acc.push({
      date: trade.trade_date,
      equity: prevEquity + (trade.result_value || 0)
    });
    return acc;
  }, []);

  // Profit by strategy
  const profitByStrategy = strategies.map(strategy => {
    const strategyTrades = trades.filter(t => t.strategy_id === strategy.id);
    const profit = strategyTrades.reduce((sum, t) => sum + (t.result_value || 0), 0);
    return {
      name: strategy.name,
      profit,
      trades: strategyTrades.length,
      winRate: strategyTrades.length > 0 
        ? (strategyTrades.filter(t => t.status === "Gain").length / strategyTrades.length) * 100 
        : 0
    };
  });

  // Gain/Loss distribution
  const gainLossData = [
    { name: "Gain", value: wins },
    { name: "Loss", value: losses },
    { name: "Zero", value: trades.filter(t => t.status === "Zero").length }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-accent/5 to-background">
        <AppSidebar isAdmin={isAdmin} />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                      Diário de Trading
                    </h1>
                    <p className="text-muted-foreground text-sm">
                      Acompanhe suas operações e evolua como trader
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate("/journal/nova-operacao")}
                  className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  <Plus className="w-4 h-4" />
                  Nova Operação
                </Button>
              </motion.div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-card/50 backdrop-blur-sm border border-border/50 p-1">
                  <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-primary/20">
                    <Activity className="w-4 h-4" />
                    Visão Geral
                  </TabsTrigger>
                  <TabsTrigger value="strategies" className="gap-2 data-[state=active]:bg-primary/20">
                    <Target className="w-4 h-4" />
                    Estratégias
                  </TabsTrigger>
                  <TabsTrigger value="dashboards" className="gap-2 data-[state=active]:bg-primary/20">
                    <BarChart3 className="w-4 h-4" />
                    Dashboards
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  {/* Metrics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                      <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Resultado Total
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(totalProfit)}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                      <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Win Rate
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-foreground">
                            {winRate.toFixed(1)}%
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Expectância
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className={`text-2xl font-bold ${expectancy >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(expectancy)}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                      <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingDown className="w-4 h-4" />
                            Drawdown Máximo
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-destructive">
                            {formatCurrency(maxDrawdown)}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                      <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Trades Totais
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-foreground">
                            {totalTrades}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </div>

                  {/* Equity Curve */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <LineChart className="w-5 h-5 text-primary" />
                          Equity Curve
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {equityCurve.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <RechartsLine data={equityCurve}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis 
                                dataKey="date" 
                                stroke="hsl(var(--muted-foreground))"
                                tickFormatter={(value) => {
                                  const [year, month, day] = value.split('-');
                                  return `${day}/${month}`;
                                }}
                              />
                              <YAxis 
                                stroke="hsl(var(--muted-foreground))"
                                tickFormatter={(value) => formatCurrency(value)}
                              />
                              <Tooltip 
                                formatter={(value: number) => [formatCurrency(value), "Equity"]}
                                labelFormatter={(label) => {
                                  const [year, month, day] = label.split('-');
                                  return `${day}/${month}/${year}`;
                                }}
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="equity" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={2}
                                dot={false}
                              />
                            </RechartsLine>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                            Nenhum trade registrado ainda
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>

                {/* Strategies Tab */}
                <TabsContent value="strategies" className="space-y-6">
                  <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        Performance por Estratégia
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {profitByStrategy.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-3 px-4 text-muted-foreground font-medium">Estratégia</th>
                                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Trades</th>
                                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Win Rate</th>
                                <th className="text-right py-3 px-4 text-muted-foreground font-medium">Lucro Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {profitByStrategy.map((strategy, index) => (
                                <tr key={index} className="border-b border-border/50 hover:bg-muted/20">
                                  <td className="py-3 px-4 font-medium">{strategy.name}</td>
                                  <td className="py-3 px-4 text-right">{strategy.trades}</td>
                                  <td className="py-3 px-4 text-right">{strategy.winRate.toFixed(1)}%</td>
                                  <td className={`py-3 px-4 text-right font-medium ${strategy.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                                    {formatCurrency(strategy.profit)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                          Nenhuma estratégia cadastrada
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Dashboards Tab */}
                <TabsContent value="dashboards" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Profit by Strategy Bar Chart */}
                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-primary" />
                          Lucro por Estratégia
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {profitByStrategy.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={profitByStrategy}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                              <YAxis 
                                stroke="hsl(var(--muted-foreground))"
                                tickFormatter={(value) => formatCurrency(value)}
                              />
                              <Tooltip 
                                formatter={(value: number) => [formatCurrency(value), "Lucro"]}
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }}
                              />
                              <Bar 
                                dataKey="profit" 
                                fill="hsl(var(--primary))"
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                            Sem dados para exibir
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Gain/Loss Pie Chart */}
                    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <PieChart className="w-5 h-5 text-primary" />
                          Gain x Loss
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {totalTrades > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <RechartsPie>
                              <Pie
                                data={gainLossData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              >
                                {gainLossData.map((entry, index) => (
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
                            </RechartsPie>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                            Sem dados para exibir
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
