import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Target, Award, Activity, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface EnhancedStatsCardsProps {
  totalTrades: number;
  winRate: number;
  profitTotal: number;
  averagePerTrade: number;
  bestTrade?: number;
  worstTrade?: number;
  currentStreak?: number;
}

export const EnhancedStatsCards = ({ 
  totalTrades, 
  winRate, 
  profitTotal, 
  averagePerTrade,
  bestTrade = 0,
  worstTrade = 0,
  currentStreak = 0
}: EnhancedStatsCardsProps) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const cards = [
    {
      id: "total",
      title: "Total de Operações",
      value: totalTrades.toString(),
      subtitle: "operações registradas",
      icon: Target,
      gradient: "from-blue-500 to-cyan-500",
      iconColor: "text-blue-500",
    },
    {
      id: "winrate",
      title: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      subtitle: winRate >= 50 ? "acima da média" : "abaixo da média",
      icon: Award,
      gradient: winRate >= 50 ? "from-green-500 to-emerald-500" : "from-amber-500 to-orange-500",
      iconColor: winRate >= 50 ? "text-green-500" : "text-amber-500",
    },
    {
      id: "profit",
      title: "Lucro Total",
      value: formatCurrency(profitTotal),
      subtitle: "resultado acumulado",
      icon: profitTotal >= 0 ? TrendingUp : TrendingDown,
      gradient: profitTotal >= 0 ? "from-green-500 to-emerald-500" : "from-red-500 to-rose-500",
      iconColor: profitTotal >= 0 ? "text-green-500" : "text-red-500",
    },
    {
      id: "average",
      title: "Média por Trade",
      value: formatCurrency(averagePerTrade),
      subtitle: "média de resultado",
      icon: Activity,
      gradient: averagePerTrade >= 0 ? "from-indigo-500 to-purple-500" : "from-orange-500 to-red-500",
      iconColor: averagePerTrade >= 0 ? "text-indigo-500" : "text-orange-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              <CardContent className="pt-6 relative">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {card.title}
                    </p>
                    <h3 className="text-2xl font-bold tracking-tight">
                      {card.value}
                    </h3>
                  </div>
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${card.gradient} bg-opacity-10`}>
                    <Icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {card.subtitle}
                </p>

                {/* Progress bar for win rate */}
                {card.id === "winrate" && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full bg-gradient-to-r ${card.gradient}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${winRate}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
