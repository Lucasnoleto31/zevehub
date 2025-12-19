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
    
    const dayResults: Record<string, number> = {};
    ops.forEach(op => {
      const day = format(new Date(op.open_time), 'yyyy-MM-dd');
      dayResults[day] = (dayResults[day] || 0) + (op.operation_result || 0);
    });
    const dayValues = Object.values(dayResults);
    const positiveDays = dayValues.filter(v => v > 0).length;
    const negativeDays = dayValues.filter(v => v < 0).length;
    
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
    const equityCurve = sortedDays.map(([date, dailyResult], idx) => {
      cumulative += dailyResult;
      maxBalance = Math.max(maxBalance, cumulative);
      minBalance = Math.min(minBalance, cumulative);
      return {
        index: idx + 1,
        result: dailyResult,
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
    
    const dailyResults = Object.values(dayResults);
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

    const calendarData = Object.entries(dayResults).map(([date, result]) => ({
      date,
      result,
      dayOfWeek: format(parseISO(date), 'EEE', { locale: ptBR }),
      day: format(parseISO(date), 'dd'),
      month: format(parseISO(date), 'MMM', { locale: ptBR })
    }));

    const rankedDays = Object.entries(dayResults)
      .map(([date, result]) => ({ date, result }))
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
      dayResults
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

      {/* Monthly & Yearly Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PremiumSection title="Performance Mensal" subtitle="Resultado por mês" icon={Calendar} delay={0.4}>
          <ChartCard>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Resultado']}
                  />
                  <Bar dataKey="result" radius={[6, 6, 0, 0]}>
                    {stats.monthlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.result >= 0 ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </PremiumSection>

        <PremiumSection title="Evolução Anual" subtitle="Comparativo por ano" icon={BarChart3} delay={0.5}>
          <ChartCard>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Resultado']}
                  />
                  <Bar dataKey="result" radius={[6, 6, 0, 0]}>
                    {stats.yearlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.result >= 0 ? '#22c55e' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </PremiumSection>
      </div>

      {/* Hourly Distribution */}
      <PremiumSection title="Distribuição por Horário" subtitle="Performance em cada horário do dia" icon={Clock} delay={0.6}>
        <ChartCard>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stats.hourlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'count' ? value : formatCurrency(value), 
                    name === 'result' ? 'Resultado' : 'Operações'
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
        </ChartCard>
      </PremiumSection>

      {/* Advanced Metrics */}
      <PremiumSection title="Métricas Avançadas" subtitle="Indicadores de risco e performance" icon={Activity} delay={0.7}>
        <TooltipProvider>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <StatCard
                    title="Sharpe Ratio"
                    value={stats.sharpeRatio.toFixed(2)}
                    subtitle={stats.sharpeRatio >= 2 ? "Excelente" : stats.sharpeRatio >= 1 ? "Bom" : "Regular"}
                    icon={BarChart3}
                    index={0}
                    accentColor={stats.sharpeRatio >= 1 ? "emerald" : stats.sharpeRatio >= 0 ? "amber" : "rose"}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Retorno ajustado ao risco. Acima de 1 é bom.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <StatCard
                    title="Max Drawdown"
                    value={`-${formatCurrency(stats.maxDrawdown)}`}
                    subtitle="Maior queda"
                    icon={TrendingDown}
                    trend="down"
                    index={1}
                    accentColor="rose"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Maior queda do pico ao vale.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <StatCard
                    title="Profit Factor"
                    value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
                    subtitle={stats.profitFactor >= 1.5 ? "Bom" : "Regular"}
                    icon={Target}
                    index={2}
                    accentColor={stats.profitFactor >= 1.5 ? "emerald" : stats.profitFactor >= 1 ? "amber" : "rose"}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Lucro bruto / Perda bruta. Acima de 1.5 é bom.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <StatCard
                    title="Expectancy"
                    value={`${stats.expectancy >= 0 ? '+' : ''}${formatCurrency(stats.expectancy)}`}
                    subtitle="Por operação"
                    icon={DollarSign}
                    trend={stats.expectancy >= 0 ? "up" : "down"}
                    index={3}
                    accentColor={stats.expectancy >= 0 ? "emerald" : "rose"}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Valor esperado por operação.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <StatCard
                    title="Recovery Factor"
                    value={stats.recoveryFactor.toFixed(2)}
                    subtitle={stats.recoveryFactor >= 2 ? "Bom" : "Regular"}
                    icon={Flame}
                    index={4}
                    accentColor={stats.recoveryFactor >= 2 ? "emerald" : stats.recoveryFactor >= 1 ? "amber" : "rose"}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Lucro total / Drawdown máximo.</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <StatCard
                    title="DD Duration"
                    value={`${stats.maxDrawdownDuration} ops`}
                    subtitle="Maior duração"
                    icon={Clock}
                    index={5}
                    accentColor="cyan"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Maior duração de drawdown.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </PremiumSection>

      {/* Calendar Heatmap */}
      <PremiumSection title="Calendário de Performance" subtitle="Heatmap dos resultados diários" icon={CalendarDays} delay={0.8}>
        <ChartCard>
          <div className="grid grid-cols-7 gap-1.5">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="text-center text-xs text-muted-foreground font-semibold py-2">
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
                        className="aspect-square rounded-lg flex items-center justify-center text-xs font-semibold cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                        style={{ backgroundColor: bgColor }}
                      >
                        {day.day}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{format(parseISO(day.date), 'dd/MM/yyyy', { locale: ptBR })}</p>
                      <p className={day.result >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {day.result >= 0 ? '+' : ''}{formatCurrency(day.result)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </ChartCard>
      </PremiumSection>

      {/* Best & Worst Days Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PremiumSection title="Melhores Dias" subtitle="Top 5 dias com maior resultado" icon={Award} delay={0.9}>
          <ChartCard>
            <div className="space-y-3">
              {stats.bestDays.map((day, idx) => (
                <motion.div 
                  key={day.date} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-emerald-400">#{idx + 1}</span>
                    <span className="text-sm font-medium">{format(parseISO(day.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400">+{formatCurrency(day.result)}</span>
                </motion.div>
              ))}
            </div>
          </ChartCard>
        </PremiumSection>

        <PremiumSection title="Piores Dias" subtitle="Top 5 dias com menor resultado" icon={TrendingDown} delay={1.0}>
          <ChartCard>
            <div className="space-y-3">
              {stats.worstDays.map((day, idx) => (
                <motion.div 
                  key={day.date} 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-rose-400">#{idx + 1}</span>
                    <span className="text-sm font-medium">{format(parseISO(day.date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  </div>
                  <span className="text-lg font-bold text-rose-400">{formatCurrency(day.result)}</span>
                </motion.div>
              ))}
            </div>
          </ChartCard>
        </PremiumSection>
      </div>
    </div>
  );
};

export default TradingDashboard;
