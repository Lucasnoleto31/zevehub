import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getHours, getYear, getMonth, subMonths, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Activity,
  Zap,
  Calendar,
  Clock,
  Award,
  AlertTriangle,
  BarChart3,
  ChevronUp,
  ChevronDown,
  Flame,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CalendarDays
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumCard, PremiumSection } from "@/components/layout/PremiumPageLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
  ComposedChart
} from "recharts";

interface ProfitOperation {
  id: string;
  user_id: string;
  open_time: string;
  close_time: string;
  operation_result: number | null;
  strategy_id: string | null;
  asset: string;
}

interface Strategy {
  id: string;
  name: string;
}

interface TradingDashboardProps {
  operations: ProfitOperation[];
  strategies: Strategy[];
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export const TradingDashboard = ({ operations, strategies }: TradingDashboardProps) => {
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [strategyFilter, setStrategyFilter] = useState<string>("all");

  // Filter operations
  const filteredOperations = useMemo(() => {
    let filtered = [...operations];

    // Filter by strategy
    if (strategyFilter !== "all") {
      filtered = filtered.filter(op => op.strategy_id === strategyFilter);
    }

    // Filter by period
    const now = new Date();
    if (periodFilter === "7d") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(op => new Date(op.open_time) >= start);
    } else if (periodFilter === "30d") {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(op => new Date(op.open_time) >= start);
    } else if (periodFilter === "90d") {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(op => new Date(op.open_time) >= start);
    } else if (periodFilter === "ytd") {
      const start = new Date(now.getFullYear(), 0, 1);
      filtered = filtered.filter(op => new Date(op.open_time) >= start);
    }

    return filtered;
  }, [operations, periodFilter, strategyFilter]);

