import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { TrendingUp, TrendingDown, Target, Award, Calendar, Clock, Filter, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface OperationsDashboardProps {
  userId: string;
}

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
  strategy: string | null;
}

interface Stats {
  totalOperations: number;
  positiveDays: number;
  negativeDays: number;
  winRate: number;
  totalResult: number;
  bestResult: number;
  worstResult: number;
  positiveStreak: number;
  negativeStreak: number;
  payoff: number;
  averageWin: number;
  averageLoss: number;
  positiveMonths: number;
  negativeMonths: number;
  monthlyConsistency: number;
  averageMonthlyResult: number;
  volatility: number;
  standardDeviation: number;
}

const OperationsDashboard = ({ userId }: OperationsDashboardProps) => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [filteredOperations, setFilteredOperations] = useState<Operation[]>([]);
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [strategyFilter, setStrategyFilter] = useState<string>("all");
  const [availableStrategies, setAvailableStrategies] = useState<string[]>([]);
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [stats, setStats] = useState<Stats>({
    totalOperations: 0,
    positiveDays: 0,
    negativeDays: 0,
    winRate: 0,
    totalResult: 0,
    bestResult: 0,
    worstResult: 0,
    positiveStreak: 0,
    negativeStreak: 0,
    payoff: 0,
    averageWin: 0,
    averageLoss: 0,
    positiveMonths: 0,
    negativeMonths: 0,
    monthlyConsistency: 0,
    averageMonthlyResult: 0,
    volatility: 0,
    standardDeviation: 0,
  });
  const [performanceCurve, setPerformanceCurve] = useState<any[]>([]);
  const [weekdayStats, setWeekdayStats] = useState<any[]>([]);
  const [monthStats, setMonthStats] = useState<any[]>([]);
  const [hourStats, setHourStats] = useState<any[]>([]);
  const [hourDistribution, setHourDistribution] = useState<any[]>([]);
  const [yearlyStats, setYearlyStats] = useState<any[]>([]);
  const [strategyStats, setStrategyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOperations();
  }, [userId]);

  useEffect(() => {
    applyDateFilter();
  }, [operations, dateFilter, strategyFilter, customStartDate, customEndDate]);

  useEffect(() => {
    if (filteredOperations.length > 0) {
      calculateStats(filteredOperations);
      generateCharts(filteredOperations);
    }
  }, [filteredOperations]);

  const loadOperations = async () => {
    try {
      // Buscar todas as operações sem limite
      let allOperations: Operation[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("trading_operations")
          .select("operation_date, operation_time, result, strategy")
          .eq("user_id", userId)
          .order("operation_date", { ascending: true })
          .range(from, from + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allOperations = [...allOperations, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      console.log(`Carregadas ${allOperations.length} operações`);
      setOperations(allOperations);
      
      // Extract unique strategies
      const strategies = Array.from(new Set(
        allOperations
          .map(op => op.strategy)
          .filter(s => s && s.trim() !== '')
      )) as string[];
      setAvailableStrategies(strategies.sort());
    } catch (error) {
      console.error("Erro ao carregar operações:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilter = () => {
    if (operations.length === 0) {
      setFilteredOperations([]);
      return;
    }

    const now = new Date();
    let filtered = [...operations];

    // Apply date filter
    switch (dateFilter) {
      case "7days":
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(op => new Date(op.operation_date) >= last7Days);
        break;
      
      case "30days":
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(op => new Date(op.operation_date) >= last30Days);
        break;
      
      case "currentMonth":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = filtered.filter(op => new Date(op.operation_date) >= startOfMonth);
        break;
      
      case "currentYear":
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        filtered = filtered.filter(op => new Date(op.operation_date) >= startOfYear);
        break;
      
      case "custom":
        if (customStartDate || customEndDate) {
          filtered = filtered.filter(op => {
            const opDate = new Date(op.operation_date);
            if (customStartDate && customEndDate) {
              return opDate >= customStartDate && opDate <= customEndDate;
            } else if (customStartDate) {
              return opDate >= customStartDate;
            } else if (customEndDate) {
              return opDate <= customEndDate;
            }
            return true;
          });
        }
        break;
      
      default: // "all"
        break;
    }

    // Apply strategy filter
    if (strategyFilter !== "all") {
      filtered = filtered.filter(op => op.strategy === strategyFilter);
    }

    setFilteredOperations(filtered);
  };

  const calculateStats = (ops: Operation[]) => {
    if (ops.length === 0) {
      setStats({
        totalOperations: 0,
        positiveDays: 0,
        negativeDays: 0,
        winRate: 0,
        totalResult: 0,
        bestResult: 0,
        worstResult: 0,
        positiveStreak: 0,
        negativeStreak: 0,
        payoff: 0,
        averageWin: 0,
        averageLoss: 0,
        positiveMonths: 0,
        negativeMonths: 0,
        monthlyConsistency: 0,
        averageMonthlyResult: 0,
        volatility: 0,
        standardDeviation: 0,
      });
      return;
    }

    // Agrupar por dia
    const dailyResults = ops.reduce((acc, op) => {
      const date = op.operation_date;
      if (!acc[date]) acc[date] = 0;
      acc[date] += parseFloat(op.result.toString());
      return acc;
    }, {} as Record<string, number>);

    const dailyResultsArray = Object.values(dailyResults);
    const positiveOps = ops.filter((op) => parseFloat(op.result.toString()) > 0);
    const negativeOps = ops.filter((op) => parseFloat(op.result.toString()) < 0);

    const totalResult = ops.reduce((sum, op) => sum + parseFloat(op.result.toString()), 0);
    const positiveDays = dailyResultsArray.filter((r) => r > 0).length;
    const negativeDays = dailyResultsArray.filter((r) => r < 0).length;
    const winRate = (positiveDays / dailyResultsArray.length) * 100;

    const averageWin = positiveOps.length > 0
      ? positiveOps.reduce((sum, op) => sum + parseFloat(op.result.toString()), 0) / positiveOps.length
      : 0;

    const averageLoss = negativeOps.length > 0
      ? Math.abs(negativeOps.reduce((sum, op) => sum + parseFloat(op.result.toString()), 0) / negativeOps.length)
      : 0;

    const payoff = averageLoss > 0 ? averageWin / averageLoss : 0;

    // Calcular consistência mensal
    const monthlyResults = ops.reduce((acc, op) => {
      const date = new Date(op.operation_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) acc[monthKey] = 0;
      acc[monthKey] += parseFloat(op.result.toString());
      return acc;
    }, {} as Record<string, number>);

    const monthlyResultsArray = Object.values(monthlyResults);
    const positiveMonths = monthlyResultsArray.filter(r => r > 0).length;
    const negativeMonths = monthlyResultsArray.filter(r => r < 0).length;
    const monthlyConsistency = monthlyResultsArray.length > 0 
      ? (positiveMonths / monthlyResultsArray.length) * 100 
      : 0;
    const averageMonthlyResult = monthlyResultsArray.length > 0
      ? monthlyResultsArray.reduce((sum, r) => sum + r, 0) / monthlyResultsArray.length
      : 0;

    // Calcular volatilidade (desvio padrão) usando dailyResultsArray já existente
    const avgDailyResult = dailyResultsArray.length > 0
      ? dailyResultsArray.reduce((sum, r) => sum + r, 0) / dailyResultsArray.length
      : 0;
    
    const variance = dailyResultsArray.length > 0
      ? dailyResultsArray.reduce((sum, r) => sum + Math.pow(r - avgDailyResult, 2), 0) / dailyResultsArray.length
      : 0;
    
    const standardDeviation = Math.sqrt(variance);
    const volatility = avgDailyResult !== 0 ? (standardDeviation / Math.abs(avgDailyResult)) * 100 : 0;

    // Calcular sequências
    let currentStreak = 0;
    let maxPositiveStreak = 0;
    let maxNegativeStreak = 0;
    let currentPositiveStreak = 0;
    let currentNegativeStreak = 0;

    Object.values(dailyResults).forEach((result) => {
      if (result > 0) {
        currentPositiveStreak++;
        currentNegativeStreak = 0;
        maxPositiveStreak = Math.max(maxPositiveStreak, currentPositiveStreak);
      } else if (result < 0) {
        currentNegativeStreak++;
        currentPositiveStreak = 0;
        maxNegativeStreak = Math.max(maxNegativeStreak, currentNegativeStreak);
      }
    });

    setStats({
      totalOperations: ops.length,
      positiveDays,
      negativeDays,
      winRate,
      totalResult,
      bestResult: Math.max(...ops.map((op) => parseFloat(op.result.toString()))),
      worstResult: Math.min(...ops.map((op) => parseFloat(op.result.toString()))),
      positiveStreak: maxPositiveStreak,
      negativeStreak: maxNegativeStreak,
      payoff,
      averageWin,
      averageLoss,
      positiveMonths,
      negativeMonths,
      monthlyConsistency,
      averageMonthlyResult,
      volatility,
      standardDeviation,
    });
  };

  const generateCharts = (ops: Operation[]) => {
    // Curva de performance (acumulado por dia)
    const dailyResults = ops.reduce((acc, op) => {
      const date = op.operation_date;
      if (!acc[date]) acc[date] = 0;
      acc[date] += parseFloat(op.result.toString());
      return acc;
    }, {} as Record<string, number>);

    let accumulated = 0;
    const curve = Object.entries(dailyResults)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, result]) => {
        accumulated += result;
        return {
          date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          value: accumulated,
        };
      });
    setPerformanceCurve(curve);

    // Melhores dias da semana (Segunda a Sexta apenas)
    const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex"];
    const weekdayMapping = [null, "Seg", "Ter", "Qua", "Qui", "Sex", null]; // 0=Dom, 1=Seg...6=Sáb
    
    const weekdayData = ops.reduce((acc, op) => {
      const day = new Date(op.operation_date).getDay();
      // Ignorar domingo (0) e sábado (6)
      if (day === 0 || day === 6) return acc;
      
      const dayName = weekdayMapping[day]!;
      if (!acc[dayName]) acc[dayName] = 0;
      acc[dayName] += parseFloat(op.result.toString());
      return acc;
    }, {} as Record<string, number>);

    setWeekdayStats(
      weekdays.map((day) => ({
        day,
        result: weekdayData[day] || 0,
      }))
    );

    // Performance mensal (agrupado por mês, somando todos os anos)
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const monthData = ops.reduce((acc, op) => {
      const date = new Date(op.operation_date);
      const monthIndex = date.getMonth();
      const monthName = monthNames[monthIndex];
      
      if (!acc[monthName]) acc[monthName] = 0;
      acc[monthName] += parseFloat(op.result.toString());
      return acc;
    }, {} as Record<string, number>);

    setMonthStats(
      monthNames.map((month) => ({
        month,
        result: monthData[month] || 0,
      }))
    );

    // Melhores horários
    const hourData = ops.reduce((acc, op) => {
      const hour = op.operation_time.split(":")[0];
      if (!acc[hour]) acc[hour] = 0;
      acc[hour] += parseFloat(op.result.toString());
      return acc;
    }, {} as Record<string, number>);

    setHourStats(
      Object.entries(hourData)
        .map(([hour, result]) => ({
          hour: `${hour}h`,
          result,
        }))
        .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
    );

    // Distribuição de horários com taxa de acerto
    const hourDistData = ops.reduce((acc, op) => {
      const hour = parseInt(op.operation_time.split(":")[0]);
      if (!acc[hour]) {
        acc[hour] = {
          total: 0,
          positive: 0,
          negative: 0,
          totalResult: 0,
        };
      }
      acc[hour].total++;
      const result = parseFloat(op.result.toString());
      if (result > 0) {
        acc[hour].positive++;
      } else if (result < 0) {
        acc[hour].negative++;
      }
      acc[hour].totalResult += result;
      return acc;
    }, {} as Record<number, { total: number; positive: number; negative: number; totalResult: number }>);

    const hourDistArray = Object.entries(hourDistData)
      .map(([hour, data]) => ({
        hour: `${hour}h`,
        operacoes: data.total,
        positivas: data.positive,
        negativas: data.negative,
        winRate: (data.positive / data.total) * 100,
        resultado: data.totalResult,
      }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

    setHourDistribution(hourDistArray);

    // Comparativo ano a ano
    const yearlyData = ops.reduce((acc, op) => {
      const year = new Date(op.operation_date).getFullYear().toString();
      if (!acc[year]) acc[year] = 0;
      acc[year] += parseFloat(op.result.toString());
      return acc;
    }, {} as Record<string, number>);

    setYearlyStats(
      Object.entries(yearlyData)
        .sort(([yearA], [yearB]) => yearA.localeCompare(yearB))
        .map(([year, result]) => ({
          year,
          result,
        }))
    );

    // Análise comparativa por estratégia
    const strategyData = ops.reduce((acc, op) => {
      const strategy = op.strategy || 'Sem Estratégia';
      if (!acc[strategy]) {
        acc[strategy] = {
          operations: [],
          totalOps: 0,
          positive: 0,
          negative: 0,
          totalResult: 0,
          wins: 0,
          losses: 0,
          totalWinAmount: 0,
          totalLossAmount: 0,
          results: [],
        };
      }
      
      acc[strategy].operations.push(op);
      acc[strategy].totalOps++;
      
      const result = parseFloat(op.result.toString());
      acc[strategy].totalResult += result;
      acc[strategy].results.push(result);
      
      if (result > 0) {
        acc[strategy].positive++;
        acc[strategy].wins++;
        acc[strategy].totalWinAmount += result;
      } else if (result < 0) {
        acc[strategy].negative++;
        acc[strategy].losses++;
        acc[strategy].totalLossAmount += Math.abs(result);
      }
      
      return acc;
    }, {} as Record<string, any>);

    const strategyStatsArray = Object.entries(strategyData).map(([strategy, data]) => {
      const winRate = (data.wins / data.totalOps) * 100;
      const averageWin = data.wins > 0 ? data.totalWinAmount / data.wins : 0;
      const averageLoss = data.losses > 0 ? data.totalLossAmount / data.losses : 0;
      const payoff = averageLoss > 0 ? averageWin / averageLoss : 0;
      
      // Calcular drawdown (maior perda acumulada)
      let accumulated = 0;
      let peak = 0;
      let maxDrawdown = 0;
      
      data.results.forEach((result: number) => {
        accumulated += result;
        if (accumulated > peak) {
          peak = accumulated;
        }
        const drawdown = peak - accumulated;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      });
      
      return {
        strategy,
        totalOps: data.totalOps,
        totalResult: data.totalResult,
        winRate,
        payoff,
        averageWin,
        averageLoss,
        maxDrawdown,
        positive: data.positive,
        negative: data.negative,
      };
    }).sort((a, b) => b.totalResult - a.totalResult);

    setStrategyStats(strategyStatsArray);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (operations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-muted-foreground">
              Nenhuma operação registrada ainda. Comece a registrar suas operações para visualizar estatísticas.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros de Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={dateFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("all")}
            >
              Todos
            </Button>
            <Button
              variant={dateFilter === "7days" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("7days")}
            >
              Últimos 7 dias
            </Button>
            <Button
              variant={dateFilter === "30days" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("30days")}
            >
              Últimos 30 dias
            </Button>
            <Button
              variant={dateFilter === "currentMonth" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("currentMonth")}
            >
              Mês Atual
            </Button>
            <Button
              variant={dateFilter === "currentYear" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("currentYear")}
            >
              Ano Atual
            </Button>
            
            <div className="flex gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={dateFilter === "custom" ? "default" : "outline"}
                    size="sm"
                    className={cn(!customStartDate && "text-muted-foreground")}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {customStartDate ? format(customStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Data Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={customStartDate}
                    onSelect={(date) => {
                      setCustomStartDate(date);
                      setDateFilter("custom");
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground">até</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={dateFilter === "custom" ? "default" : "outline"}
                    size="sm"
                    className={cn(!customEndDate && "text-muted-foreground")}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {customEndDate ? format(customEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Data Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={customEndDate}
                    onSelect={(date) => {
                      setCustomEndDate(date);
                      setDateFilter("custom");
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {(customStartDate || customEndDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCustomStartDate(undefined);
                    setCustomEndDate(undefined);
                    setDateFilter("all");
                  }}
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mt-3">
            Mostrando {filteredOperations.length} de {operations.length} operações
          </p>
        </CardContent>
      </Card>

      {/* Strategy Filter */}
      {availableStrategies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Filtro de Estratégia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={strategyFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStrategyFilter("all")}
              >
                Todas
              </Button>
              {availableStrategies.map((strategy) => (
                <Button
                  key={strategy}
                  variant={strategyFilter === strategy ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStrategyFilter(strategy)}
                >
                  {strategy}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado Acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalResult >= 0 ? "text-success" : "text-destructive"}`}>
              {stats.totalResult >= 0 ? "+" : ""}
              {stats.totalResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              Taxa de Acerto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.positiveDays} dias positivos / {stats.negativeDays} negativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4" />
              Payoff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.payoff.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ganho médio / Perda média
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consistência Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyConsistency.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.positiveMonths} meses positivos / {stats.negativeMonths} negativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sequências</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted-foreground">Positiva</span>
                </div>
                <span className="text-xl font-bold text-success">{stats.positiveStreak} dias</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-muted-foreground">Negativa</span>
                </div>
                <span className="text-xl font-bold text-destructive">{stats.negativeStreak} dias</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Curve */}
      <Card>
        <CardHeader>
          <CardTitle>Curva de Performance</CardTitle>
          <CardDescription>Evolução do resultado acumulado ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceCurve}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke="hsl(var(--success))" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Volatility Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Desvio Padrão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.standardDeviation.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Variação média dos resultados diários
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Volatilidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.volatility.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.volatility < 30 ? "Baixa" : stats.volatility < 60 ? "Moderada" : "Alta"} - Risco relativo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consistência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {stats.monthlyConsistency.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Meses positivos vs total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Mês do Ano</CardTitle>
          <CardDescription>Soma de todos os resultados de cada mês (ex: todos os janeiros somados)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
              <Bar dataKey="result" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Comparativo Ano a Ano */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Anual</CardTitle>
          <CardDescription>Comparativo de performance entre diferentes anos</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={yearlyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
              <Bar dataKey="result" fill="hsl(var(--success))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekday Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Melhores Dias da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weekdayStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                <Bar dataKey="result" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hour Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Melhores Horários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                <Bar dataKey="result" fill="hsl(var(--success))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição de Horários Mais Lucrativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Distribuição de Horários - Análise Detalhada
          </CardTitle>
          <CardDescription>
            Identifique os melhores horários para operar com base na taxa de acerto e resultado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={hourDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold mb-2">{data.hour}</p>
                        <p className="text-sm">Operações: {data.operacoes}</p>
                        <p className="text-sm text-success">Positivas: {data.positivas}</p>
                        <p className="text-sm text-destructive">Negativas: {data.negativas}</p>
                        <p className="text-sm font-semibold">Taxa de Acerto: {data.winRate.toFixed(1)}%</p>
                        <p className={`text-sm font-bold ${data.resultado >= 0 ? 'text-success' : 'text-destructive'}`}>
                          Resultado: {data.resultado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="positivas" stackId="a" fill="hsl(var(--success))" name="Operações Positivas" />
              <Bar yAxisId="left" dataKey="negativas" stackId="a" fill="hsl(var(--destructive))" name="Operações Negativas" />
              <Bar yAxisId="right" dataKey="resultado" fill="hsl(var(--primary))" name="Resultado Total (R$)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Melhor Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-success">
              +{stats.bestResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pior Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">
              {stats.worstResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Média Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${stats.averageMonthlyResult >= 0 ? "text-success" : "text-destructive"}`}>
              {stats.averageMonthlyResult >= 0 ? "+" : ""}
              {stats.averageMonthlyResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Operações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.totalOperations}</div>
          </CardContent>
        </Card>
      </div>

      {/* Análise Comparativa por Estratégia */}
      {strategyStats.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Análise Comparativa por Estratégia
            </CardTitle>
            <CardDescription>
              Métricas detalhadas de performance para cada estratégia (Win Rate, Payoff, Drawdown)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {strategyStats.map((stat) => (
                <div key={stat.strategy} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg">{stat.strategy}</h3>
                    <div className={`text-xl font-bold ${stat.totalResult >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {stat.totalResult >= 0 ? '+' : ''}
                      {stat.totalResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Operações</p>
                      <p className="text-lg font-semibold">{stat.totalOps}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                      <p className="text-lg font-semibold text-primary">{stat.winRate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {stat.positive}W / {stat.negative}L
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Payoff</p>
                      <p className={`text-lg font-semibold ${stat.payoff >= 1 ? 'text-success' : 'text-destructive'}`}>
                        {stat.payoff.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ganho/Perda médio
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Max Drawdown</p>
                      <p className="text-lg font-semibold text-destructive">
                        {stat.maxDrawdown.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Maior queda
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Ganho Médio</p>
                      <p className="text-sm font-medium text-success">
                        +{stat.averageWin.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Perda Média</p>
                      <p className="text-sm font-medium text-destructive">
                        -{stat.averageLoss.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OperationsDashboard;
