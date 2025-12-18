import { motion } from "framer-motion";
import { 
  Bot, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award,
  Activity,
  Zap,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";

interface RobosHeroProps {
  totalOperations: number;
  totalDays: number;
  totalResult: number;
  winRate: number;
  positiveDays: number;
  negativeDays: number;
  payoff: number;
  monthlyConsistency: number;
  positiveMonths: number;
  negativeMonths: number;
}

const AnimatedValue = ({ value, prefix = "", suffix = "", decimals = 0 }: { 
  value: number; 
  prefix?: string; 
  suffix?: string;
  decimals?: number;
}) => {
  const { rawValue } = useCountUp({ end: value, duration: 1500, decimals });
  return <>{prefix}{rawValue.toFixed(decimals)}{suffix}</>;
};

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

export const RobosHero = ({
  totalOperations,
  totalDays,
  totalResult,
  winRate,
  positiveDays,
  negativeDays,
  payoff,
  monthlyConsistency,
  positiveMonths,
  negativeMonths,
}: RobosHeroProps) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
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
                <Bot className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                Dashboard de Robôs
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                <Sparkles className="w-4 h-4 text-primary" />
                Performance e análise em tempo real
              </p>
            </div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card/80 backdrop-blur border border-border/50"
          >
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">{totalDays}</span>
            <span className="text-xs text-muted-foreground">dias operados</span>
          </motion.div>
        </motion.div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Resultado Total"
            value={
              <span className={totalResult >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {totalResult >= 0 ? "+" : ""}{formatCurrency(totalResult)}
              </span>
            }
            icon={totalResult >= 0 ? TrendingUp : TrendingDown}
            trend={totalResult >= 0 ? "up" : "down"}
            color={totalResult >= 0 ? "emerald" : "rose"}
            delay={0.1}
          />
          
          <MetricCard
            label="Taxa de Acerto"
            value={
              <span className={winRate >= 50 ? "text-emerald-400" : "text-rose-400"}>
                <AnimatedValue value={winRate} decimals={1} suffix="%" />
              </span>
            }
            icon={Target}
            color={winRate >= 50 ? "emerald" : "rose"}
            delay={0.2}
          />
          
          <MetricCard
            label="Payoff"
            value={
              <span className={payoff >= 1 ? "text-cyan-400" : "text-amber-400"}>
                <AnimatedValue value={payoff} decimals={2} />
              </span>
            }
            icon={Award}
            color={payoff >= 1 ? "cyan" : "amber"}
            delay={0.3}
          />
          
          <MetricCard
            label="Consistência"
            value={
              <span className={monthlyConsistency >= 50 ? "text-violet-400" : "text-amber-400"}>
                <AnimatedValue value={monthlyConsistency} decimals={1} suffix="%" />
              </span>
            }
            icon={BarChart3}
            color={monthlyConsistency >= 50 ? "violet" : "amber"}
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
              <p className="text-lg font-bold text-emerald-400">{positiveDays}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/50 backdrop-blur border border-border/30">
            <div className="p-2 rounded-lg bg-rose-500/10">
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Dias -</p>
              <p className="text-lg font-bold text-rose-400">{negativeDays}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/50 backdrop-blur border border-border/30">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Meses +</p>
              <p className="text-lg font-bold text-emerald-400">{positiveMonths}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card/50 backdrop-blur border border-border/30">
            <div className="p-2 rounded-lg bg-rose-500/10">
              <Zap className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Meses -</p>
              <p className="text-lg font-bold text-rose-400">{negativeMonths}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default RobosHero;
