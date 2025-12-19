import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { format, parseISO, getHours, getYear } from "date-fns";
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
  BarChart3,
  ChevronUp,
  ChevronDown,
  Flame,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CalendarDays,
  BarChart2,
  Trophy,
  Sparkles,
  LineChart as LineChartIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCountUp } from "@/hooks/useCountUp";
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

// Animated Value Component
const AnimatedValue = ({ value, prefix = "", suffix = "", decimals = 0 }: { 
  value: number; 
  prefix?: string; 
  suffix?: string;
  decimals?: number;
}) => {
  const { ref, rawValue } = useCountUp({ end: value, duration: 1500, decimals });
  return (
    <span ref={ref}>
      {prefix}{rawValue.toFixed(decimals)}{suffix}
    </span>
  );
};

// Premium Metric Card Component
const MetricCard = ({ 
  label, 
  value, 
  icon: Icon,
  trend,
  color,
  delay = 0
}: { 
  label: string; 
  value: React.ReactNode;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  color: "emerald" | "rose" | "violet" | "amber" | "cyan" | "primary";
  delay?: number;
}) => {
  const colorClasses = {
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400",
    rose: "from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-400",
    violet: "from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400",
    amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400",
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400",
    primary: "from-primary/20 to-primary/5 border-primary/30 text-primary",
  };

  const iconBgClasses = {
    emerald: "bg-emerald-500/15 text-emerald-400 shadow-emerald-500/20",
    rose: "bg-rose-500/15 text-rose-400 shadow-rose-500/20",
    violet: "bg-violet-500/15 text-violet-400 shadow-violet-500/20",
    amber: "bg-amber-500/15 text-amber-400 shadow-amber-500/20",
    cyan: "bg-cyan-500/15 text-cyan-400 shadow-cyan-500/20",
    primary: "bg-primary/15 text-primary shadow-primary/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative group overflow-hidden rounded-2xl p-4 md:p-5",
        "bg-gradient-to-br backdrop-blur-xl",
        "border transition-all duration-500",
        "hover:scale-[1.02] hover:shadow-2xl",
        colorClasses[color]
      )}
    >
      {/* Glow effect */}
      <div className={cn(
        "absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl",
        color === "emerald" && "bg-emerald-500/20",
        color === "rose" && "bg-rose-500/20",
        color === "violet" && "bg-violet-500/20",
        color === "amber" && "bg-amber-500/20",
        color === "cyan" && "bg-cyan-500/20",
        color === "primary" && "bg-primary/20"
      )} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <div className={cn(
            "p-2 rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
            iconBgClasses[color]
          )}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        
        <div className="text-2xl md:text-3xl font-black tracking-tight">
          {value}
        </div>
        
        {trend && (
          <div className={cn(
            "flex items-center gap-1 mt-2 text-xs font-medium",
            trend === "up" && "text-emerald-400",
            trend === "down" && "text-rose-400"
          )}>
            {trend === "up" ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            <span>{trend === "up" ? "Positivo" : "Negativo"}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Premium Stat Card Component
const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  index,
  accentColor = "primary"
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: React.ElementType; 
  trend?: "up" | "down" | "neutral";
  index: number;
  accentColor?: "primary" | "emerald" | "rose" | "amber" | "cyan" | "violet";
}) => {
  const colorClasses = {
    primary: {
      bg: "from-primary/10 to-primary/5",
      border: "border-primary/20 hover:border-primary/40",
      icon: "bg-primary/15 text-primary",
      glow: "from-primary/10 via-primary/5",
      ring: "ring-primary/20"
    },
    emerald: {
      bg: "from-emerald-500/10 to-emerald-500/5",
      border: "border-emerald-500/20 hover:border-emerald-500/40",
      icon: "bg-emerald-500/15 text-emerald-400",
      glow: "from-emerald-500/10 via-emerald-500/5",
      ring: "ring-emerald-500/20"
    },
    rose: {
      bg: "from-rose-500/10 to-rose-500/5",
      border: "border-rose-500/20 hover:border-rose-500/40",
      icon: "bg-rose-500/15 text-rose-400",
      glow: "from-rose-500/10 via-rose-500/5",
      ring: "ring-rose-500/20"
    },
    amber: {
      bg: "from-amber-500/10 to-amber-500/5",
      border: "border-amber-500/20 hover:border-amber-500/40",
      icon: "bg-amber-500/15 text-amber-400",
      glow: "from-amber-500/10 via-amber-500/5",
      ring: "ring-amber-500/20"
    },
    cyan: {
      bg: "from-cyan-500/10 to-cyan-500/5",
      border: "border-cyan-500/20 hover:border-cyan-500/40",
      icon: "bg-cyan-500/15 text-cyan-400",
      glow: "from-cyan-500/10 via-cyan-500/5",
      ring: "ring-cyan-500/20"
    },
    violet: {
      bg: "from-violet-500/10 to-violet-500/5",
      border: "border-violet-500/20 hover:border-violet-500/40",
      icon: "bg-violet-500/15 text-violet-400",
      glow: "from-violet-500/10 via-violet-500/5",
      ring: "ring-violet-500/20"
    }
  };

  const colors = colorClasses[accentColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5 transition-all duration-500",
        "bg-gradient-to-br from-card via-card/95 to-accent/10",
        "border-2 backdrop-blur-xl",
        colors.border,
        "hover:shadow-2xl hover:shadow-black/20"
      )}
    >
      {/* Animated gradient background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        colors.glow,
        "to-transparent"
      )} />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      {/* Corner accent */}
      <div className={cn(
        "absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity",
        trend === "up" && "bg-emerald-500",
        trend === "down" && "bg-rose-500",
        !trend && "bg-primary"
      )} />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            {title}
          </span>
          <motion.div 
            className={cn(
              "p-2.5 rounded-xl transition-all duration-300",
              colors.icon,
              "ring-2 ring-offset-2 ring-offset-card",
              colors.ring
            )}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Icon className="w-4 h-4" />
          </motion.div>
        </div>
        
        <motion.div 
          className={cn(
            "text-lg sm:text-xl lg:text-2xl font-black tracking-tight leading-none truncate",
            trend === "up" && "text-emerald-400",
            trend === "down" && "text-rose-400",
            !trend && "text-foreground"
          )}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.06 + 0.2, type: "spring", stiffness: 200 }}
          title={String(value)}
        >
          {value}
        </motion.div>
        
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-2 font-medium">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
};

