import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, PieChart, Pie, Cell, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Target, Award, Calendar, Clock, Filter, Bot, Info, Trophy } from "lucide-react";
import { Tooltip as TooltipComponent, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import PerformanceHeatmap from "@/components/dashboard/PerformanceHeatmap";
import TopPerformanceDays from "@/components/dashboard/TopPerformanceDays";
import AdvancedMetrics from "@/components/dashboard/AdvancedMetrics";

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
  const [strategyFilter, setStrategyFilter] = useState<string[]>([]);
  const [availableStrategies, setAvailableStrategies] = useState<string[]>([]);
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [hourFilter, setHourFilter] = useState<string[]>([]);
  const [weekdayFilter, setWeekdayFilter] = useState<string[]>([]);
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
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
  }, [operations, dateFilter, strategyFilter, customStartDate, customEndDate, hourFilter, weekdayFilter, monthFilter]);

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
    // Resetar horas para comparar apenas datas
    now.setHours(0, 0, 0, 0);
    
    let filtered = [...operations];

    // Apply date filter
    switch (dateFilter) {
      case "today":
        filtered = filtered.filter(op => {
          const [year, month, day] = op.operation_date.split('-').map(Number);
          const opDate = new Date(year, month - 1, day);
          opDate.setHours(0, 0, 0, 0);
          return opDate.getTime() === now.getTime();
        });
        break;
      
      case "7days":
        const last7Days = new Date(now);
        last7Days.setDate(last7Days.getDate() - 7);
        filtered = filtered.filter(op => {
          const [year, month, day] = op.operation_date.split('-').map(Number);
          const opDate = new Date(year, month - 1, day);
          opDate.setHours(0, 0, 0, 0);
          return opDate >= last7Days;
        });
        break;
      
      case "30days":
        const last30Days = new Date(now);
        last30Days.setDate(last30Days.getDate() - 30);
        filtered = filtered.filter(op => {
          const [year, month, day] = op.operation_date.split('-').map(Number);
          const opDate = new Date(year, month - 1, day);
          opDate.setHours(0, 0, 0, 0);
          return opDate >= last30Days;
        });
        break;
      
      case "currentMonth":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        filtered = filtered.filter(op => {
          const [year, month, day] = op.operation_date.split('-').map(Number);
          const opDate = new Date(year, month - 1, day);
          opDate.setHours(0, 0, 0, 0);
          return opDate >= startOfMonth;
        });
        break;
      
      case "currentYear":
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        startOfYear.setHours(0, 0, 0, 0);
        filtered = filtered.filter(op => {
          const [year, month, day] = op.operation_date.split('-').map(Number);
          const opDate = new Date(year, month - 1, day);
          opDate.setHours(0, 0, 0, 0);
          return opDate >= startOfYear;
        });
        break;
      
      case "custom":
        if (customStartDate || customEndDate) {
          filtered = filtered.filter(op => {
            const [year, month, day] = op.operation_date.split('-').map(Number);
            const opDate = new Date(year, month - 1, day);
            opDate.setHours(0, 0, 0, 0);
            
            if (customStartDate && customEndDate) {
              const start = new Date(customStartDate);
              const end = new Date(customEndDate);
              start.setHours(0, 0, 0, 0);
              end.setHours(0, 0, 0, 0);
              return opDate >= start && opDate <= end;
            } else if (customStartDate) {
              const start = new Date(customStartDate);
              start.setHours(0, 0, 0, 0);
              return opDate >= start;
            } else if (customEndDate) {
              const end = new Date(customEndDate);
              end.setHours(0, 0, 0, 0);
              return opDate <= end;
            }
            return true;
          });
        }
        break;
      
      default: // "all"
        break;
    }

    // Apply strategy filter
    if (strategyFilter.length > 0) {
      filtered = filtered.filter(op => 
        op.strategy && strategyFilter.includes(op.strategy)
      );
    }

    // Apply hour filter
    if (hourFilter.length > 0) {
      filtered = filtered.filter(op => {
        const hour = parseInt(op.operation_time.split(":")[0]);
        return hourFilter.includes(hour.toString());
      });
    }

    // Apply weekday filter
    if (weekdayFilter.length > 0) {
      filtered = filtered.filter(op => {
        const [year, month, day] = op.operation_date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        return weekdayFilter.includes(dayOfWeek.toString());
      });
    }

    // Apply month filter
    if (monthFilter.length > 0) {
      filtered = filtered.filter(op => {
        const month = parseInt(op.operation_date.split('-')[1], 10) - 1;
        return monthFilter.includes(month.toString());
      });
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
      const [yearStr, monthStr] = op.operation_date.split('-');
      const monthKey = `${yearStr}-${monthStr}`;
      
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
          date: (() => { const [yy, mm, dd] = date.split('-'); return `${dd}/${mm}`; })(),
          value: accumulated,
        };
      });
    setPerformanceCurve(curve);

    // Melhores dias da semana (Segunda a Sexta apenas)
    const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex"];
    const weekdayMapping = [null, "Seg", "Ter", "Qua", "Qui", "Sex", null]; // 0=Dom, 1=Seg...6=Sáb
    
    const weekdayData = ops.reduce((acc, op) => {
      // Parse date mais confiável para evitar problemas de timezone
      const [year, month, day] = op.operation_date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      // Ignorar domingo (0) e sábado (6)
      if (dayOfWeek === 0 || dayOfWeek === 6) return acc;
      
      const dayName = weekdayMapping[dayOfWeek]!;
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
      const monthIndex = parseInt(op.operation_date.split('-')[1], 10) - 1;
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
      const year = op.operation_date.split('-')[0];
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
              variant={dateFilter === "today" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateFilter("today")}
            >
              Hoje
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
                variant={strategyFilter.length === 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setStrategyFilter([])}
              >
                Todas
              </Button>
              <Button
                variant={strategyFilter.length === availableStrategies.length && strategyFilter.length > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setStrategyFilter([...availableStrategies])}
              >
                Selecionar Todas
              </Button>
              {availableStrategies.map((strategy) => (
                <Button
                  key={strategy}
                  variant={strategyFilter.includes(strategy) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (strategyFilter.includes(strategy)) {
                      setStrategyFilter(strategyFilter.filter(s => s !== strategy));
                    } else {
                      setStrategyFilter([...strategyFilter, strategy]);
                    }
                  }}
                >
                  {strategy}
                </Button>
              ))}
              {strategyFilter.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStrategyFilter([])}
                >
                  Limpar
                </Button>
              )}
            </div>
            {strategyFilter.length > 0 && (
              <p className="text-sm text-muted-foreground mt-3">
                {strategyFilter.length} estratégia(s) selecionada(s)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filtros Compactos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros Adicionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hour Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Horários
              </label>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: "09h", value: "9" },
                  { label: "10h", value: "10" },
                  { label: "11h", value: "11" },
                  { label: "12h", value: "12" },
                  { label: "13h", value: "13" },
                  { label: "14h", value: "14" },
                  { label: "15h", value: "15" },
                  { label: "16h", value: "16" },
                  { label: "17h", value: "17" },
                ].map((hour) => (
                  <Button
                    key={hour.value}
                    variant={hourFilter.includes(hour.value) ? "default" : "outline"}
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      if (hourFilter.includes(hour.value)) {
                        setHourFilter(hourFilter.filter(h => h !== hour.value));
                      } else {
                        setHourFilter([...hourFilter, hour.value]);
                      }
                    }}
                  >
                    {hour.label}
                  </Button>
                ))}
                {hourFilter.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setHourFilter([])}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {/* Weekday Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Dias da Semana
              </label>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: "Seg", value: "1" },
                  { label: "Ter", value: "2" },
                  { label: "Qua", value: "3" },
                  { label: "Qui", value: "4" },
                  { label: "Sex", value: "5" },
                ].map((day) => (
                  <Button
                    key={day.value}
                    variant={weekdayFilter.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => {
                      if (weekdayFilter.includes(day.value)) {
                        setWeekdayFilter(weekdayFilter.filter(d => d !== day.value));
                      } else {
                        setWeekdayFilter([...weekdayFilter, day.value]);
                      }
                    }}
                  >
                    {day.label}
                  </Button>
                ))}
                {weekdayFilter.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setWeekdayFilter([])}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {/* Month Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Meses
              </label>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: "Jan", value: "0" },
                  { label: "Fev", value: "1" },
                  { label: "Mar", value: "2" },
                  { label: "Abr", value: "3" },
                  { label: "Mai", value: "4" },
                  { label: "Jun", value: "5" },
                  { label: "Jul", value: "6" },
                  { label: "Ago", value: "7" },
                  { label: "Set", value: "8" },
                  { label: "Out", value: "9" },
                  { label: "Nov", value: "10" },
                  { label: "Dez", value: "11" },
                ].map((month) => (
                  <Button
                    key={month.value}
                    variant={monthFilter.includes(month.value) ? "default" : "outline"}
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => {
                      if (monthFilter.includes(month.value)) {
                        setMonthFilter(monthFilter.filter(m => m !== month.value));
                      } else {
                        setMonthFilter([...monthFilter, month.value]);
                      }
                    }}
                  >
                    {month.label}
                  </Button>
                ))}
                {monthFilter.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setMonthFilter([])}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <defs>
                {/* Máscara da área positiva */}
                <clipPath id="clip-positive-ops">
                  <rect x="0" y="0" width="100%" height={`${(() => {
                    if (performanceCurve.length === 0) return 50;
                    const values = performanceCurve.map(d => d.value);
                    const min = Math.min(...values, 0);
                    const max = Math.max(...values, 0);
                    const range = max - min;
                    return range !== 0 ? ((max) / range) * 100 : 50;
                  })()}%`} />
                </clipPath>

                {/* Máscara da área negativa */}
                <clipPath id="clip-negative-ops">
                  <rect x="0" y={`${(() => {
                    if (performanceCurve.length === 0) return 50;
                    const values = performanceCurve.map(d => d.value);
                    const min = Math.min(...values, 0);
                    const max = Math.max(...values, 0);
                    const range = max - min;
                    return range !== 0 ? ((max) / range) * 100 : 50;
                  })()}%`} width="100%" height={`${(() => {
                    if (performanceCurve.length === 0) return 50;
                    const values = performanceCurve.map(d => d.value);
                    const min = Math.min(...values, 0);
                    const max = Math.max(...values, 0);
                    const range = max - min;
                    const zeroPos = range !== 0 ? ((max) / range) * 100 : 50;
                    return 100 - zeroPos;
                  })()}%`} />
                </clipPath>

                {/* Gradiente verde */}
                <linearGradient id="gradient-positive-ops" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B8E6BF" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#D4F1D7" stopOpacity={0.6} />
                </linearGradient>

                {/* Gradiente vermelho */}
                <linearGradient id="gradient-negative-ops" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F5B8B8" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#F5B8B8" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              
              <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip 
                formatter={(value, name, props) => {
                  // Só exibe valores válidos (não nulos e não undefined)
                  if (value === null || value === undefined) return null;

                  // Formatação de moeda brasileira
                  const formatted = (value as number).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  });

                  return [formatted, " "];
                }}
                filterNull={true}
                contentStyle={{
                  borderRadius: "10px",
                  padding: "10px",
                }}
              />
              
              {/* Linha de referência no zero */}
              <ReferenceLine 
                y={0} 
                stroke="hsl(var(--border))" 
                strokeWidth={1.5}
                strokeDasharray="3 3"
                label={{ value: 'R$ 0', position: 'insideTopLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              
              {/* Área positiva */}
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#3BA55D"
                strokeWidth={2.5} 
                fill="url(#gradient-positive-ops)" 
                clipPath="url(#clip-positive-ops)"
                isAnimationActive={false}
              />

              {/* Área negativa */}
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#E63946"
                strokeWidth={2.5} 
                fill="url(#gradient-negative-ops)" 
                clipPath="url(#clip-negative-ops)"
                isAnimationActive={false}
              />
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
              <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
              <Bar dataKey="result" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
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
              <XAxis dataKey="year" tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
              <Bar dataKey="result" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
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
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                <Bar dataKey="result" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
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
                <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                <Bar dataKey="result" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
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
              <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
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
        <>
          {/* Grid com Gráfico de Pizza e Ranking */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Pizza - Distribuição de Operações */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Distribuição de Operações por Estratégia
                </CardTitle>
                <CardDescription>
                  Percentual de operações realizadas com cada estratégia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={strategyStats}
                      dataKey="totalOps"
                      nameKey="strategy"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      label={({ strategy, totalOps, percent }) => 
                        `${strategy}: ${totalOps} (${(percent * 100).toFixed(1)}%)`
                      }
                      labelLine={true}
                    >
                      {strategyStats.map((entry, index) => {
                        const colors = [
                          'hsl(var(--primary))',
                          'hsl(var(--success))',
                          'hsl(var(--destructive))',
                          'hsl(var(--warning))',
                          'hsl(var(--info))',
                          '#8884d8',
                          '#82ca9d',
                          '#ffc658',
                          '#ff8042',
                          '#a4de6c'
                        ];
                        return (
                          <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        );
                      })}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `${value} operações`,
                        name
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Ranking de Estratégias */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Ranking de Estratégias
                </CardTitle>
                <CardDescription>Pontuação baseada em múltiplos critérios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {strategyStats
                    .map((stat) => {
                      // Cálculo de score composto (0-100)
                      const winRateScore = stat.winRate;
                      const payoffScore = Math.min(stat.payoff * 20, 100);
                      const drawdownScore = Math.max(100 - Math.abs(stat.maxDrawdown) / 100, 0);
                      const profitScore = stat.totalResult > 0 ? Math.min((stat.totalResult / 10000) * 100, 100) : 0;
                      
                      const compositeScore = (
                        winRateScore * 0.3 +
                        payoffScore * 0.25 +
                        drawdownScore * 0.25 +
                        profitScore * 0.2
                      ).toFixed(1);

                      return { 
                        strategy: stat.strategy, 
                        score: parseFloat(compositeScore), 
                        totalResult: stat.totalResult,
                        winRate: stat.winRate,
                        payoff: stat.payoff,
                      };
                    })
                    .sort((a, b) => b.score - a.score)
                    .map((item, index) => (
                      <div key={item.strategy} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">{item.strategy}</div>
                          <div className="text-xs text-muted-foreground">
                            Score: {item.score}/100 • WR: {item.winRate.toFixed(1)}% • Payoff: {item.payoff.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${item.totalResult >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {item.totalResult >= 0 ? '+' : ''}
                            {item.totalResult.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Análise de Correlação */}
          {strategyStats.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Análise de Correlação entre Estratégias
                </CardTitle>
                <CardDescription>
                  Identifica estratégias que se complementam ou funcionam bem juntas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    // Agrupar operações por data para cada estratégia
                    const strategiesByDate: Record<string, Record<string, number>> = {};
                    
                    filteredOperations.forEach((op) => {
                      const dateKey = op.operation_date;
                      if (!strategiesByDate[dateKey]) {
                        strategiesByDate[dateKey] = {};
                      }
                      const strategyName = op.strategy || "Sem Estratégia";
                      if (!strategiesByDate[dateKey][strategyName]) {
                        strategiesByDate[dateKey][strategyName] = 0;
                      }
                      strategiesByDate[dateKey][strategyName] += op.result;
                    });

                    // Calcular correlação entre pares de estratégias
                    const strategies = strategyStats.map(s => s.strategy);
                    const correlations: Array<{
                      pair: string;
                      correlation: number;
                      diversification: string;
                      recommendation: string;
                    }> = [];

                    for (let i = 0; i < strategies.length; i++) {
                      for (let j = i + 1; j < strategies.length; j++) {
                        const strat1 = strategies[i];
                        const strat2 = strategies[j];

                        let sameDayWins = 0;
                        let sameDayLosses = 0;
                        let oppositeResults = 0;
                        let totalDays = 0;

                        Object.entries(strategiesByDate).forEach(([date, strategies]) => {
                          const result1 = strategies[strat1];
                          const result2 = strategies[strat2];

                          if (result1 !== undefined && result2 !== undefined) {
                            totalDays++;
                            if (result1 > 0 && result2 > 0) {
                              sameDayWins++;
                            } else if (result1 < 0 && result2 < 0) {
                              sameDayLosses++;
                            } else {
                              oppositeResults++;
                            }
                          }
                        });

                        if (totalDays > 0) {
                          // Score de diversificação (quanto maior, mais complementares)
                          const diversificationScore = (oppositeResults / totalDays) * 100;
                          
                          let diversification = "";
                          let recommendation = "";

                          if (diversificationScore > 60) {
                            diversification = "Alta Complementaridade";
                            recommendation = "Excelente combinação para diversificação de risco";
                          } else if (diversificationScore > 40) {
                            diversification = "Moderada Complementaridade";
                            recommendation = "Boa combinação, equilibra riscos";
                          } else {
                            diversification = "Baixa Complementaridade";
                            recommendation = "Estratégias similares, considere diversificar";
                          }

                          correlations.push({
                            pair: `${strat1} + ${strat2}`,
                            correlation: diversificationScore,
                            diversification,
                            recommendation,
                          });
                        }
                      }
                    }

                    correlations.sort((a, b) => b.correlation - a.correlation);

                    return correlations.map((corr) => (
                      <div key={corr.pair} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-semibold">{corr.pair}</div>
                          <div className="text-sm px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {corr.correlation.toFixed(1)}% complementaridade
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mb-1">
                          <span className="font-medium">{corr.diversification}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {corr.recommendation}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Análise Detalhada por Estratégia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Análise Comparativa por Estratégia
              </CardTitle>
              <CardDescription>
                Métricas detalhadas de performance para cada estratégia
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
                        <div className="flex items-center gap-1 mb-1">
                          <p className="text-sm text-muted-foreground">Win Rate</p>
                          <TooltipComponent>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold mb-1">Win Rate (Taxa de Acerto)</p>
                              <p className="text-xs">
                                Percentual de operações positivas (ganhos) em relação ao total. 
                                Um Win Rate de 60% significa que 6 em cada 10 operações foram lucrativas. 
                                Valores acima de 50% indicam mais acertos que erros.
                              </p>
                            </TooltipContent>
                          </TooltipComponent>
                        </div>
                        <p className="text-lg font-semibold text-primary">{stat.winRate.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">
                          {stat.positive}W / {stat.negative}L
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <p className="text-sm text-muted-foreground">Payoff</p>
                          <TooltipComponent>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold mb-1">Payoff (Razão Risco/Retorno)</p>
                              <p className="text-xs">
                                Relação entre o ganho médio e a perda média. Um Payoff de 2.0 significa que 
                                quando você ganha, ganha o dobro do que perde em média. Valores acima de 1.0 
                                são positivos - você ganha mais do que perde. Estratégias com Payoff alto 
                                podem ser lucrativas mesmo com Win Rate abaixo de 50%.
                              </p>
                            </TooltipContent>
                          </TooltipComponent>
                        </div>
                        <p className={`text-lg font-semibold ${stat.payoff >= 1 ? 'text-success' : 'text-destructive'}`}>
                          {stat.payoff.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ganho/Perda médio
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <p className="text-sm text-muted-foreground">Max Drawdown</p>
                          <TooltipComponent>
                            <TooltipTrigger asChild>
                              <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold mb-1">Max Drawdown (Máxima Perda)</p>
                              <p className="text-xs">
                                Maior sequência de perda acumulada. Mostra o pior momento que sua conta passou. 
                                Se você tinha R$ 10.000 e caiu para R$ 8.000, seu Drawdown foi de R$ 2.000 (20%). 
                                Quanto menor o Drawdown, mais estável é sua estratégia.
                              </p>
                            </TooltipContent>
                          </TooltipComponent>
                        </div>
                        <p className="text-lg font-semibold text-destructive">
                          {stat.maxDrawdown.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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

        </>
      )}

      {/* Métricas Avançadas */}
      <AdvancedMetrics operations={filteredOperations} />

      {/* Performance Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceHeatmap operations={filteredOperations} />
        <TopPerformanceDays operations={filteredOperations} />
      </div>
    </div>
  );
};

export default OperationsDashboard;
