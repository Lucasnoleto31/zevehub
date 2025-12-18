import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Bot, TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface StrategyStat {
  strategy: string;
  totalOps: number;
  totalResult: number;
  winRate: number;
  payoff: number;
  averageWin: number;
  averageLoss: number;
  maxDrawdown: number;
  positive: number;
  negative: number;
}

interface RobosStrategyCardsProps {
  strategyStats: StrategyStat[];
  filteredOperations: any[];
}

const StrategyCard = ({ stat, index }: { stat: StrategyStat; index: number }) => {
  const isPositive = stat.totalResult >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5 transition-all duration-500",
        "bg-gradient-to-br from-card via-card to-card/80",
        "border border-border/50 hover:border-primary/30",
        "hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
      )}
    >
      {/* Rank Badge */}
      <div className="absolute top-0 right-0 p-3">
        <Badge 
          variant={isPositive ? "default" : "destructive"} 
          className="font-mono text-xs"
        >
          #{index + 1}
        </Badge>
      </div>
      
      {/* Glow effect on hover */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        "bg-gradient-to-br from-primary/5 via-transparent to-transparent"
      )} />
      
      <div className="relative z-10">
        <h3 className="font-bold text-lg mb-4 pr-12 flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          {stat.strategy}
        </h3>
        
        <div className={cn(
          "text-3xl font-black mb-4 tracking-tight",
          isPositive ? "text-emerald-400" : "text-rose-400"
        )}>
          {isPositive ? '+' : ''}
          {stat.totalResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-xl bg-muted/30">
            <p className="text-muted-foreground text-xs mb-1">Win Rate</p>
            <p className={cn(
              "font-bold text-lg",
              stat.winRate >= 50 ? "text-emerald-400" : "text-rose-400"
            )}>
              {stat.winRate.toFixed(1)}%
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30">
            <p className="text-muted-foreground text-xs mb-1">Payoff</p>
            <p className={cn(
              "font-bold text-lg",
              stat.payoff >= 1 ? "text-emerald-400" : "text-rose-400"
            )}>
              {stat.payoff.toFixed(2)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30">
            <p className="text-muted-foreground text-xs mb-1">Operações</p>
            <p className="font-bold text-lg">{stat.totalOps}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/30">
            <p className="text-muted-foreground text-xs mb-1">W/L</p>
            <p className="font-bold text-lg">
              <span className="text-emerald-400">{stat.positive}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-rose-400">{stat.negative}</span>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const RobosStrategyCards = ({ strategyStats, filteredOperations }: RobosStrategyCardsProps) => {
  if (strategyStats.length <= 1) return null;

  // Calculate correlations
  const calculateCorrelations = () => {
    const strategiesByDate: Record<string, Record<string, number>> = {};
    
    filteredOperations.forEach((op) => {
      const dateKey = op.operation_date;
      if (!strategiesByDate[dateKey]) {
        strategiesByDate[dateKey] = {};
      }
      const strategyName = op.strategy || "Sem Estratégia";
      if (!strategiesByDate[dateKey][strategyName]) {
        strategiesByDate[dateKey][strategyName] = 0;
      }
      strategiesByDate[dateKey][strategyName] += op.result;
    });

    const strategies = strategyStats.map(s => s.strategy);
    const correlations: Array<{
      pair: string;
      correlation: number;
      diversification: string;
      recommendation: string;
    }> = [];

    for (let i = 0; i < strategies.length; i++) {
      for (let j = i + 1; j < strategies.length; j++) {
        const strat1 = strategies[i];
        const strat2 = strategies[j];

        let oppositeResults = 0;
        let totalDays = 0;

        Object.entries(strategiesByDate).forEach(([date, strategies]) => {
          const result1 = strategies[strat1];
          const result2 = strategies[strat2];

          if (result1 !== undefined && result2 !== undefined) {
            totalDays++;
            if ((result1 > 0 && result2 < 0) || (result1 < 0 && result2 > 0)) {
              oppositeResults++;
            }
          }
        });

        if (totalDays > 0) {
          const diversificationScore = (oppositeResults / totalDays) * 100;
          
          let diversification = "";
          let recommendation = "";

          if (diversificationScore > 60) {
            diversification = "Alta Complementaridade";
            recommendation = "Excelente combinação para diversificação";
          } else if (diversificationScore > 40) {
            diversification = "Moderada Complementaridade";
            recommendation = "Boa combinação, equilibra riscos";
          } else {
            diversification = "Baixa Complementaridade";
            recommendation = "Estratégias similares";
          }

          correlations.push({
            pair: `${strat1} + ${strat2}`,
            correlation: diversificationScore,
            diversification,
            recommendation,
          });
        }
      }
    }

    return correlations.sort((a, b) => b.correlation - a.correlation);
  };

  const correlations = calculateCorrelations();

  return (
    <div className="space-y-6">
      {/* Strategy Comparison Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/50 overflow-hidden bg-gradient-to-br from-card to-card/80">
          <CardHeader className="bg-gradient-to-r from-cyan-500/5 via-transparent to-transparent">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
                <Bot className="w-5 h-5" />
              </div>
              Comparativo de Estratégias
            </CardTitle>
            <CardDescription>
              Performance por estratégia ordenada por resultado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={strategyStats} layout="vertical">
                <XAxis 
                  type="number" 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  type="category" 
                  dataKey="strategy" 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
                  axisLine={false} 
                  tickLine={false} 
                  width={120} 
                />
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  contentStyle={{ 
                    borderRadius: "12px", 
                    border: "1px solid hsl(var(--border))", 
                    backgroundColor: "hsl(var(--card))" 
                  }}
                />
                <Bar 
                  dataKey="totalResult" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Strategy Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {strategyStats.slice(0, 6).map((stat, index) => (
          <StrategyCard key={stat.strategy} stat={stat} index={index} />
        ))}
      </div>

      {/* Strategy Correlation */}
      {correlations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border/50 overflow-hidden bg-gradient-to-br from-card to-card/80">
            <CardHeader className="bg-gradient-to-r from-violet-500/5 via-transparent to-transparent">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                Análise de Correlação
              </CardTitle>
              <CardDescription>
                Identifica estratégias que se complementam
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {correlations.slice(0, 4).map((corr) => (
                  <div 
                    key={corr.pair} 
                    className="p-4 rounded-xl border bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-sm">{corr.pair}</div>
                      <Badge variant="secondary" className="text-xs">
                        {corr.correlation.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="text-xs text-primary font-medium mb-1">
                      {corr.diversification}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {corr.recommendation}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default RobosStrategyCards;
