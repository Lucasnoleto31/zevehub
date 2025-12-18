import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, PieChart, Pie, Cell, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Target, Award, Calendar, Clock, Filter, Bot, Info, Trophy, ChevronDown, Zap, Activity, Percent, DollarSign, BarChart2, PieChart as PieChartIcon } from "lucide-react";
import { Tooltip as TooltipComponent, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import PerformanceHeatmap from "@/components/dashboard/PerformanceHeatmap";
import TopPerformanceDays from "@/components/dashboard/TopPerformanceDays";
import AdvancedMetrics from "@/components/dashboard/AdvancedMetrics";
import HeroStatsSection from "@/components/dashboard/HeroStatsSection";

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

const SecondaryStatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon?: any; 
  trend?: "up" | "down" | "neutral";
}) => (
  <div className={cn(
    "group relative overflow-hidden rounded-xl p-4 transition-all duration-300",
    "bg-gradient-to-br from-card/90 via-card/70 to-card/50",
    "border border-border/40 hover:border-primary/30",
    "hover:shadow-lg hover:-translate-y-0.5 backdrop-blur-sm"
  )}>
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={cn(
            "p-1.5 rounded-lg transition-all duration-300 group-hover:scale-110",
            trend === "up" && "bg-emerald-500/15 text-emerald-400",
            trend === "down" && "bg-rose-500/15 text-rose-400",
            !trend && "bg-primary/10 text-primary"
          )}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div className={cn(
        "text-lg font-bold tracking-tight",
        trend === "up" && "text-emerald-400",
        trend === "down" && "text-rose-400",
        !trend && "text-foreground"
      )}>
        {value}
      </div>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  </div>
);

const FilterChip = ({
  active, 
  onClick, 
  children,
  count,
  variant = "default"
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
  count?: number;
  variant?: "default" | "period" | "strategy" | "time";
}) => {
  const variants = {
    default: active 
      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
      : "bg-card/80 hover:bg-muted hover:border-primary/30 text-foreground",
    period: active
      ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-primary shadow-lg shadow-primary/25"
      : "bg-card/60 hover:bg-primary/10 hover:border-primary/40 text-foreground",
    strategy: active
      ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/25"
      : "bg-card/60 hover:bg-cyan-500/10 hover:border-cyan-400/40 text-foreground",
    time: active
      ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white border-violet-400 shadow-lg shadow-violet-500/25"
      : "bg-card/60 hover:bg-violet-500/10 hover:border-violet-400/40 text-foreground",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
        "border border-border/50 flex items-center gap-1.5",
        "hover:scale-105 active:scale-95",
        variants[variant]
      )}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span className={cn(
          "ml-1 px-1.5 py-0.5 text-xs rounded-full min-w-[18px] text-center",
          active ? "bg-white/20 text-inherit" : "bg-primary/10 text-primary"
        )}>
          {count}
        </span>
      )}
    </button>
  );
};

