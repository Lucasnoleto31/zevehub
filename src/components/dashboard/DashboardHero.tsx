import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  Award,
  Zap,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardHeroProps {
  userName: string;
  userEmail: string;
  avatarUrl?: string;
  roles: string[];
  stats: {
    totalOperations: number;
    totalProfit: number;
    winRate: number;
    averageResult: number;
  };
  advancedMetrics: {
    profitFactor: number;
    currentStreak: number;
  };
}

const StatBadge = ({ 
  label, 
  value, 
  trend,
  icon: Icon
}: { 
  label: string; 
  value: string; 
  trend?: "up" | "down" | "neutral";
  icon: React.ElementType;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl",
      "bg-card/60 backdrop-blur-md border border-border/40",
      "hover:border-primary/30 hover:bg-card/80 transition-all duration-300"
    )}
  >
    <div className={cn(
      "p-2 rounded-lg",
      trend === "up" && "bg-emerald-500/15 text-emerald-400",
      trend === "down" && "bg-rose-500/15 text-rose-400",
      !trend && "bg-primary/15 text-primary"
    )}>
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className={cn(
        "text-sm font-bold",
        trend === "up" && "text-emerald-400",
        trend === "down" && "text-rose-400",
        !trend && "text-foreground"
      )}>
        {value}
      </p>
    </div>
  </motion.div>
);

export const DashboardHero = ({
  userName,
  userEmail,
  avatarUrl,
  roles,
  stats,
  advancedMetrics,
}: DashboardHeroProps) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative overflow-hidden rounded-3xl border border-border/30"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-card/80 to-violet-500/5" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-radial from-primary/20 via-transparent to-transparent rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-radial from-violet-500/15 via-transparent to-transparent rounded-full blur-3xl" />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px'
        }}
      />

      <div className="relative z-10 p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* User Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-5"
          >
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-primary/20 shadow-2xl ring-4 ring-background">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-2xl font-bold">
                  {userName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 border-2 border-background">
                <Activity className="w-3 h-3 text-white" />
              </div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                {getGreeting()},
              </p>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                {userName || "Trader"}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="bg-background/50 text-xs">
                  {userEmail}
                </Badge>
                {roles.map((role) => (
                  <Badge 
                    key={role} 
                    className="capitalize text-xs bg-primary/15 text-primary border-primary/20 hover:bg-primary/25"
                  >
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            <StatBadge
              label="Resultado"
              value={formatCurrency(stats.totalProfit)}
              trend={stats.totalProfit >= 0 ? "up" : "down"}
              icon={stats.totalProfit >= 0 ? ArrowUpRight : ArrowDownRight}
            />
            <StatBadge
              label="Taxa Acerto"
              value={`${stats.winRate.toFixed(1)}%`}
              trend={stats.winRate >= 50 ? "up" : "down"}
              icon={Target}
            />
            <StatBadge
              label="Profit Factor"
              value={advancedMetrics.profitFactor.toFixed(2)}
              trend={advancedMetrics.profitFactor >= 1 ? "up" : "down"}
              icon={Award}
            />
            <StatBadge
              label="Sequência"
              value={advancedMetrics.currentStreak > 0 
                ? `${advancedMetrics.currentStreak}W` 
                : advancedMetrics.currentStreak < 0 
                  ? `${Math.abs(advancedMetrics.currentStreak)}L`
                  : "0"
              }
              trend={advancedMetrics.currentStreak > 0 ? "up" : advancedMetrics.currentStreak < 0 ? "down" : "neutral"}
              icon={Zap}
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardHero;
