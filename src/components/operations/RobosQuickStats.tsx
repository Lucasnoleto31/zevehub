import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  Activity, 
  Percent, 
  Trophy 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  bestResult: number;
  worstResult: number;
  averageMonthlyResult: number;
  standardDeviation: number;
  volatility: number;
  positiveStreak: number;
  negativeStreak: number;
}

interface RobosQuickStatsProps {
  stats: Stats;
}

const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  index
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: React.ElementType; 
  trend?: "up" | "down" | "neutral";
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    className={cn(
      "group relative overflow-hidden rounded-xl p-4 transition-all duration-300",
      "bg-gradient-to-br from-card/90 via-card/70 to-card/50",
      "border border-border/40 hover:border-primary/30",
      "hover:shadow-lg hover:-translate-y-0.5 backdrop-blur-sm"
    )}
  >
    {/* Hover glow */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        <div className={cn(
          "p-1.5 rounded-lg transition-all duration-300 group-hover:scale-110",
          trend === "up" && "bg-emerald-500/15 text-emerald-400",
          trend === "down" && "bg-rose-500/15 text-rose-400",
          !trend && "bg-primary/10 text-primary"
        )}>
          <Icon className="w-3.5 h-3.5" />
        </div>
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
  </motion.div>
);

export const RobosQuickStats = ({ stats }: RobosQuickStatsProps) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
    >
      <StatCard
        title="Melhor Trade"
        value={`+${formatCurrency(stats.bestResult)}`}
        icon={TrendingUp}
        trend="up"
        index={0}
      />
      <StatCard
        title="Pior Trade"
        value={formatCurrency(stats.worstResult)}
        icon={TrendingDown}
        trend="down"
        index={1}
      />
      <StatCard
        title="Média Mensal"
        value={formatCurrency(stats.averageMonthlyResult)}
        icon={BarChart2}
        trend={stats.averageMonthlyResult >= 0 ? "up" : "down"}
        index={2}
      />
      <StatCard
        title="Desvio Padrão"
        value={formatCurrency(stats.standardDeviation)}
        subtitle="Variação diária"
        icon={Activity}
        index={3}
      />
      <StatCard
        title="Volatilidade"
        value={`${stats.volatility.toFixed(1)}%`}
        subtitle={stats.volatility < 30 ? "Baixa" : stats.volatility < 60 ? "Moderada" : "Alta"}
        icon={Percent}
        index={4}
      />
      <StatCard
        title="Sequência"
        value={`${stats.positiveStreak}W / ${stats.negativeStreak}L`}
        subtitle="Máximas registradas"
        icon={Trophy}
        index={5}
      />
    </motion.div>
  );
};

export default RobosQuickStats;
