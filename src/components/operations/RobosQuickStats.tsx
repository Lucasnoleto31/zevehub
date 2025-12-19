import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  Activity, 
  Percent, 
  Trophy,
  Sparkles
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

export const RobosQuickStats = ({ stats }: RobosQuickStatsProps) => {
  const formatCurrency = (value: number) => {
    const formatted = value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    return value > 0 ? `+${formatted}` : formatted;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
    >
      <StatCard
        title="Melhor Trade"
        value={formatCurrency(stats.bestResult)}
        icon={TrendingUp}
        trend="up"
        index={0}
        accentColor="emerald"
      />
      <StatCard
        title="Pior Trade"
        value={formatCurrency(stats.worstResult)}
        icon={TrendingDown}
        trend="down"
        index={1}
        accentColor="rose"
      />
      <StatCard
        title="Média Mensal"
        value={formatCurrency(stats.averageMonthlyResult)}
        icon={BarChart2}
        trend={stats.averageMonthlyResult >= 0 ? "up" : "down"}
        index={2}
        accentColor={stats.averageMonthlyResult >= 0 ? "emerald" : "rose"}
      />
      <StatCard
        title="Desvio Padrão"
        value={stats.standardDeviation.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
        value={`${stats.positiveStreak}W / ${stats.negativeStreak}L`}
        subtitle="Máximas registradas"
        icon={Trophy}
        index={5}
        accentColor="violet"
      />
    </motion.div>
  );
};

export default RobosQuickStats;
