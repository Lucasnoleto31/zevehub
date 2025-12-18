import { motion } from "framer-motion";
import { DollarSign, Target, Award, Zap, Activity, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface HeroStatsSectionProps {
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

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: "green" | "blue" | "red" | "purple";
  delay?: number;
}

const MetricCard = ({ label, value, subtitle, icon: Icon, color, delay = 0 }: MetricCardProps) => {
  const colorClasses = {
    green: {
      border: "border-emerald-500/30 hover:border-emerald-500/50",
      glow: "shadow-emerald-500/10 hover:shadow-emerald-500/20",
      icon: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20",
      value: "text-emerald-400",
      gradient: "from-emerald-500/10 via-transparent to-transparent",
    },
    blue: {
      border: "border-blue-500/30 hover:border-blue-500/50",
      glow: "shadow-blue-500/10 hover:shadow-blue-500/20",
      icon: "bg-blue-500/15 text-blue-400 ring-blue-500/20",
      value: "text-blue-400",
      gradient: "from-blue-500/10 via-transparent to-transparent",
    },
    red: {
      border: "border-rose-500/30 hover:border-rose-500/50",
      glow: "shadow-rose-500/10 hover:shadow-rose-500/20",
      icon: "bg-rose-500/15 text-rose-400 ring-rose-500/20",
      value: "text-rose-400",
      gradient: "from-rose-500/10 via-transparent to-transparent",
    },
    purple: {
      border: "border-violet-500/30 hover:border-violet-500/50",
      glow: "shadow-violet-500/10 hover:shadow-violet-500/20",
      icon: "bg-violet-500/15 text-violet-400 ring-violet-500/20",
      value: "text-violet-400",
      gradient: "from-violet-500/10 via-transparent to-transparent",
    },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5",
        "bg-gradient-to-br from-card/95 via-card/80 to-card/60",
        "border-2 transition-all duration-500",
        "hover:shadow-2xl hover:-translate-y-1",
        "backdrop-blur-xl",
        colors.border,
        colors.glow
      )}
    >
      {/* Gradient overlay on hover */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        colors.gradient
      )} />
      
      {/* Glow effect */}
      <div className={cn(
        "absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl",
        colors.gradient
      )} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            {label}
          </span>
          <div className={cn(
            "p-2.5 rounded-xl ring-2 transition-all duration-300 group-hover:scale-110",
            colors.icon
          )}>
            <Icon className="w-4 h-4" />
          </div>
        </div>

        <div className={cn(
          "text-3xl md:text-4xl font-black tracking-tight mb-1",
          colors.value
        )}>
          {value}
        </div>

        {subtitle && (
          <p className="text-xs text-muted-foreground font-medium">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
};

export const HeroStatsSection = ({
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
}: HeroStatsSectionProps) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-3xl border border-border/30 bg-gradient-to-br from-background via-card/50 to-background"
    >
      {/* Animated background patterns */}
      <div className="absolute inset-0">
        {/* Primary gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-violet-500/5" />
        
        {/* Radial glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-radial from-primary/20 via-primary/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-gradient-radial from-violet-500/15 via-violet-500/5 to-transparent rounded-full blur-3xl" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
        
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay" 
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noise"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noise)"/%3E%3C/svg%3E")',
          }}
        />
      </div>

      <div className="relative z-10 p-6 md:p-8 lg:p-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
              Dashboard de Performance
            </h2>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              Análise completa de{" "}
              <span className="font-semibold text-foreground">
                {totalOperations.toLocaleString()}
              </span>{" "}
              operações
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Badge 
              variant="outline" 
              className="bg-background/60 backdrop-blur-sm border-border/50 px-4 py-2 text-sm font-medium hover:bg-background/80 transition-colors"
            >
              <TrendingUp className="w-4 h-4 mr-2 text-primary" />
              <span className="font-bold">{totalDays.toLocaleString()}</span>
              <span className="ml-1 text-muted-foreground">dias operados</span>
            </Badge>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          <MetricCard
            label="Resultado Total"
            value={formatCurrency(totalResult)}
            icon={DollarSign}
            color={totalResult >= 0 ? "green" : "red"}
            delay={0.2}
          />
          <MetricCard
            label="Taxa de Acerto"
            value={`${winRate.toFixed(1)}%`}
            subtitle={`${positiveDays}W / ${negativeDays}L`}
            icon={Target}
            color="blue"
            delay={0.3}
          />
          <MetricCard
            label="Payoff"
            value={payoff.toFixed(2)}
            subtitle="Ganho/Perda média"
            icon={Award}
            color={payoff >= 1 ? "green" : "red"}
            delay={0.4}
          />
          <MetricCard
            label="Consistência"
            value={`${monthlyConsistency.toFixed(1)}%`}
            subtitle={`${positiveMonths}+ / ${negativeMonths}-`}
            icon={Zap}
            color="purple"
            delay={0.5}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default HeroStatsSection;