// Premium Section Component
const PremiumSection = ({
  children,
  title,
  subtitle,
  icon: Icon,
  delay = 0
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  delay?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2.5 rounded-xl bg-primary/10 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  );
};

// Premium Chart Card Component
const ChartCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-6",
        "bg-gradient-to-br from-card via-card/95 to-accent/5",
        "border-2 border-border/50 backdrop-blur-xl",
        "hover:border-primary/30 transition-all duration-500",
        className
      )}
    >
      <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

export const TradingDashboard = ({ operations, strategies }: TradingDashboardProps) => {
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [strategyFilter, setStrategyFilter] = useState<string>("all");
  const [rankingTab, setRankingTab] = useState<'best' | 'worst'>('best');

  // Filter operations
  const filteredOperations = useMemo(() => {
    let filtered = [...operations];

    if (strategyFilter !== "all") {
      filtered = filtered.filter(op => op.strategy_id === strategyFilter);
    }

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
    
    const totalResult = results.reduce((sum, r) => sum + r, 0);
    const wins = results.filter(r => r > 0);
    const losses = results.filter(r => r < 0);
    const winRate = ops.length > 0 ? (wins.length / ops.length * 100) : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, r) => s + r, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, r) => s + r, 0) / losses.length) : 0;
    const payoff = avgLoss > 0 ? avgWin / avgLoss : 0;
    
    const dayResults: Record<string, { result: number; count: number }> = {};
    ops.forEach(op => {
      const day = format(new Date(op.open_time), 'yyyy-MM-dd');
      if (!dayResults[day]) dayResults[day] = { result: 0, count: 0 };
      dayResults[day].result += (op.operation_result || 0);
      dayResults[day].count++;
    });
    const dayValues = Object.values(dayResults).map(d => d.result);
    const positiveDays = dayValues.filter(v => v > 0).length;
    const negativeDays = dayValues.filter(v => v < 0).length;
    
    // Heatmap data: weekday x hour
    const weekdayHourData: Record<string, { result: number; count: number; winCount: number; lossCount: number }> = {};
    ops.forEach(op => {
      const date = new Date(op.open_time);
      const weekday = date.getDay(); // 0=Sun, 1=Mon, etc
      const hour = getHours(date);
      const key = `${weekday}-${hour}`;
      if (!weekdayHourData[key]) weekdayHourData[key] = { result: 0, count: 0, winCount: 0, lossCount: 0 };
      const opResult = op.operation_result || 0;
      weekdayHourData[key].result += opResult;
      weekdayHourData[key].count++;
      if (opResult >= 0) {
        weekdayHourData[key].winCount++;
      } else {
        weekdayHourData[key].lossCount++;
      }
    });
    
    const monthResults: Record<string, number> = {};
    ops.forEach(op => {
      const month = format(new Date(op.open_time), 'yyyy-MM');
      monthResults[month] = (monthResults[month] || 0) + (op.operation_result || 0);
    });
    const monthValues = Object.values(monthResults);
    const positiveMonths = monthValues.filter(v => v > 0).length;
    const negativeMonths = monthValues.filter(v => v < 0).length;
    
    const consistency = dayValues.length > 0 ? (positiveDays / dayValues.length * 100) : 0;
    
    const bestTrade = results.length > 0 ? Math.max(...results) : 0;
    const worstTrade = results.length > 0 ? Math.min(...results) : 0;
    
    const monthlyAvg = monthValues.length > 0 ? monthValues.reduce((s, v) => s + v, 0) / monthValues.length : 0;
    
    const mean = results.length > 0 ? totalResult / results.length : 0;
    const variance = results.length > 0 
      ? results.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / results.length 
      : 0;
    const stdDev = Math.sqrt(variance);
    
    const volatility = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0;
    
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

    // Equity curve by day (not by operation)
    const sortedDays = Object.entries(dayResults)
      .sort(([a], [b]) => a.localeCompare(b));
    
    let cumulative = 0;
    let maxBalance = 0;
    let minBalance = 0;
    const equityCurve = sortedDays.map(([date, dailyData], idx) => {
      cumulative += dailyData.result;
      maxBalance = Math.max(maxBalance, cumulative);
      minBalance = Math.min(minBalance, cumulative);
      return {
        index: idx + 1,
        result: dailyData.result,
        total: cumulative,
        date: format(parseISO(date), 'dd/MM', { locale: ptBR })
      };
    });

    let maxDrawdown = 0;
    let peak = 0;
    let maxDrawdownDuration = 0;
    let currentDrawdownDuration = 0;
    
    equityCurve.forEach((point, idx) => {
      if (point.total > peak) {
        peak = point.total;
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
    
    const grossProfit = wins.reduce((s, r) => s + r, 0);
    const grossLoss = Math.abs(losses.reduce((s, r) => s + r, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    
    const expectancy = ops.length > 0 
      ? (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss 
      : 0;
    
    const dailyResults = Object.values(dayResults).map(d => d.result);
    const dailyMean = dailyResults.length > 0 ? dailyResults.reduce((s, v) => s + v, 0) / dailyResults.length : 0;
    const dailyVariance = dailyResults.length > 0 
      ? dailyResults.reduce((sum, r) => sum + Math.pow(r - dailyMean, 2), 0) / dailyResults.length 
      : 0;
    const dailyStdDev = Math.sqrt(dailyVariance);
    const sharpeRatio = dailyStdDev > 0 ? (dailyMean / dailyStdDev) * Math.sqrt(252) : 0;
    
    const recoveryFactor = maxDrawdown > 0 ? totalResult / maxDrawdown : 0;

    const monthlyData = Object.entries(monthResults)
      .map(([month, result]) => ({
        month: format(parseISO(month + '-01'), 'MMM/yy', { locale: ptBR }),
        monthKey: month,
        result,
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    const yearResults: Record<number, number> = {};
    ops.forEach(op => {
      const year = getYear(new Date(op.open_time));
      yearResults[year] = (yearResults[year] || 0) + (op.operation_result || 0);
    });
    const yearlyData = Object.entries(yearResults)
      .map(([year, result]) => ({ year, result }))
      .sort((a, b) => a.year.localeCompare(b.year));

    const hourlyResults: Record<number, { total: number; count: number; wins: number; losses: number; winCount: number; lossCount: number }> = {};
    ops.forEach(op => {
      const hour = getHours(new Date(op.open_time));
      if (!hourlyResults[hour]) hourlyResults[hour] = { total: 0, count: 0, wins: 0, losses: 0, winCount: 0, lossCount: 0 };
      const result = op.operation_result || 0;
      hourlyResults[hour].total += result;
      hourlyResults[hour].count++;
      if (result >= 0) {
        hourlyResults[hour].wins += result;
        hourlyResults[hour].winCount++;
      } else {
        hourlyResults[hour].losses += Math.abs(result);
        hourlyResults[hour].lossCount++;
      }
    });
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}h`,
      result: hourlyResults[hour]?.total || 0,
      count: hourlyResults[hour]?.count || 0,
      wins: hourlyResults[hour]?.wins || 0,
      losses: hourlyResults[hour]?.losses || 0,
      winCount: hourlyResults[hour]?.winCount || 0,
      lossCount: hourlyResults[hour]?.lossCount || 0,
      winRate: hourlyResults[hour] ? (hourlyResults[hour].winCount / hourlyResults[hour].count) * 100 : 0,
      avg: hourlyResults[hour] ? hourlyResults[hour].total / hourlyResults[hour].count : 0
    })).filter(h => h.count > 0);

    const calendarData = Object.entries(dayResults).map(([date, data]) => ({
      date,
      result: data.result,
      count: data.count,
      dayOfWeek: format(parseISO(date), 'EEE', { locale: ptBR }),
      day: format(parseISO(date), 'dd'),
      month: format(parseISO(date), 'MMM', { locale: ptBR })
    }));

    const rankedDays = Object.entries(dayResults)
      .map(([date, data]) => ({ date, result: data.result, count: data.count }))
      .sort((a, b) => b.result - a.result);
    const bestDays = rankedDays.slice(0, 5);
    const worstDays = rankedDays.slice(-5).reverse();

    return {
      totalResult,
      totalOperations: ops.length,
      totalDays: Object.keys(dayResults).length,
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
      dayResults,
      weekdayHourData
    };
  }, [filteredOperations]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  if (operations.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-3xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-card via-card/95 to-card/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        <div className="relative z-10 p-8 md:p-12">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-2xl bg-primary/10 mb-6">
              <BarChart3 className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Sem dados para exibir</h3>
            <p className="text-muted-foreground max-w-md">
              Importe suas operações do Profit para visualizar o dashboard com estatísticas detalhadas.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section with Main Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden rounded-3xl"
      >
        {/* Background with gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-card via-card/95 to-card/90" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent" />
        
        {/* Animated orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Content */}
        <div className="relative z-10 p-6 md:p-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-xl animate-pulse" />
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-2xl shadow-primary/30">
                  <LineChartIcon className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                  Dashboard de Trading
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Métricas e análise de performance
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="w-40 bg-card/50 border-border/50">
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
                <SelectTrigger className="w-48 bg-card/50 border-border/50">
                  <SelectValue placeholder="Estratégia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas estratégias</SelectItem>
                  {strategies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card/80 backdrop-blur border border-border/50"
              >
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">{stats.totalDays}</span>
                <span className="text-xs text-muted-foreground">dias</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="Resultado Total"
              value={
                <span className={stats.totalResult >= 0 ? "text-emerald-400" : "text-rose-400"}>
                  {stats.totalResult >= 0 ? "+" : ""}{formatCurrency(stats.totalResult)}
                </span>
              }
              icon={stats.totalResult >= 0 ? TrendingUp : TrendingDown}
              trend={stats.totalResult >= 0 ? "up" : "down"}
              color={stats.totalResult >= 0 ? "emerald" : "rose"}
              delay={0.1}
            />
            
            <MetricCard
              label="Taxa de Acerto"
              value={
                <span className={stats.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}>
                  <AnimatedValue value={stats.winRate} decimals={1} suffix="%" />
                </span>
              }
              icon={Target}
              color={stats.winRate >= 50 ? "emerald" : "rose"}
              delay={0.2}
            />
            
            <MetricCard
              label="Payoff"
              value={
                <span className={stats.payoff >= 1 ? "text-cyan-400" : "text-amber-400"}>
                  <AnimatedValue value={stats.payoff} decimals={2} />
                </span>
              }
              icon={Award}
              color={stats.payoff >= 1 ? "cyan" : "amber"}
              delay={0.3}
            />
            
            <MetricCard
              label="Consistência"
              value={
                <span className={stats.consistency >= 50 ? "text-violet-400" : "text-amber-400"}>
                  <AnimatedValue value={stats.consistency} decimals={1} suffix="%" />
                </span>
              }
              icon={BarChart3}
              color={stats.consistency >= 50 ? "violet" : "amber"}
              delay={0.4}
            />
          </div>

          {/* Secondary Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/50 backdrop-blur border border-border/30">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Dias +</p>
                <p className="text-lg font-bold text-emerald-400">{stats.positiveDays}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/50 backdrop-blur border border-border/30">
              <div className="p-2 rounded-lg bg-rose-500/10">
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Dias -</p>
                <p className="text-lg font-bold text-rose-400">{stats.negativeDays}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/50 backdrop-blur border border-border/30">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Meses +</p>
                <p className="text-lg font-bold text-emerald-400">{stats.positiveMonths}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/50 backdrop-blur border border-border/30">
              <div className="p-2 rounded-lg bg-rose-500/10">
                <Zap className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Meses -</p>
                <p className="text-lg font-bold text-rose-400">{stats.negativeMonths}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Quick Stats Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        <StatCard
          title="Melhor Trade"
          value={formatCurrency(stats.bestTrade)}
          icon={TrendingUp}
          trend="up"
          index={0}
          accentColor="emerald"
        />
        <StatCard
          title="Pior Trade"
          value={formatCurrency(stats.worstTrade)}
          icon={TrendingDown}
          trend="down"
          index={1}
          accentColor="rose"
        />
        <StatCard
          title="Média Mensal"
          value={formatCurrency(stats.monthlyAvg)}
          icon={BarChart2}
          trend={stats.monthlyAvg >= 0 ? "up" : "down"}
          index={2}
          accentColor={stats.monthlyAvg >= 0 ? "emerald" : "rose"}
        />
        <StatCard
          title="Desvio Padrão"
          value={formatCurrency(stats.stdDev)}
          subtitle="Variação diária"
          icon={Activity}
          index={3}
          accentColor="cyan"
        />
        <StatCard
          title="Volatilidade"
          value={`${stats.volatility.toFixed(1)}%`}
          subtitle={stats.volatility < 30 ? "Baixa" : stats.volatility < 60 ? "Moderada" : "Alta"}
          icon={Percent}
          index={4}
          accentColor="amber"
        />
        <StatCard
          title="Sequência"
          value={`${stats.currentStreak}${stats.streakType || '-'}`}
          subtitle="Atual"
          icon={Trophy}
          index={5}
          accentColor="violet"
        />
      </motion.div>

      {/* Equity Curve Section */}
      <PremiumSection 
        title="Curva de Performance" 
        subtitle="Evolução do resultado ao longo do tempo" 
        icon={TrendingUp}
        delay={0.3}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <StatCard
            title="Resultado Total"
            value={`${stats.totalResult >= 0 ? '+' : ''}${formatCurrency(stats.totalResult)}`}
            icon={DollarSign}
            trend={stats.totalResult >= 0 ? "up" : "down"}
            index={0}
            accentColor={stats.totalResult >= 0 ? "emerald" : "rose"}
          />
          <StatCard
            title="Saldo Máximo"
            value={`+${formatCurrency(stats.maxBalance)}`}
            icon={ArrowUpRight}
            trend="up"
            index={1}
            accentColor="emerald"
          />
          <StatCard
            title="Saldo Mínimo"
            value={formatCurrency(stats.minBalance)}
            icon={ArrowDownRight}
            trend="down"
            index={2}
            accentColor="rose"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl"
        >
          {/* Premium dark background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1a] via-[#0d0d20] to-[#0a0a1a]" />
          
          {/* Subtle ambient glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] bg-primary/5 rounded-full blur-3xl" />
          
          {/* Chart container */}
          <div className="relative z-10 p-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.equityCurve} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <defs>
                    {/* Premium gradient fill */}
                    <linearGradient id="premiumEquityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="50%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    {/* Glow filter for the line */}
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <XAxis 
                    dataKey="index" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value.toFixed(0)}
                    width={60}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 15, 35, 0.95)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(99, 102, 241, 0.2)',
                      padding: '12px 16px'
                    }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                    formatter={(value: number) => [
                      <span style={{ color: value >= 0 ? '#22c55e' : '#ef4444', fontWeight: 'bold', fontSize: '14px' }}>
                        {formatCurrency(value)}
                      </span>, 
                      'Resultado'
                    ]}
                    cursor={{ stroke: 'rgba(99, 102, 241, 0.3)', strokeWidth: 1 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#818cf8"
                    strokeWidth={2.5}
                    fill="url(#premiumEquityGradient)"
                    filter="url(#glow)"
                    dot={false}
                    activeDot={{ 
                      r: 6, 
                      fill: '#818cf8', 
                      stroke: '#c7d2fe', 
                      strokeWidth: 2,
                      filter: 'url(#glow)'
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Bottom fade effect */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0a0a1a] to-transparent pointer-events-none" />
        </motion.div>
      </PremiumSection>

      {/* Monthly & Yearly Performance - Premium Design */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative overflow-hidden rounded-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1a] via-[#0d0d20] to-[#0a0a1a]" />
          <div className="relative z-10 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 ring-2 ring-primary/20">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Performance Mensal</h3>
                  <p className="text-sm text-muted-foreground">Resultado por mês</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                {stats.positiveMonths}/{stats.monthlyData.length} meses +
              </Badge>
            </div>
            
            {/* Chart */}
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <XAxis 
                    dataKey="month" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value >= -1000 ? value.toFixed(0) : `${(value/1000).toFixed(0)}k`}
                    width={50}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 15, 35, 0.95)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                      padding: '12px 16px'
                    }}
                    labelStyle={{ color: '#ffffff', marginBottom: '4px', fontWeight: 500 }}
                    formatter={(value: number) => [
                      <span style={{ color: value >= 0 ? '#22c55e' : '#ef4444', fontWeight: 'bold', fontSize: '14px' }}>
                        {formatCurrency(value)}
                      </span>, 
                      <span style={{ color: '#ffffff' }}>Resultado</span>
                    ]}
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  />
                  <Bar dataKey="result" radius={[6, 6, 0, 0]} maxBarSize={40}>
                    {stats.monthlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.result >= 0 ? '#4ade80' : '#f87171'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/5">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                <p className={cn(
                  "text-lg font-bold",
                  stats.totalResult >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {formatCurrency(stats.totalResult)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Melhor</p>
                <p className="text-lg font-bold text-emerald-400">
                  {formatCurrency(Math.max(...stats.monthlyData.map(m => m.result), 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Pior</p>
                <p className="text-lg font-bold text-rose-400">
                  {formatCurrency(Math.min(...stats.monthlyData.map(m => m.result), 0))}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Yearly Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative overflow-hidden rounded-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1a] via-[#0d0d20] to-[#0a0a1a]" />
          <div className="relative z-10 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 ring-2 ring-cyan-500/20">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Evolução Anual</h3>
                  <p className="text-sm text-muted-foreground">Comparativo por ano</p>
                </div>
              </div>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                {stats.yearlyData.filter(y => y.result > 0).length}/{stats.yearlyData.length} anos +
              </Badge>
            </div>
            
            {/* Chart */}
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.yearlyData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <XAxis 
                    dataKey="year" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(value) => value >= 1000 ? `R$${(value/1000).toFixed(0)}k` : value >= -1000 ? `R$${value.toFixed(0)}` : `R$${(value/1000).toFixed(0)}k`}
                    width={70}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 15, 35, 0.95)',
                      border: '1px solid rgba(34, 211, 238, 0.3)',
                      borderRadius: '12px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                      padding: '12px 16px'
                    }}
                    labelStyle={{ color: '#ffffff', marginBottom: '4px', fontWeight: 500 }}
                    formatter={(value: number) => [
                      <span style={{ color: value >= 0 ? '#22c55e' : '#ef4444', fontWeight: 'bold', fontSize: '14px' }}>
                        {formatCurrency(value)}
                      </span>, 
                      <span style={{ color: '#ffffff' }}>Resultado</span>
                    ]}
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  />
                  <Bar dataKey="result" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {stats.yearlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.result >= 0 ? '#22d3ee' : '#fb923c'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/5">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Acumulado</p>
                <p className="text-lg font-bold text-cyan-400">
                  {formatCurrency(stats.totalResult)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Melhor Ano</p>
                <p className="text-lg font-bold text-emerald-400">
                  {formatCurrency(Math.max(...stats.yearlyData.map(y => y.result), 0))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Média/Ano</p>
                <p className="text-lg font-bold text-amber-400">
                  {formatCurrency(stats.yearlyData.length > 0 ? stats.yearlyData.reduce((s, y) => s + y.result, 0) / stats.yearlyData.length : 0)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Hourly Distribution - Premium Design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a1a]/90 backdrop-blur-xl p-6"
      >
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/15 shadow-lg shadow-amber-500/20">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Distribuição por Horário</h3>
                <p className="text-xs text-muted-foreground">Performance e volume de operações por hora</p>
              </div>
            </div>
            <Badge className={cn(
              "px-3 py-1.5 text-sm font-bold border-0",
              stats.totalResult >= 0 
                ? "bg-emerald-500/20 text-emerald-400" 
                : "bg-rose-500/20 text-rose-400"
            )}>
              {formatCurrency(stats.totalResult)}
            </Badge>
          </div>

          {/* Chart */}
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stats.hourlyData}>
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="left" 
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Operações', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                  label={{ value: 'Resultado (R$)', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 10 }}
                />
                <RechartsTooltip 
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0]?.payload;
                    if (!data) return null;
                    return (
                      <div style={{
                        backgroundColor: 'rgba(15, 15, 35, 0.98)',
                        border: '1px solid rgba(251, 191, 36, 0.4)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                        padding: '14px 18px',
                        minWidth: '180px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                          <Clock style={{ width: '16px', height: '16px', color: '#fbbf24' }} />
                          <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>{label}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                              Positivas:
                            </span>
                            <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{data.winCount}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                              Negativas:
                            </span>
                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{data.lossCount}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#64748b', border: '2px solid #94a3b8' }} />
                              Taxa Acerto:
                            </span>
                            <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{data.winRate.toFixed(1)}%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fbbf24' }} />
                              Resultado:
                            </span>
                            <span style={{ color: data.result >= 0 ? '#22c55e' : '#ef4444', fontWeight: 'bold' }}>{formatCurrency(data.result)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar yAxisId="left" dataKey="wins" stackId="stack" fill="#22c55e" radius={[0, 0, 0, 0]} name="wins" />
                <Bar yAxisId="left" dataKey="losses" stackId="stack" fill="#ef4444" radius={[4, 4, 0, 0]} name="losses" />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="result" 
                  stroke="#fbbf24" 
                  strokeWidth={3} 
                  dot={{ fill: '#fbbf24', r: 4, strokeWidth: 0 }}
                  name="result"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Ops</p>
              <p className="text-lg font-bold text-white">
                {stats.hourlyData.reduce((sum, h) => sum + h.count, 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Resultado</p>
              <p className={cn("text-lg font-bold", stats.totalResult >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {formatCurrency(stats.totalResult)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-emerald-400" /> Melhor
              </p>
              <p className="text-lg font-bold text-emerald-400">
                {(() => {
                  const best = stats.hourlyData.reduce((max, h) => h.result > max.result ? h : max, stats.hourlyData[0] || { hour: '-', result: 0 });
                  return `${best.hour} (${formatCurrency(best.result)})`;
                })()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                <ArrowDownRight className="w-3 h-3 text-rose-400" /> Pior
              </p>
              <p className="text-lg font-bold text-rose-400">
                {(() => {
                  const worst = stats.hourlyData.reduce((min, h) => h.result < min.result ? h : min, stats.hourlyData[0] || { hour: '-', result: 0 });
                  return `${worst.hour} (${formatCurrency(worst.result)})`;
                })()}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Advanced Metrics - Premium Design */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a1a]/90 backdrop-blur-xl p-6"
      >
        {/* Background effects */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 rounded-xl bg-violet-500/15 shadow-lg shadow-violet-500/20">
              <Activity className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Métricas Avançadas</h3>
              <p className="text-xs text-muted-foreground">Indicadores de risco e performance ajustada</p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Sharpe Ratio */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-5 hover:border-emerald-500/40 transition-all duration-300 group">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20">
                        <Zap className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sharpe Ratio</span>
                      <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 flex items-center justify-center ml-auto">
                        <span className="text-[8px] text-muted-foreground">i</span>
                      </div>
                    </div>
                    <p className={cn("text-3xl font-black mb-2", stats.sharpeRatio >= 1 ? "text-emerald-400" : stats.sharpeRatio >= 0 ? "text-amber-400" : "text-rose-400")}>
                      {stats.sharpeRatio.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                      {stats.sharpeRatio >= 2 ? "Retorno excelente com risco" : stats.sharpeRatio >= 1 ? "Retorno positivo com risco" : "Retorno ajustado ao risco"}
                    </p>
                    <div className="mt-4 h-10 flex items-end justify-between">
                      <svg className="w-full h-8" viewBox="0 0 100 30">
                        <path d="M0,25 Q10,20 20,22 T40,18 T60,15 T80,10 T100,5" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.6"/>
                      </svg>
                      <Badge className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border-0">
                        ↑{Math.abs(stats.sharpeRatio * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent><p>Retorno ajustado ao risco. Acima de 1 é bom.</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Max Drawdown */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20 p-5 hover:border-rose-500/40 transition-all duration-300 group">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-rose-500/20">
                        <TrendingDown className="w-4 h-4 text-rose-400" />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Drawdown</span>
                      <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 flex items-center justify-center ml-auto">
                        <span className="text-[8px] text-muted-foreground">i</span>
                      </div>
                    </div>
                    <p className="text-3xl font-black mb-2 text-rose-400">
                      {formatCurrency(stats.maxDrawdown)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowDownRight className="w-3 h-3 text-rose-400" />
                      Maior perda acumulada
                    </p>
                    <div className="mt-4 h-10 flex items-end justify-between">
                      <svg className="w-full h-8" viewBox="0 0 100 30">
                        <path d="M0,5 Q15,8 25,12 T50,20 T75,25 T100,28" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.6"/>
                      </svg>
                      <Badge className="text-[10px] px-1.5 py-0.5 bg-rose-500/20 text-rose-400 border-0">
                        ↓{Math.min(100, Math.abs((stats.maxDrawdown / (stats.totalResult || 1)) * 100)).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent><p>Maior queda do pico ao vale.</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Profit Factor */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-5 hover:border-emerald-500/40 transition-all duration-300 group">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20">
                        <Target className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profit Factor</span>
                      <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 flex items-center justify-center ml-auto">
                        <span className="text-[8px] text-muted-foreground">i</span>
                      </div>
                    </div>
                    <p className={cn("text-3xl font-black mb-2", stats.profitFactor >= 1.5 ? "text-emerald-400" : stats.profitFactor >= 1 ? "text-amber-400" : "text-rose-400")}>
                      {stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                      {stats.profitFactor >= 1.5 ? "Estratégia lucrativa" : stats.profitFactor >= 1 ? "Estratégia equilibrada" : "Estratégia deficitária"}
                    </p>
                    <div className="mt-4 h-10 flex items-end justify-between">
                      <svg className="w-full h-8" viewBox="0 0 100 30">
                        <path d="M0,20 Q20,18 35,15 T60,12 T85,8 T100,5" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.6"/>
                      </svg>
                      <Badge className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border-0">
                        ↑{Math.min(999, (stats.profitFactor * 47)).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent><p>Lucro bruto / Perda bruta. Acima de 1.5 é bom.</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Expectancy */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "relative overflow-hidden rounded-xl p-5 transition-all duration-300 group",
                    stats.expectancy >= 0 
                      ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40"
                      : "bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20 hover:border-rose-500/40"
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={cn("p-1.5 rounded-lg", stats.expectancy >= 0 ? "bg-emerald-500/20" : "bg-rose-500/20")}>
                        <TrendingUp className={cn("w-4 h-4", stats.expectancy >= 0 ? "text-emerald-400" : "text-rose-400")} />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expectancy</span>
                      <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 flex items-center justify-center ml-auto">
                        <span className="text-[8px] text-muted-foreground">i</span>
                      </div>
                    </div>
                    <p className={cn("text-3xl font-black mb-2", stats.expectancy >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {formatCurrency(stats.expectancy)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {stats.expectancy >= 0 
                        ? <><ArrowUpRight className="w-3 h-3 text-emerald-400" />Ganho esperado por operação</>
                        : <><ArrowDownRight className="w-3 h-3 text-rose-400" />Perda esperada por operação</>
                      }
                    </p>
                    <div className="mt-4 h-10 flex items-end justify-between">
                      <svg className="w-full h-8" viewBox="0 0 100 30">
                        <path d={stats.expectancy >= 0 ? "M0,25 Q15,22 30,18 T55,12 T80,8 T100,3" : "M0,5 Q15,10 30,15 T55,20 T80,25 T100,28"} fill="none" stroke={stats.expectancy >= 0 ? "#22c55e" : "#ef4444"} strokeWidth="2" opacity="0.6"/>
                      </svg>
                      <Badge className={cn("text-[10px] px-1.5 py-0.5 border-0", stats.expectancy >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                        {stats.expectancy >= 0 ? "↑" : "↓"}{Math.abs(stats.expectancy * 10).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent><p>Valor esperado por operação.</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Recovery Factor */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "relative overflow-hidden rounded-xl p-5 transition-all duration-300 group",
                    stats.recoveryFactor >= 2
                      ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40"
                      : stats.recoveryFactor >= 1
                      ? "bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 hover:border-amber-500/40"
                      : "bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20 hover:border-rose-500/40"
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={cn(
                        "p-1.5 rounded-lg",
                        stats.recoveryFactor >= 2 ? "bg-emerald-500/20" : stats.recoveryFactor >= 1 ? "bg-amber-500/20" : "bg-rose-500/20"
                      )}>
                        <Flame className={cn(
                          "w-4 h-4",
                          stats.recoveryFactor >= 2 ? "text-emerald-400" : stats.recoveryFactor >= 1 ? "text-amber-400" : "text-rose-400"
                        )} />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recovery Factor</span>
                      <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 flex items-center justify-center ml-auto">
                        <span className="text-[8px] text-muted-foreground">i</span>
                      </div>
                    </div>
                    <p className={cn(
                      "text-3xl font-black mb-2",
                      stats.recoveryFactor >= 2 ? "text-emerald-400" : stats.recoveryFactor >= 1 ? "text-amber-400" : "text-rose-400"
                    )}>
                      {stats.recoveryFactor.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {stats.recoveryFactor >= 2 
                        ? <><ArrowUpRight className="w-3 h-3 text-emerald-400" />Recuperação rápida</>
                        : <><ArrowDownRight className="w-3 h-3 text-amber-400" />Recuperação lenta</>
                      }
                    </p>
                    <div className="mt-4 h-10 flex items-end justify-between">
                      <svg className="w-full h-8" viewBox="0 0 100 30">
                        <path d="M0,20 Q20,22 40,18 T60,15 T80,20 T100,12" fill="none" stroke={stats.recoveryFactor >= 2 ? "#22c55e" : "#fbbf24"} strokeWidth="2" opacity="0.6"/>
                      </svg>
                      <Badge className={cn(
                        "text-[10px] px-1.5 py-0.5 border-0",
                        stats.recoveryFactor >= 2 ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                      )}>
                        ↑{(stats.recoveryFactor * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent><p>Lucro total / Drawdown máximo.</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Drawdown Duration */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 p-5 hover:border-cyan-500/40 transition-all duration-300 group">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-lg bg-cyan-500/20">
                        <Clock className="w-4 h-4 text-cyan-400" />
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Drawdown Duration</span>
                      <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 flex items-center justify-center ml-auto">
                        <span className="text-[8px] text-muted-foreground">i</span>
                      </div>
                    </div>
                    <p className="text-3xl font-black mb-2 text-cyan-400">
                      {stats.maxDrawdownDuration} <span className="text-lg font-medium">ops</span>
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowDownRight className="w-3 h-3 text-cyan-400" />
                      {stats.maxDrawdownDuration <= 5 ? "Recuperação rápida" : "Recuperação lenta"}
                    </p>
                    <div className="mt-4 h-10 flex items-end justify-between">
                      <svg className="w-full h-8" viewBox="0 0 100 30">
                        <path d="M0,15 Q15,18 30,12 T50,20 T70,10 T90,18 T100,15" fill="none" stroke="#22d3ee" strokeWidth="2" opacity="0.6"/>
                      </svg>
                      <Badge className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 border-0">
                        ↓{stats.maxDrawdownDuration}%
                      </Badge>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent><p>Maior duração de drawdown em operações.</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </motion.div>

      {/* Heatmap & Ranking Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap de Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a1a]/90 backdrop-blur-xl p-6"
        >
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/15 shadow-lg shadow-amber-500/20">
                  <Activity className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Heatmap de Performance</h3>
                  <p className="text-xs text-muted-foreground">Análise por horário e dia da semana</p>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-6 mb-4 text-sm">
              <span className="text-muted-foreground">Total: <span className="text-white font-semibold">{stats.totalOperations} operações</span></span>
              <span className="text-muted-foreground">Resultado: <span className={cn("font-semibold", stats.totalResult >= 0 ? "text-emerald-400" : "text-rose-400")}>{formatCurrency(stats.totalResult)}</span></span>
              <span className="text-muted-foreground flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400" />
                Melhor: <span className="text-amber-400 font-semibold">
                  {(() => {
                    let best = { key: '', count: 0 };
                    Object.entries(stats.weekdayHourData).forEach(([key, data]) => {
                      if (data.count > best.count) best = { key, count: data.count };
                    });
                    if (!best.key) return '-';
                    const [wd, h] = best.key.split('-');
                    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                    return `${dayNames[parseInt(wd)]} ${h}h`;
                  })()}
                </span>
              </span>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="w-12"></th>
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map(day => (
                      <th key={day} className="text-center text-xs text-muted-foreground font-semibold py-2 px-1">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[9, 10, 11, 12, 13, 14, 15, 16, 17].map(hour => (
                    <tr key={hour}>
                      <td className="text-xs text-muted-foreground font-semibold py-1 pr-2 text-right">{hour}h</td>
                      {[1, 2, 3, 4, 5].map(weekday => {
                        const key = `${weekday}-${hour}`;
                        const data = stats.weekdayHourData[key];
                        const count = data?.count || 0;
                        const result = data?.result || 0;
                        const bgColor = count === 0 
                          ? 'rgba(100, 116, 139, 0.1)' 
                          : result >= 0 
                            ? `rgba(34, 197, 94, ${Math.min(0.3 + (count / 100) * 0.5, 0.8)})` 
                            : `rgba(239, 68, 68, ${Math.min(0.3 + (count / 100) * 0.5, 0.8)})`;
                        
                        // Find the best cell
                        let bestKey = '';
                        let maxCount = 0;
                        Object.entries(stats.weekdayHourData).forEach(([k, d]) => {
                          if (d.count > maxCount) { maxCount = d.count; bestKey = k; }
                        });
                        const isBest = key === bestKey && count > 0;
                        
                        return (
                          <td key={weekday} className="p-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div 
                                    className={cn(
                                      "aspect-square rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer transition-all min-w-[50px] min-h-[40px]",
                                      isBest && "ring-2 ring-amber-400"
                                    )}
                                    style={{ backgroundColor: bgColor, color: count > 0 ? '#fff' : '#64748b' }}
                                  >
                                    {count || '-'}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="!bg-[#0a0a1a] border border-emerald-500/30 p-0 rounded-xl overflow-hidden shadow-xl shadow-black/50 z-50" sideOffset={5}>
                                  <div className="p-3">
                                    <div className="flex items-center gap-2 mb-3">
                                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                                      <span className="font-bold text-white">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][weekday]} às {hour}h</span>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between gap-8">
                                        <span className="text-muted-foreground">Operações</span>
                                        <span className="font-semibold text-white">{count}</span>
                                      </div>
                                      <div className="flex justify-between gap-8">
                                        <span className="text-muted-foreground flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                          Ganhos
                                        </span>
                                        <span className="font-semibold text-emerald-400">{data?.winCount || 0}</span>
                                      </div>
                                      <div className="flex justify-between gap-8">
                                        <span className="text-muted-foreground flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                                          Perdas
                                        </span>
                                        <span className="font-semibold text-rose-400">{data?.lossCount || 0}</span>
                                      </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-white/10 flex justify-between">
                                      <span className="text-muted-foreground">Resultado</span>
                                      <span className={cn("font-bold", result >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                        {formatCurrency(result)}
                                      </span>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-rose-500/60"></div>
                <span className="text-xs text-muted-foreground">Prejuízo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-500/20 border border-slate-500/30"></div>
                <span className="text-xs text-muted-foreground">Sem dados</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-emerald-500/60"></div>
                <span className="text-xs text-muted-foreground">Lucro</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Ranking de Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a1a]/90 backdrop-blur-xl p-6"
        >
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-amber-500/15 shadow-lg shadow-amber-500/20">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Ranking de Performance</h3>
                <p className="text-xs text-muted-foreground">Melhores e piores dias de trading</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => setRankingTab('best')}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
                  rankingTab === 'best' 
                    ? "bg-emerald-500 text-white" 
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                )}
              >
                <Trophy className="w-4 h-4" />
                Melhores Dias
              </button>
              <button 
                onClick={() => setRankingTab('worst')}
                className={cn(
                  "flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
                  rankingTab === 'worst' 
                    ? "bg-rose-500 text-white" 
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                )}
              >
                <ArrowDownRight className="w-4 h-4" />
                Piores Dias
              </button>
            </div>

            {/* List */}
            <div className="space-y-2">
              {(rankingTab === 'best' ? stats.bestDays : stats.worstDays).map((day, idx) => {
                const avgPerOp = day.count > 0 ? day.result / day.count : 0;
                const medalColors = ['text-amber-400', 'text-slate-300', 'text-amber-700'];
                const isPositive = day.result >= 0;
                
                return (
                  <motion.div 
                    key={day.date} 
                    initial={{ opacity: 0, x: rankingTab === 'best' ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl transition-all",
                      isPositive 
                        ? "bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40"
                        : "bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {/* Medal/Position */}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        idx < 3 ? "bg-white/10" : "bg-white/5"
                      )}>
                        {idx < 3 ? (
                          <Trophy className={cn("w-4 h-4", medalColors[idx])} />
                        ) : (
                          <span className="text-muted-foreground">{idx + 1}</span>
                        )}
                      </div>
                      
                      {/* Date & Count */}
                      <div>
                        <p className="text-sm font-medium text-white flex items-center gap-1.5">
                          <CalendarDays className="w-3 h-3 text-muted-foreground" />
                          {format(parseISO(day.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-muted-foreground">{day.count} operações</p>
                      </div>
                    </div>
                    
                    {/* Result */}
                    <div className="text-right">
                      <p className={cn("text-lg font-bold", isPositive ? "text-emerald-400" : "text-rose-400")}>
                        {isPositive ? '+' : ''}{formatCurrency(day.result)}
                      </p>
                      <Badge className={cn(
                        "text-[10px] px-1.5 py-0.5 border-0",
                        avgPerOp >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                      )}>
                        {avgPerOp >= 0 ? '+' : ''}{formatCurrency(avgPerOp)}/op
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Top 5</span>
              <span className={cn(
                "text-lg font-bold",
                (rankingTab === 'best' ? stats.bestDays : stats.worstDays).reduce((s, d) => s + d.result, 0) >= 0 
                  ? "text-emerald-400" 
                  : "text-rose-400"
              )}>
                {(() => {
                  const total = (rankingTab === 'best' ? stats.bestDays : stats.worstDays).reduce((s, d) => s + d.result, 0);
                  return `${total >= 0 ? '+' : ''}${formatCurrency(total)}`;
                })()}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TradingDashboard;
