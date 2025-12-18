import { motion } from "framer-motion";
import { 
  DollarSign, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Trophy,
  AlertTriangle,
  Flame,
  Award,
  BarChart3,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsOverviewProps {
  stats: {
    totalOperations: number;
    totalProfit: number;
    winRate: number;
    averageResult: number;
  };
  advancedMetrics: {
    bestTrade: number;
    worstTrade: number;
    currentStreak: number;
    profitFactor: number;
    avgWin: number;
    avgLoss: number;
    wins: number;
    losses: number;
  };
  loading?: boolean;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: "green" | "blue" | "red" | "purple" | "orange" | "cyan";
  delay?: number;
  size?: "default" | "large";
}

const colorConfig = {
  green: {
    border: "border-emerald-500/30 hover:border-emerald-500/50",
    glow: "hover:shadow-emerald-500/10",
    icon: "bg-emerald-500/15 text-emerald-400",
    value: "text-emerald-400",
    gradient: "from-emerald-500/10",
  },
  blue: {
    border: "border-blue-500/30 hover:border-blue-500/50",
    glow: "hover:shadow-blue-500/10",
    icon: "bg-blue-500/15 text-blue-400",
    value: "text-blue-400",
    gradient: "from-blue-500/10",
  },
  red: {
    border: "border-rose-500/30 hover:border-rose-500/50",
    glow: "hover:shadow-rose-500/10",
    icon: "bg-rose-500/15 text-rose-400",
    value: "text-rose-400",
    gradient: "from-rose-500/10",
  },
  purple: {
    border: "border-violet-500/30 hover:border-violet-500/50",
    glow: "hover:shadow-violet-500/10",
    icon: "bg-violet-500/15 text-violet-400",
    value: "text-violet-400",
    gradient: "from-violet-500/10",
  },
  orange: {
    border: "border-orange-500/30 hover:border-orange-500/50",
    glow: "hover:shadow-orange-500/10",
    icon: "bg-orange-500/15 text-orange-400",
    value: "text-orange-400",
    gradient: "from-orange-500/10",
  },
  cyan: {
    border: "border-cyan-500/30 hover:border-cyan-500/50",
    glow: "hover:shadow-cyan-500/10",
    icon: "bg-cyan-500/15 text-cyan-400",
    value: "text-cyan-400",
    gradient: "from-cyan-500/10",
  },
};

const MetricCard = ({ label, value, subtitle, icon: Icon, color, delay = 0, size = "default" }: MetricCardProps) => {
  const colors = colorConfig[color];
  const isLarge = size === "large";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "bg-gradient-to-br from-card/95 via-card/80 to-card/60",
        "border transition-all duration-500",
        "hover:shadow-2xl hover:-translate-y-1",
        "backdrop-blur-xl",
        colors.border,
        colors.glow,
        isLarge ? "p-6" : "p-4"
      )}
    >
      {/* Gradient overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        colors.gradient,
        "to-transparent"
      )} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <span className={cn(
            "font-bold text-muted-foreground uppercase tracking-widest",
            isLarge ? "text-xs" : "text-[10px]"
          )}>
            {label}
          </span>
          <div className={cn(
            "rounded-xl transition-all duration-300 group-hover:scale-110",
            colors.icon,
            isLarge ? "p-2.5" : "p-2"
          )}>
            <Icon className={isLarge ? "w-5 h-5" : "w-4 h-4"} />
          </div>
        </div>

        <div className={cn(
          "font-black tracking-tight",
          colors.value,
          isLarge ? "text-3xl md:text-4xl" : "text-xl"
        )}>
          {value}
        </div>

        {subtitle && (
          <p className={cn(
            "text-muted-foreground mt-1",
            isLarge ? "text-sm" : "text-[10px]"
          )}>
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export const StatsOverview = ({ stats, advancedMetrics, loading }: StatsOverviewProps) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-card/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Primary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Resultado Total"
          value={formatCurrency(stats.totalProfit)}
          icon={DollarSign}
          color={stats.totalProfit >= 0 ? "green" : "red"}
          delay={0.1}
          size="large"
        />
        <MetricCard
          label="Taxa de Acerto"
          value={`${stats.winRate.toFixed(1)}%`}
          subtitle={`${advancedMetrics.wins}W / ${advancedMetrics.losses}L`}
          icon={Target}
          color="blue"
          delay={0.15}
          size="large"
        />
        <MetricCard
          label="Profit Factor"
          value={advancedMetrics.profitFactor.toFixed(2)}
          subtitle="Ganho/Perda média"
          icon={Award}
          color={advancedMetrics.profitFactor >= 1 ? "green" : "red"}
          delay={0.2}
          size="large"
        />
        <MetricCard
          label="Resultado Médio"
          value={formatCurrency(stats.averageResult)}
          subtitle="Por operação"
          icon={BarChart3}
          color={stats.averageResult >= 0 ? "cyan" : "red"}
          delay={0.25}
          size="large"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Melhor Trade"
          value={formatCurrency(advancedMetrics.bestTrade)}
          icon={Trophy}
          color="green"
          delay={0.3}
        />
        <MetricCard
          label="Pior Trade"
          value={formatCurrency(advancedMetrics.worstTrade)}
          icon={AlertTriangle}
          color="red"
          delay={0.35}
        />
        <MetricCard
          label="Sequência"
          value={advancedMetrics.currentStreak > 0 
            ? `${advancedMetrics.currentStreak} wins` 
            : advancedMetrics.currentStreak < 0 
              ? `${Math.abs(advancedMetrics.currentStreak)} losses`
              : "0"
          }
          icon={Flame}
          color={advancedMetrics.currentStreak > 0 ? "orange" : advancedMetrics.currentStreak < 0 ? "blue" : "purple"}
          delay={0.4}
        />
        <MetricCard
          label="Média Gain"
          value={formatCurrency(advancedMetrics.avgWin)}
          icon={TrendingUp}
          color="green"
          delay={0.45}
        />
        <MetricCard
          label="Média Loss"
          value={formatCurrency(Math.abs(advancedMetrics.avgLoss))}
          icon={TrendingDown}
          color="red"
          delay={0.5}
        />
        <MetricCard
          label="Total Ops"
          value={stats.totalOperations.toLocaleString()}
          icon={Activity}
          color="purple"
          delay={0.55}
        />
      </div>
    </div>
  );
};

export default StatsOverview;