const ActiveFilterBadge = ({
  label,
  onRemove
}: {
  label: string;
  onRemove: () => void;
}) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/20 animate-in fade-in-0 zoom-in-95 duration-200">
    {label}
    <button 
      onClick={onRemove}
      className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </span>
);

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
      
      // Estratégias excluídas que não devem aparecer no filtro
      const excludedStrategies = [
        'zero a zero', 
        'zero a zero (ze)', 
        'front running', 
        'devolvida', 
        'fomo', 
        'lateralidade'
      ];
      
      const strategies = Array.from(new Set(
        allOperations
          .map(op => op.strategy)
          .filter(s => s && s.trim() !== '' && !excludedStrategies.includes(s.toLowerCase()))
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
    
    let filtered = [...operations];

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

    const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex"];
    const weekdayMapping = [null, "Seg", "Ter", "Qua", "Qui", "Sex", null];
    
    const weekdayData = ops.reduce((acc, op) => {
      const [year, month, day] = op.operation_date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
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

  const activeFiltersCount = 
    (strategyFilter.length > 0 ? 1 : 0) +
    (hourFilter.length > 0 ? 1 : 0) +
    (weekdayFilter.length > 0 ? 1 : 0) +
    (monthFilter.length > 0 ? 1 : 0) +
    (dateFilter !== "all" ? 1 : 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (operations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
          <BarChart2 className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Nenhuma operação encontrada</h3>
        <p className="text-muted-foreground max-w-md">
          Comece a registrar suas operações para visualizar estatísticas detalhadas e análises de performance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Stats Section */}
      <HeroStatsSection
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

      {/* Filters Section - Enhanced */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm overflow-hidden shadow-lg">
          {/* Header */}
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-2.5 rounded-xl transition-all duration-300",
                  activeFiltersCount > 0 
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25" 
                    : "bg-primary/10 text-primary group-hover:bg-primary/20"
                )}>
                  <Filter className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg">Filtros Avançados</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeFiltersCount > 0 
                      ? `${activeFiltersCount} filtro${activeFiltersCount > 1 ? 's' : ''} aplicado${activeFiltersCount > 1 ? 's' : ''}` 
                      : "Exibindo todos os dados"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {activeFiltersCount > 0 && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                    {filteredOperations.length.toLocaleString()} resultados
                  </Badge>
                )}
                <div className={cn(
                  "p-2 rounded-full bg-muted/50 group-hover:bg-muted transition-all duration-300",
                  filtersOpen && "bg-primary/10"
                )}>
                  <ChevronDown className={cn(
                    "w-5 h-5 text-muted-foreground transition-transform duration-300",
                    filtersOpen && "rotate-180 text-primary"
                  )} />
                </div>
              </div>
            </button>
          </CollapsibleTrigger>

          {/* Active Filters Summary */}
          {activeFiltersCount > 0 && !filtersOpen && (
            <div className="px-5 pb-4 flex flex-wrap gap-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
              {dateFilter !== "all" && (
                <ActiveFilterBadge 
                  label={dateFilter === "today" ? "Hoje" : 
                         dateFilter === "7days" ? "7 dias" :
                         dateFilter === "30days" ? "30 dias" :
                         dateFilter === "currentMonth" ? "Este mês" :
                         dateFilter === "currentYear" ? "Este ano" :
                         dateFilter === "custom" ? "Período personalizado" : dateFilter}
                  onRemove={() => {
                    setDateFilter("all");
                    setCustomStartDate(undefined);
                    setCustomEndDate(undefined);
                  }}
                />
              )}
              {strategyFilter.map(s => (
                <ActiveFilterBadge 
                  key={s}
                  label={s}
                  onRemove={() => setStrategyFilter(strategyFilter.filter(x => x !== s))}
                />
              ))}
              {hourFilter.map(h => (
                <ActiveFilterBadge 
                  key={h}
                  label={`${h}h`}
                  onRemove={() => setHourFilter(hourFilter.filter(x => x !== h))}
                />
              ))}
              {weekdayFilter.map(d => (
                <ActiveFilterBadge 
                  key={d}
                  label={["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][parseInt(d)]}
                  onRemove={() => setWeekdayFilter(weekdayFilter.filter(x => x !== d))}
                />
              ))}
              {monthFilter.map(m => (
                <ActiveFilterBadge 
                  key={m}
                  label={["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][parseInt(m)]}
                  onRemove={() => setMonthFilter(monthFilter.filter(x => x !== m))}
                />
              ))}
              <button
                onClick={() => {
                  setDateFilter("all");
                  setCustomStartDate(undefined);
                  setCustomEndDate(undefined);
                  setStrategyFilter([]);
                  setHourFilter([]);
                  setWeekdayFilter([]);
                  setMonthFilter([]);
                }}
                className="text-xs text-destructive hover:text-destructive/80 font-medium px-2 py-1 rounded-full hover:bg-destructive/10 transition-colors"
              >
                Limpar todos
              </button>
            </div>
          )}
          
          <CollapsibleContent>
            <div className="px-5 pb-6 space-y-6 border-t border-border/30 pt-5">
              {/* Clear All Button */}
              {activeFiltersCount > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateFilter("all");
                      setCustomStartDate(undefined);
                      setCustomEndDate(undefined);
                      setStrategyFilter([]);
                      setHourFilter([]);
                      setWeekdayFilter([]);
                      setMonthFilter([]);
                    }}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Limpar todos os filtros
                  </Button>
                </div>
              )}

              {/* Period Filter */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <Calendar className="w-4 h-4" />
                    </div>
                    Período
                  </label>
                  {dateFilter !== "all" && (
                    <button 
                      onClick={() => {
                        setDateFilter("all");
                        setCustomStartDate(undefined);
                        setCustomEndDate(undefined);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Todos", value: "all" },
                    { label: "Hoje", value: "today" },
                    { label: "7 dias", value: "7days" },
                    { label: "30 dias", value: "30days" },
                    { label: "Este mês", value: "currentMonth" },
                    { label: "Este ano", value: "currentYear" },
                  ].map((option) => (
                    <FilterChip
                      key={option.value}
                      active={dateFilter === option.value}
                      onClick={() => setDateFilter(option.value)}
                      variant="period"
                    >
                      {option.label}
                    </FilterChip>
                  ))}
                </div>
                
                {/* Custom Date Range */}
                <div className="flex flex-wrap gap-3 items-center p-3 rounded-xl bg-muted/30 border border-border/30">
                  <span className="text-xs font-medium text-muted-foreground">Personalizado:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "rounded-full h-8 text-xs",
                          dateFilter === "custom" && customStartDate && "border-primary bg-primary/10 text-primary"
                        )}
                      >
                        <Calendar className="mr-1.5 h-3.5 w-3.5" />
                        {customStartDate ? format(customStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Data início"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customStartDate}
                        onSelect={(date) => {
                          setCustomStartDate(date);
                          setDateFilter("custom");
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <span className="text-muted-foreground text-xs">→</span>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "rounded-full h-8 text-xs",
                          dateFilter === "custom" && customEndDate && "border-primary bg-primary/10 text-primary"
                        )}
                      >
                        <Calendar className="mr-1.5 h-3.5 w-3.5" />
                        {customEndDate ? format(customEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Data fim"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customEndDate}
                        onSelect={(date) => {
                          setCustomEndDate(date);
                          setDateFilter("custom");
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  {(customStartDate || customEndDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full h-8 text-xs hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        setCustomStartDate(undefined);
                        setCustomEndDate(undefined);
                        setDateFilter("all");
                      }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  )}
                </div>
              </div>

              {/* Strategy Filter */}
              {availableStrategies.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500">
                        <Bot className="w-4 h-4" />
                      </div>
                      Estratégias
                      {strategyFilter.length > 0 && (
                        <Badge variant="secondary" className="ml-2 bg-cyan-500/10 text-cyan-500 border-cyan-500/20">
                          {strategyFilter.length} selecionada{strategyFilter.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </label>
                    {strategyFilter.length > 0 && (
                      <button 
                        onClick={() => setStrategyFilter([])}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip
                      active={strategyFilter.length === 0}
                      onClick={() => setStrategyFilter([])}
                      variant="strategy"
                    >
                      Todas
                    </FilterChip>
                    {availableStrategies.map((strategy) => (
                      <FilterChip
                        key={strategy}
                        active={strategyFilter.includes(strategy)}
                        onClick={() => {
                          if (strategyFilter.includes(strategy)) {
                            setStrategyFilter(strategyFilter.filter(s => s !== strategy));
                          } else {
                            setStrategyFilter([...strategyFilter, strategy]);
                          }
                        }}
                        variant="strategy"
                      >
                        {strategy}
                      </FilterChip>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Filters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Hour Filter */}
                <div className="space-y-3 p-4 rounded-xl bg-violet-500/5 border border-violet-500/10">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500">
                        <Clock className="w-4 h-4" />
                      </div>
                      Horários
                    </label>
                    {hourFilter.length > 0 && (
                      <button 
                        onClick={() => setHourFilter([])}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {["9", "10", "11", "12", "13", "14", "15", "16", "17"].map((hour) => (
                      <FilterChip
                        key={hour}
                        active={hourFilter.includes(hour)}
                        onClick={() => {
                          if (hourFilter.includes(hour)) {
                            setHourFilter(hourFilter.filter(h => h !== hour));
                          } else {
                            setHourFilter([...hourFilter, hour]);
                          }
                        }}
                        variant="time"
                      >
                        {hour}h
                      </FilterChip>
                    ))}
                  </div>
                </div>

                {/* Weekday Filter */}
                <div className="space-y-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <Calendar className="w-4 h-4" />
                      </div>
                      Dias da Semana
                    </label>
                    {weekdayFilter.length > 0 && (
                      <button 
                        onClick={() => setWeekdayFilter([])}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "Seg", value: "1" },
                      { label: "Ter", value: "2" },
                      { label: "Qua", value: "3" },
                      { label: "Qui", value: "4" },
                      { label: "Sex", value: "5" },
                    ].map((day) => (
                      <button
                        key={day.value}
                        onClick={() => {
                          if (weekdayFilter.includes(day.value)) {
                            setWeekdayFilter(weekdayFilter.filter(d => d !== day.value));
                          } else {
                            setWeekdayFilter([...weekdayFilter, day.value]);
                          }
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
                          "border border-border/50 hover:scale-105 active:scale-95",
                          weekdayFilter.includes(day.value)
                            ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/25"
                            : "bg-card/60 hover:bg-emerald-500/10 hover:border-emerald-400/40 text-foreground"
                        )}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Month Filter */}
                <div className="space-y-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                        <Calendar className="w-4 h-4" />
                      </div>
                      Meses
                    </label>
                    {monthFilter.length > 0 && (
                      <button 
                        onClick={() => setMonthFilter([])}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
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
                      <button
                        key={month.value}
                        onClick={() => {
                          if (monthFilter.includes(month.value)) {
                            setMonthFilter(monthFilter.filter(m => m !== month.value));
                          } else {
                            setMonthFilter([...monthFilter, month.value]);
                          }
                        }}
                        className={cn(
                          "px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-300",
                          "border border-border/50 hover:scale-105 active:scale-95",
                          monthFilter.includes(month.value)
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400 shadow-lg shadow-amber-500/25"
                            : "bg-card/60 hover:bg-amber-500/10 hover:border-amber-400/40 text-foreground"
                        )}
                      >
                        {month.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <SecondaryStatCard
          title="Melhor Trade"
          value={`+${stats.bestResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
          icon={TrendingUp}
          trend="up"
        />
        <SecondaryStatCard
          title="Pior Trade"
          value={stats.worstResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          icon={TrendingDown}
          trend="down"
        />
        <SecondaryStatCard
          title="Média Mensal"
          value={stats.averageMonthlyResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          icon={BarChart2}
          trend={stats.averageMonthlyResult >= 0 ? "up" : "down"}
        />
        <SecondaryStatCard
          title="Desvio Padrão"
          value={stats.standardDeviation.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          subtitle="Variação diária"
          icon={Activity}
        />
        <SecondaryStatCard
          title="Volatilidade"
          value={`${stats.volatility.toFixed(1)}%`}
          subtitle={stats.volatility < 30 ? "Baixa" : stats.volatility < 60 ? "Moderada" : "Alta"}
          icon={Percent}
        />
        <SecondaryStatCard
          title="Sequência"
          value={`${stats.positiveStreak}W / ${stats.negativeStreak}L`}
          subtitle="Máximas registradas"
          icon={Trophy}
        />
      </div>

      {/* Performance Curve */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Curva de Performance
          </CardTitle>
          <CardDescription>Evolução do resultado acumulado ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={performanceCurve}>
              <defs>
                <linearGradient id="gradient-positive-modern" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradient-negative-modern" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              
              <XAxis 
                dataKey="date" 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                axisLine={false} 
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number) => [
                  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                  "Acumulado"
                ]}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--card))",
                  boxShadow: "0 10px 40px -10px rgba(0,0,0,0.2)",
                }}
              />
              
              <ReferenceLine 
                y={0} 
                stroke="hsl(var(--border))" 
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))"
                strokeWidth={2.5} 
                fill="url(#gradient-positive-modern)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              Performance Mensal
            </CardTitle>
            <CardDescription>Resultado por mês do ano</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthStats}>
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
                />
                <Bar 
                  dataKey="result" 
                  fill="hsl(var(--primary))" 
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Yearly Performance */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Evolução Anual
            </CardTitle>
            <CardDescription>Comparativo entre anos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={yearlyStats}>
                <XAxis dataKey="year" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
                />
                <Bar 
                  dataKey="result" 
                  fill="hsl(var(--success))" 
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekday Performance */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Melhores Dias da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weekdayStats}>
                <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
                />
                <Bar 
                  dataKey="result" 
                  fill="hsl(var(--primary))" 
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hour Performance */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500" />
              Melhores Horários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hourStats}>
                <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
                />
                <Bar 
                  dataKey="result" 
                  fill="hsl(var(--success))" 
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Hour Distribution Detail */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Distribuição de Horários - Análise Detalhada
          </CardTitle>
          <CardDescription>
            Identifique os melhores horários para operar com base na taxa de acerto e resultado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={hourDistribution}>
              <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-xl p-4 shadow-xl">
                        <p className="font-semibold text-lg mb-3">{data.hour}</p>
                        <div className="space-y-2 text-sm">
                          <p className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Operações:</span>
                            <span className="font-medium">{data.operacoes}</span>
                          </p>
                          <p className="flex justify-between gap-4">
                            <span className="text-emerald-500">Positivas:</span>
                            <span className="font-medium">{data.positivas}</span>
                          </p>
                          <p className="flex justify-between gap-4">
                            <span className="text-rose-500">Negativas:</span>
                            <span className="font-medium">{data.negativas}</span>
                          </p>
                          <p className="flex justify-between gap-4 pt-2 border-t">
                            <span className="text-muted-foreground">Win Rate:</span>
                            <span className="font-semibold">{data.winRate.toFixed(1)}%</span>
                          </p>
                          <p className={cn(
                            "flex justify-between gap-4 font-bold",
                            data.resultado >= 0 ? 'text-emerald-500' : 'text-rose-500'
                          )}>
                            <span>Resultado:</span>
                            <span>{data.resultado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="positivas" stackId="a" fill="hsl(var(--success))" name="Positivas" radius={[0, 0, 0, 0]} />
              <Bar yAxisId="left" dataKey="negativas" stackId="a" fill="hsl(var(--destructive))" name="Negativas" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="resultado" fill="hsl(var(--primary))" name="Resultado (R$)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Strategy Analysis */}
      {strategyStats.length > 1 && (
        <>
          {/* Strategy Comparison Chart */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Comparativo de Estratégias
              </CardTitle>
              <CardDescription>
                Performance por estratégia ordenada por resultado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={strategyStats} layout="vertical">
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="strategy" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip 
                    formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))" }}
                  />
                  <Bar dataKey="totalResult" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Strategy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategyStats.slice(0, 6).map((stat, index) => (
              <div 
                key={stat.strategy}
                className={cn(
                  "group relative overflow-hidden rounded-2xl p-5 transition-all duration-500",
                  "bg-gradient-to-br from-card via-card to-card/80",
                  "border border-border/50 hover:border-primary/30",
                  "hover:shadow-xl hover:shadow-primary/5",
                  index === 0 && "md:col-span-2 lg:col-span-1"
                )}
              >
                <div className="absolute top-0 right-0 p-3">
                  <Badge variant={stat.totalResult >= 0 ? "default" : "destructive"} className="font-mono">
                    #{index + 1}
                  </Badge>
                </div>
                
                <h3 className="font-semibold text-lg mb-4 pr-12">{stat.strategy}</h3>
                
                <div className={cn(
                  "text-2xl font-bold mb-4",
                  stat.totalResult >= 0 ? "text-emerald-500" : "text-rose-500"
                )}>
                  {stat.totalResult >= 0 ? '+' : ''}
                  {stat.totalResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Win Rate</p>
                    <p className="font-semibold text-primary">{stat.winRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Payoff</p>
                    <p className={cn("font-semibold", stat.payoff >= 1 ? "text-emerald-500" : "text-rose-500")}>
                      {stat.payoff.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Operações</p>
                    <p className="font-semibold">{stat.totalOps}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">W/L</p>
                    <p className="font-semibold">
                      <span className="text-emerald-500">{stat.positive}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-rose-500">{stat.negative}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Strategy Correlation */}
          {strategyStats.length >= 2 && (
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Análise de Correlação entre Estratégias
                </CardTitle>
                <CardDescription>
                  Identifica estratégias que se complementam
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
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

                        let oppositeResults = 0;
                        let totalDays = 0;

                        Object.entries(strategiesByDate).forEach(([date, strategies]) => {
                          const result1 = strategies[strat1];
                          const result2 = strategies[strat2];

                          if (result1 !== undefined && result2 !== undefined) {
                            totalDays++;
                            if ((result1 > 0 && result2 < 0) || (result1 < 0 && result2 > 0)) {
                              oppositeResults++;
                            }
                          }
                        });

                        if (totalDays > 0) {
                          const diversificationScore = (oppositeResults / totalDays) * 100;
                          
                          let diversification = "";
                          let recommendation = "";

                          if (diversificationScore > 60) {
                            diversification = "Alta Complementaridade";
                            recommendation = "Excelente combinação para diversificação";
                          } else if (diversificationScore > 40) {
                            diversification = "Moderada Complementaridade";
                            recommendation = "Boa combinação, equilibra riscos";
                          } else {
                            diversification = "Baixa Complementaridade";
                            recommendation = "Estratégias similares";
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

                    return correlations.slice(0, 4).map((corr) => (
                      <div key={corr.pair} className="p-4 rounded-xl border bg-muted/30">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-semibold text-sm">{corr.pair}</div>
                          <Badge variant="secondary" className="text-xs">
                            {corr.correlation.toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="text-xs text-primary font-medium mb-1">
                          {corr.diversification}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {corr.recommendation}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Advanced Metrics */}
      <AdvancedMetrics operations={filteredOperations} />

      {/* Performance Heatmap & Top Days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceHeatmap operations={filteredOperations} />
        <TopPerformanceDays operations={filteredOperations} />
      </div>
    </div>
  );
};

export default OperationsDashboard;