  // Calculate all statistics
  const stats = useMemo(() => {
    const ops = filteredOperations;
    const results = ops.map(op => op.operation_result || 0);
    
    // Basic stats
    const totalResult = results.reduce((sum, r) => sum + r, 0);
    const wins = results.filter(r => r > 0);
    const losses = results.filter(r => r < 0);
    const winRate = ops.length > 0 ? (wins.length / ops.length * 100) : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, r) => s + r, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, r) => s + r, 0) / losses.length) : 0;
    const payoff = avgLoss > 0 ? avgWin / avgLoss : 0;
    
    // Days stats
    const dayResults: Record<string, number> = {};
    ops.forEach(op => {
      const day = format(new Date(op.open_time), 'yyyy-MM-dd');
      dayResults[day] = (dayResults[day] || 0) + (op.operation_result || 0);
    });
    const dayValues = Object.values(dayResults);
    const positiveDays = dayValues.filter(v => v > 0).length;
    const negativeDays = dayValues.filter(v => v < 0).length;
    
    // Month stats
    const monthResults: Record<string, number> = {};
    ops.forEach(op => {
      const month = format(new Date(op.open_time), 'yyyy-MM');
      monthResults[month] = (monthResults[month] || 0) + (op.operation_result || 0);
    });
    const monthValues = Object.values(monthResults);
    const positiveMonths = monthValues.filter(v => v > 0).length;
    const negativeMonths = monthValues.filter(v => v < 0).length;
    
    // Consistency (% of positive days)
    const consistency = dayValues.length > 0 ? (positiveDays / dayValues.length * 100) : 0;
    
    // Best/Worst trade
    const bestTrade = results.length > 0 ? Math.max(...results) : 0;
    const worstTrade = results.length > 0 ? Math.min(...results) : 0;
    
    // Monthly average
    const monthlyAvg = monthValues.length > 0 ? monthValues.reduce((s, v) => s + v, 0) / monthValues.length : 0;
    
    // Standard deviation
    const mean = results.length > 0 ? totalResult / results.length : 0;
    const variance = results.length > 0 
      ? results.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / results.length 
      : 0;
    const stdDev = Math.sqrt(variance);
    
    // Volatility (coefficient of variation)
    const volatility = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0;
    
    // W/L Sequence
    let currentStreak = 0;
    let streakType: 'W' | 'L' | null = null;
    const sortedOps = [...ops].sort((a, b) => new Date(a.open_time).getTime() - new Date(b.open_time).getTime());
    for (let i = sortedOps.length - 1; i >= 0; i--) {
      const result = sortedOps[i].operation_result || 0;
      if (i === sortedOps.length - 1) {
        streakType = result > 0 ? 'W' : result < 0 ? 'L' : null;
        currentStreak = result !== 0 ? 1 : 0;
      } else {
        const currentType = result > 0 ? 'W' : result < 0 ? 'L' : null;
        if (currentType === streakType && currentType !== null) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Cumulative data for equity curve
    let cumulative = 0;
    let maxBalance = 0;
    let minBalance = 0;
    const equityCurve = sortedOps.map((op, idx) => {
      cumulative += op.operation_result || 0;
      maxBalance = Math.max(maxBalance, cumulative);
      minBalance = Math.min(minBalance, cumulative);
      return {
        index: idx + 1,
        result: op.operation_result || 0,
        total: cumulative,
        date: format(new Date(op.open_time), 'dd/MM HH:mm')
      };
    });

    // Max Drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let drawdownStart = 0;
    let maxDrawdownDuration = 0;
    let currentDrawdownDuration = 0;
    
    equityCurve.forEach((point, idx) => {
      if (point.total > peak) {
        peak = point.total;
        drawdownStart = idx;
        if (currentDrawdownDuration > maxDrawdownDuration) {
          maxDrawdownDuration = currentDrawdownDuration;
        }
        currentDrawdownDuration = 0;
      } else {
        currentDrawdownDuration++;
        const drawdown = peak - point.total;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    });
    
    // Profit Factor
    const grossProfit = wins.reduce((s, r) => s + r, 0);
    const grossLoss = Math.abs(losses.reduce((s, r) => s + r, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    
    // Expectancy
    const expectancy = ops.length > 0 
      ? (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss 
      : 0;
    
    // Sharpe Ratio (simplified, assuming risk-free rate = 0)
    const dailyResults = Object.values(dayResults);
    const dailyMean = dailyResults.length > 0 ? dailyResults.reduce((s, v) => s + v, 0) / dailyResults.length : 0;
    const dailyVariance = dailyResults.length > 0 
      ? dailyResults.reduce((sum, r) => sum + Math.pow(r - dailyMean, 2), 0) / dailyResults.length 
      : 0;
    const dailyStdDev = Math.sqrt(dailyVariance);
    const sharpeRatio = dailyStdDev > 0 ? (dailyMean / dailyStdDev) * Math.sqrt(252) : 0;
    
    // Recovery Factor
    const recoveryFactor = maxDrawdown > 0 ? totalResult / maxDrawdown : 0;

    // Monthly performance data
    const monthlyData = Object.entries(monthResults)
      .map(([month, result]) => ({
        month: format(parseISO(month + '-01'), 'MMM/yy', { locale: ptBR }),
        monthKey: month,
        result,
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    // Yearly performance data
    const yearResults: Record<number, number> = {};
    ops.forEach(op => {
      const year = getYear(new Date(op.open_time));
      yearResults[year] = (yearResults[year] || 0) + (op.operation_result || 0);
    });
    const yearlyData = Object.entries(yearResults)
      .map(([year, result]) => ({ year, result }))
      .sort((a, b) => a.year.localeCompare(b.year));

    // Hourly distribution
    const hourlyResults: Record<number, { total: number; count: number }> = {};
    ops.forEach(op => {
      const hour = getHours(new Date(op.open_time));
      if (!hourlyResults[hour]) hourlyResults[hour] = { total: 0, count: 0 };
      hourlyResults[hour].total += op.operation_result || 0;
      hourlyResults[hour].count++;
    });
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      result: hourlyResults[hour]?.total || 0,
      count: hourlyResults[hour]?.count || 0,
      avg: hourlyResults[hour] ? hourlyResults[hour].total / hourlyResults[hour].count : 0
    })).filter(h => h.count > 0);

    // Calendar/Heatmap data
    const calendarData = Object.entries(dayResults).map(([date, result]) => ({
      date,
      result,
      dayOfWeek: format(parseISO(date), 'EEE', { locale: ptBR }),
      day: format(parseISO(date), 'dd'),
      month: format(parseISO(date), 'MMM', { locale: ptBR })
    }));

    // Best and worst days ranking
    const rankedDays = Object.entries(dayResults)
      .map(([date, result]) => ({ date, result }))
      .sort((a, b) => b.result - a.result);
    const bestDays = rankedDays.slice(0, 5);
    const worstDays = rankedDays.slice(-5).reverse();

    return {
      totalResult,
      totalOperations: ops.length,
      winRate,
      payoff,
      consistency,
      positiveDays,
      negativeDays,
      positiveMonths,
      negativeMonths,
      bestTrade,
      worstTrade,
      monthlyAvg,
      stdDev,
      volatility,
      currentStreak,
      streakType,
      equityCurve,
      maxBalance,
      minBalance,
      maxDrawdown,
      maxDrawdownDuration,
      profitFactor,
      expectancy,
      sharpeRatio,
      recoveryFactor,
      monthlyData,
      yearlyData,
      hourlyData,
      calendarData,
      bestDays,
      worstDays,
      dayResults
    };
  }, [filteredOperations]);

  if (operations.length === 0) {
    return (
      <PremiumCard className="p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sem dados para exibir</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Importe suas operações do Profit para visualizar o dashboard com estatísticas detalhadas.
          </p>
        </div>
      </PremiumCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <PremiumCard className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo período</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="ytd">Ano atual</SelectItem>
            </SelectContent>
          </Select>
          <Select value={strategyFilter} onValueChange={setStrategyFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Estratégia" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas estratégias</SelectItem>
              {strategies.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="ml-auto">
            {filteredOperations.length} operações
          </Badge>
        </div>
      </PremiumCard>

      {/* Main Stats - 4 cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className={`bg-gradient-to-br ${stats.totalResult >= 0 ? 'from-green-500/10 to-green-500/5 border-green-500/20' : 'from-red-500/10 to-red-500/5 border-red-500/20'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className={`h-4 w-4 ${stats.totalResult >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                Resultado Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${stats.totalResult >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.totalResult >= 0 ? '+' : ''}{stats.totalResult.toFixed(2)}
              </p>
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
              <p className="text-2xl font-bold text-yellow-500">{stats.winRate.toFixed(1)}%</p>
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
              <p className="text-2xl font-bold text-purple-500">{stats.payoff.toFixed(2)}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Flame className="h-4 w-4 text-blue-500" />
                Consistência
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-500">{stats.consistency.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Secondary Stats - 4 small cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PremiumCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <ChevronUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dias Positivos</p>
              <p className="text-xl font-bold text-green-500">{stats.positiveDays}</p>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <ChevronDown className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dias Negativos</p>
              <p className="text-xl font-bold text-red-500">{stats.negativeDays}</p>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CalendarDays className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Meses Positivos</p>
              <p className="text-xl font-bold text-green-500">{stats.positiveMonths}</p>
            </div>
          </div>
        </PremiumCard>

        <PremiumCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <CalendarDays className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Meses Negativos</p>
              <p className="text-xl font-bold text-red-500">{stats.negativeMonths}</p>
            </div>
          </div>
        </PremiumCard>
      </div>

      {/* Trade Stats - 6 cards */}
      <PremiumSection title="Estatísticas de Trades" subtitle="Análise detalhada das operações" icon={Activity}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <PremiumCard className="p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Melhor Trade</p>
              <p className="text-lg font-bold text-green-500">+{stats.bestTrade.toFixed(2)}</p>
            </div>
          </PremiumCard>

          <PremiumCard className="p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Pior Trade</p>
              <p className="text-lg font-bold text-red-500">{stats.worstTrade.toFixed(2)}</p>
            </div>
          </PremiumCard>

          <PremiumCard className="p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Média Mensal</p>
              <p className={`text-lg font-bold ${stats.monthlyAvg >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.monthlyAvg >= 0 ? '+' : ''}{stats.monthlyAvg.toFixed(2)}
              </p>
            </div>
          </PremiumCard>

          <PremiumCard className="p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Desvio Padrão</p>
              <p className="text-lg font-bold text-foreground">{stats.stdDev.toFixed(2)}</p>
            </div>
          </PremiumCard>

          <PremiumCard className="p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Volatilidade</p>
              <p className="text-lg font-bold text-foreground">{stats.volatility.toFixed(1)}%</p>
            </div>
          </PremiumCard>

          <PremiumCard className="p-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Sequência W/L</p>
              <p className={`text-lg font-bold ${stats.streakType === 'W' ? 'text-green-500' : stats.streakType === 'L' ? 'text-red-500' : 'text-muted-foreground'}`}>
                {stats.currentStreak}{stats.streakType || '-'}
              </p>
            </div>
          </PremiumCard>
        </div>
      </PremiumSection>

      {/* Equity Curve with Balance Stats */}
      <PremiumSection title="Curva de Performance" subtitle="Evolução do resultado ao longo do tempo" icon={TrendingUp}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <PremiumCard className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.totalResult >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <DollarSign className={`h-5 w-5 ${stats.totalResult >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Resultado Total</p>
                <p className={`text-xl font-bold ${stats.totalResult >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {stats.totalResult >= 0 ? '+' : ''}{stats.totalResult.toFixed(2)}
                </p>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ArrowUpRight className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Máximo</p>
                <p className="text-xl font-bold text-green-500">+{stats.maxBalance.toFixed(2)}</p>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <ArrowDownRight className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Mínimo</p>
                <p className="text-xl font-bold text-red-500">{stats.minBalance.toFixed(2)}</p>
              </div>
            </div>
          </PremiumCard>
        </div>

        <PremiumCard className="p-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.equityCurve}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="index" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [value.toFixed(2), 'Resultado']}
                />
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#colorEquity)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </PremiumCard>
      </PremiumSection>

      {/* Monthly & Yearly Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PremiumSection title="Performance Mensal" subtitle="Resultado por mês" icon={Calendar}>
          <PremiumCard className="p-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [value.toFixed(2), 'Resultado']}
                  />
                  <Bar dataKey="result" radius={[4, 4, 0, 0]}>
                    {stats.monthlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.result >= 0 ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PremiumCard>
        </PremiumSection>

        <PremiumSection title="Evolução Anual" subtitle="Comparativo por ano" icon={BarChart3}>
          <PremiumCard className="p-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [value.toFixed(2), 'Resultado']}
                  />
                  <Bar dataKey="result" radius={[4, 4, 0, 0]}>
                    {stats.yearlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.result >= 0 ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </PremiumCard>
        </PremiumSection>
      </div>

      {/* Hourly Distribution */}
      <PremiumSection title="Distribuição por Horário" subtitle="Performance em cada horário do dia" icon={Clock}>
        <PremiumCard className="p-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stats.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string) => [
                    value.toFixed(2), 
                    name === 'result' ? 'Resultado' : name === 'count' ? 'Operações' : 'Média'
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="result" name="Resultado" radius={[4, 4, 0, 0]}>
                  {stats.hourlyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.result >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="count" name="Operações" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </PremiumCard>
      </PremiumSection>

      {/* Advanced Metrics */}
      <PremiumSection title="Métricas Avançadas" subtitle="Indicadores de risco e performance" icon={Activity}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <PremiumCard className="p-4 cursor-help">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Sharpe Ratio</p>
                    <p className={`text-lg font-bold ${stats.sharpeRatio >= 1 ? 'text-green-500' : stats.sharpeRatio >= 0 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {stats.sharpeRatio.toFixed(2)}
                    </p>
                  </div>
                </PremiumCard>
              </TooltipTrigger>
              <TooltipContent>
                <p>Retorno ajustado ao risco. Acima de 1 é bom, acima de 2 é excelente.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <PremiumCard className="p-4 cursor-help">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Max Drawdown</p>
                    <p className="text-lg font-bold text-red-500">-{stats.maxDrawdown.toFixed(2)}</p>
                  </div>
                </PremiumCard>
              </TooltipTrigger>
              <TooltipContent>
                <p>Maior queda do pico ao vale.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <PremiumCard className="p-4 cursor-help">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Profit Factor</p>
                    <p className={`text-lg font-bold ${stats.profitFactor >= 1.5 ? 'text-green-500' : stats.profitFactor >= 1 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
                    </p>
                  </div>
                </PremiumCard>
              </TooltipTrigger>
              <TooltipContent>
                <p>Lucro bruto / Perda bruta. Acima de 1.5 é bom.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <PremiumCard className="p-4 cursor-help">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Expectancy</p>
                    <p className={`text-lg font-bold ${stats.expectancy >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {stats.expectancy >= 0 ? '+' : ''}{stats.expectancy.toFixed(2)}
                    </p>
                  </div>
                </PremiumCard>
              </TooltipTrigger>
              <TooltipContent>
                <p>Valor esperado por operação.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <PremiumCard className="p-4 cursor-help">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Recovery Factor</p>
                    <p className={`text-lg font-bold ${stats.recoveryFactor >= 2 ? 'text-green-500' : stats.recoveryFactor >= 1 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {stats.recoveryFactor.toFixed(2)}
                    </p>
                  </div>
                </PremiumCard>
              </TooltipTrigger>
              <TooltipContent>
                <p>Lucro total / Drawdown máximo. Acima de 2 é bom.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <PremiumCard className="p-4 cursor-help">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">DD Duration</p>
                    <p className="text-lg font-bold text-foreground">{stats.maxDrawdownDuration} ops</p>
                  </div>
                </PremiumCard>
              </TooltipTrigger>
              <TooltipContent>
                <p>Maior duração de drawdown em operações.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </PremiumSection>

      {/* Performance Heatmap */}
      <PremiumSection title="Calendário de Performance" subtitle="Heatmap dos resultados diários" icon={Calendar}>
        <PremiumCard className="p-6">
          <div className="grid grid-cols-7 gap-1">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="text-center text-xs text-muted-foreground font-medium py-2">
                {day}
              </div>
            ))}
            {stats.calendarData.slice(-35).map((day, idx) => {
              const intensity = Math.min(Math.abs(day.result) / 500, 1);
              const bgColor = day.result > 0 
                ? `rgba(34, 197, 94, ${0.2 + intensity * 0.6})` 
                : day.result < 0 
                  ? `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`
                  : 'rgba(100, 116, 139, 0.1)';
              return (
                <TooltipProvider key={idx}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className="aspect-square rounded flex items-center justify-center text-xs font-medium cursor-pointer hover:ring-2 hover:ring-primary/50"
                        style={{ backgroundColor: bgColor }}
                      >
                        {day.day}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{format(parseISO(day.date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                      <p className={day.result >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {day.result >= 0 ? '+' : ''}{day.result.toFixed(2)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </PremiumCard>
      </PremiumSection>

      {/* Best & Worst Days Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PremiumSection title="Melhores Dias" subtitle="Top 5 dias com maior resultado" icon={Award}>
          <PremiumCard className="p-4">
            <div className="space-y-2">
              {stats.bestDays.map((day, idx) => (
                <div key={day.date} className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-green-500">#{idx + 1}</span>
                    <span className="text-sm">{format(parseISO(day.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                  <span className="font-bold text-green-500">+{day.result.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </PremiumCard>
        </PremiumSection>

        <PremiumSection title="Piores Dias" subtitle="Top 5 dias com menor resultado" icon={AlertTriangle}>
          <PremiumCard className="p-4">
            <div className="space-y-2">
              {stats.worstDays.map((day, idx) => (
                <div key={day.date} className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-red-500">#{idx + 1}</span>
                    <span className="text-sm">{format(parseISO(day.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                  <span className="font-bold text-red-500">{day.result.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </PremiumCard>
        </PremiumSection>
      </div>
    </div>
  );
};
