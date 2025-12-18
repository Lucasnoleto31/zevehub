import { Card, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Target, 
  Flame,
  Trophy,
  AlertTriangle
} from "lucide-react";
import { motion } from "framer-motion";

interface QuickMetricsCardsProps {
  bestTrade: number;
  worstTrade: number;
  currentStreak: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  loading?: boolean;
}

export const QuickMetricsCards = ({
  bestTrade,
  worstTrade,
  currentStreak,
  profitFactor,
  avgWin,
  avgLoss,
  loading,
}: QuickMetricsCardsProps) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-4">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: "Melhor Trade",
      value: formatCurrency(bestTrade),
      icon: Trophy,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
    },
    {
      title: "Pior Trade",
      value: formatCurrency(worstTrade),
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
    },
    {
      title: "Sequência",
      value: currentStreak > 0 ? `${currentStreak} wins` : currentStreak < 0 ? `${Math.abs(currentStreak)} losses` : "0",
      icon: Flame,
      color: currentStreak >= 0 ? "text-orange-500" : "text-blue-500",
      bgColor: currentStreak >= 0 ? "bg-orange-500/10" : "bg-blue-500/10",
      borderColor: currentStreak >= 0 ? "border-orange-500/20" : "border-blue-500/20",
    },
    {
      title: "Profit Factor",
      value: profitFactor.toFixed(2),
      icon: Target,
      color: profitFactor >= 1 ? "text-green-500" : "text-red-500",
      bgColor: profitFactor >= 1 ? "bg-green-500/10" : "bg-red-500/10",
      borderColor: profitFactor >= 1 ? "border-green-500/20" : "border-red-500/20",
    },
    {
      title: "Média Gain",
      value: formatCurrency(avgWin),
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
    },
    {
      title: "Média Loss",
      value: formatCurrency(Math.abs(avgLoss)),
      icon: TrendingDown,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={`border-2 ${metric.borderColor} hover:shadow-lg transition-all duration-300 group cursor-pointer`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${metric.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-4 h-4 ${metric.color}`} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{metric.title}</p>
                <p className={`text-lg font-bold ${metric.color}`}>{metric.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
