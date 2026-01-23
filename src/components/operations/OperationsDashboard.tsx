import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { BarChart2 } from "lucide-react";

import RobosHero from "./RobosHero";
import RobosFilters from "./RobosFilters";
import RobosQuickStats from "./RobosQuickStats";
import RobosCharts from "./RobosCharts";
import RobosStrategyCards from "./RobosStrategyCards";
import StrategyOptimizer from "./StrategyOptimizer";
import PerformanceHeatmap from "@/components/dashboard/PerformanceHeatmap";
import TopPerformanceDays from "@/components/dashboard/TopPerformanceDays";
import AdvancedMetrics from "@/components/dashboard/AdvancedMetrics";
import PerformanceCalendar from "@/components/dashboard/PerformanceCalendar";
import AIInsightsCard from "@/components/dashboard/AIInsightsCard";

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
  const [filtersOpen, setFiltersOpen] = useState(true);
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
  const [monthStats, setMonthStats] = useState<any[]>([]);
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

      setOperations(allOperations);
      
      // Estratégias permitidas no dashboard de Robôs (whitelist)
      const allowedStrategies = [
        'alaska & square',
        'apollo',
        'ares',
        'artemis',
        'orion',
        'pegasus',
        'ventture',
        'zeus'
      ];
      
      const strategies = Array.from(new Set(
        allOperations
          .map(op => op.strategy)
          .filter(s => s && s.trim() !== '' && allowedStrategies.includes(s.toLowerCase()))
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
    now.setHours(0, 0, 0, 0);
    
    // Estratégias permitidas no dashboard de Robôs (whitelist)
    const allowedStrategies = [
      'alaska & square',
      'apollo',
      'ares',
      'artemis',
      'orion',
      'pegasus',
      'ventture',
      'zeus'
    ];
    
    // Filtra apenas operações com estratégias permitidas
    let filtered = operations.filter(op => 
      op.strategy && allowedStrategies.includes(op.strategy.toLowerCase())
    );

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
      
      default:
        break;
    }

    if (strategyFilter.length > 0) {
      filtered = filtered.filter(op => 
        op.strategy && strategyFilter.includes(op.strategy)
      );
    }

    if (hourFilter.length > 0) {
      filtered = filtered.filter(op => {
        const hour = parseInt(op.operation_time.split(":")[0]);
        return hourFilter.includes(hour.toString());
      });
    }

    if (weekdayFilter.length > 0) {
      filtered = filtered.filter(op => {
        const [year, month, day] = op.operation_date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        return weekdayFilter.includes(dayOfWeek.toString());
      });
    }

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

    const avgDailyResult = dailyResultsArray.length > 0
      ? dailyResultsArray.reduce((sum, r) => sum + r, 0) / dailyResultsArray.length
      : 0;
    
    const variance = dailyResultsArray.length > 0
      ? dailyResultsArray.reduce((sum, r) => sum + Math.pow(r - avgDailyResult, 2), 0) / dailyResultsArray.length
      : 0;
    
    const standardDeviation = Math.sqrt(variance);
    const volatility = avgDailyResult !== 0 ? (standardDeviation / Math.abs(avgDailyResult)) * 100 : 0;

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
    // Performance Curve
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

    // Month Stats
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

    // Hour Distribution
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

    // Yearly Stats
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

    // Strategy Stats
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
      <div className="flex items-center justify-center py-24">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (operations.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24 text-center"
      >
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-6 shadow-xl">
          <BarChart2 className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Nenhuma operação encontrada</h3>
        <p className="text-muted-foreground max-w-md">
          Comece a registrar suas operações para visualizar estatísticas detalhadas e análises de performance.
        </p>
      </motion.div>
    );
  }

  const handleApplyOptimizedConfig = (config: {
    strategy: string;
    hours: string[];
    weekdays: string[];
    months: string[];
  }) => {
    setStrategyFilter([config.strategy]);
    if (config.hours.length > 0) {
      setHourFilter(config.hours);
    }
    if (config.weekdays.length > 0) {
      setWeekdayFilter(config.weekdays);
    }
    if (config.months.length > 0) {
      setMonthFilter(config.months);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <RobosHero
        totalOperations={filteredOperations.length}
        totalDays={stats.positiveDays + stats.negativeDays}
        totalResult={stats.totalResult}
        winRate={stats.winRate}
        positiveDays={stats.positiveDays}
        negativeDays={stats.negativeDays}
        payoff={stats.payoff}
        monthlyConsistency={stats.monthlyConsistency}
        positiveMonths={stats.positiveMonths}
        negativeMonths={stats.negativeMonths}
      />

      {/* Strategy Optimizer - Melhor Configuração por Robô */}
      <StrategyOptimizer
        operations={operations}
        strategies={availableStrategies}
        onApplyConfig={handleApplyOptimizedConfig}
        onOpenFilters={() => setFiltersOpen(true)}
      />

      {/* Filters */}
      <RobosFilters
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        strategyFilter={strategyFilter}
        setStrategyFilter={setStrategyFilter}
        availableStrategies={availableStrategies}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        hourFilter={hourFilter}
        setHourFilter={setHourFilter}
        weekdayFilter={weekdayFilter}
        setWeekdayFilter={setWeekdayFilter}
        monthFilter={monthFilter}
        setMonthFilter={setMonthFilter}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
        filteredCount={filteredOperations.length}
      />

      {/* Quick Stats */}
      <RobosQuickStats stats={stats} />

      {/* Charts */}
      <RobosCharts
        performanceCurve={performanceCurve}
        monthStats={monthStats}
        yearlyStats={yearlyStats}
        hourDistribution={hourDistribution}
      />


      {/* Advanced Metrics */}
      <AdvancedMetrics operations={filteredOperations} />

      {/* Performance Calendar */}
      <PerformanceCalendar operations={filteredOperations.map(op => ({
        id: `${op.operation_date}-${op.operation_time}`,
        operation_date: op.operation_date,
        result: op.result,
        strategy: op.strategy || undefined,
      }))} />

      {/* AI Insights */}
      <AIInsightsCard operations={filteredOperations} />

      {/* Heatmap & Top Days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceHeatmap operations={filteredOperations} />
        <TopPerformanceDays operations={filteredOperations} />
      </div>
    </div>
  );
};

export default OperationsDashboard;
