import { useEffect, useState } from "react"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingDown, Calendar, Crown, Medal, Award, Flame, Skull } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Operation {
  operation_date: string;
  result: number;
}

interface DayPerformance {
  date: string;
  result: number;
  operations: number;
}

interface TopPerformanceDaysProps {
  operations: Operation[];
}

const TopPerformanceDays = ({ operations }: TopPerformanceDaysProps) => {
  const [bestDays, setBestDays] = useState<DayPerformance[]>([]);
  const [worstDays, setWorstDays] = useState<DayPerformance[]>([]);
  const [activeTab, setActiveTab] = useState("best");

  useEffect(() => {
    processTopDays();
  }, [operations]);

  const processTopDays = () => {
    const dayMap = new Map<string, { result: number; count: number }>();

    operations.forEach((op) => {
      const date = op.operation_date;

      if (!dayMap.has(date)) {
        dayMap.set(date, { result: 0, count: 0 });
      }

      const current = dayMap.get(date)!;
      current.result += op.result;
      current.count += 1;
    });

    const daysArray: DayPerformance[] = Array.from(dayMap.entries()).map(
      ([date, data]) => ({
        date,
        result: data.result,
        operations: data.count,
      })
    );

    const best = [...daysArray]
      .sort((a, b) => b.result - a.result)
      .slice(0, 5);
    setBestDays(best);

    const worst = [...daysArray]
      .sort((a, b) => a.result - b.result)
      .slice(0, 5);
    setWorstDays(worst);
  };

  const getRankIcon = (rank: number, isBest: boolean) => {
    if (isBest) {
      switch (rank) {
        case 1:
          return <Crown className="w-5 h-5" />;
        case 2:
          return <Medal className="w-4 h-4" />;
        case 3:
          return <Award className="w-4 h-4" />;
        default:
          return <Flame className="w-4 h-4" />;
      }
    } else {
      return rank === 1 ? <Skull className="w-4 h-4" /> : null;
    }
  };

  const getRankStyles = (rank: number, isBest: boolean) => {
    if (isBest) {
      switch (rank) {
        case 1:
          return {
            badge: "bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/30",
            border: "border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent",
            glow: "shadow-[0_0_30px_rgba(245,158,11,0.15)]"
          };
        case 2:
          return {
            badge: "bg-gradient-to-r from-slate-400 to-slate-300 text-black",
            border: "border-slate-400/30 bg-gradient-to-br from-slate-400/5 via-transparent to-transparent",
            glow: ""
          };
        case 3:
          return {
            badge: "bg-gradient-to-r from-amber-700 to-amber-600 text-white",
            border: "border-amber-700/30 bg-gradient-to-br from-amber-700/5 via-transparent to-transparent",
            glow: ""
          };
        default:
          return {
            badge: "bg-muted text-muted-foreground",
            border: "border-border/50 bg-card/50",
            glow: ""
          };
      }
    } else {
      switch (rank) {
        case 1:
          return {
            badge: "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/30",
            border: "border-red-500/50 bg-gradient-to-br from-red-500/10 via-transparent to-transparent",
            glow: "shadow-[0_0_30px_rgba(239,68,68,0.15)]"
          };
        default:
          return {
            badge: "bg-muted text-muted-foreground",
            border: "border-border/50 bg-card/50",
            glow: ""
          };
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return `${d} de ${months[parseInt(m, 10) - 1]} de ${y}`;
  };

  const DayCard = ({ day, rank, isBest }: { day: DayPerformance; rank: number; isBest: boolean }) => {
    const styles = getRankStyles(rank, isBest);
    const avgPerOp = day.result / day.operations;
    
    return (
      <motion.div
        initial={{ opacity: 0, x: isBest ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: rank * 0.1 }}
        whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
        className={`relative p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:border-primary/30 ${styles.border} ${styles.glow}`}
      >
        {/* Rank Badge */}
        <div className="flex items-center gap-4">
          <div className={`relative flex items-center justify-center w-12 h-12 rounded-xl ${styles.badge} font-bold text-lg`}>
            {getRankIcon(rank, isBest) || rank}
            {rank === 1 && isBest && (
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="text-lg">✨</span>
              </motion.div>
            )}
          </div>

          {/* Date Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <p className="font-semibold text-foreground truncate">
                {formatDate(day.date)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs bg-muted/50">
                {day.operations} operação{day.operations !== 1 ? 'ões' : ''}
              </Badge>
              <Badge 
                variant="outline" 
                className={`text-xs ${avgPerOp >= 0 ? 'border-success/30 text-success' : 'border-destructive/30 text-destructive'}`}
              >
                Média: {avgPerOp.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </Badge>
            </div>
          </div>

          {/* Result */}
          <div className="text-right">
            <motion.p
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={`text-2xl md:text-3xl font-bold tracking-tight ${
                day.result >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {day.result >= 0 ? "+" : ""}
              {day.result.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </motion.p>
            <Badge 
              className={`mt-1 ${
                day.result >= 0 
                  ? "bg-success/20 text-success border-success/30 hover:bg-success/30" 
                  : "bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30"
              }`}
            >
              {avgPerOp >= 0 ? "+" : ""}{avgPerOp.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/op
            </Badge>
          </div>
        </div>

        {/* Progress Bar (visual indicator of relative performance) */}
        {rank === 1 && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1, delay: 0.5 }}
                className={`h-full rounded-full ${
                  isBest 
                    ? "bg-gradient-to-r from-amber-500 to-success" 
                    : "bg-gradient-to-r from-destructive to-red-400"
                }`}
              />
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const totalBest = bestDays.reduce((acc, d) => acc + d.result, 0);
  const totalWorst = worstDays.reduce((acc, d) => acc + d.result, 0);

  return (
    <Card className="bg-gradient-to-br from-card via-card to-accent/5 border-border/50 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              Ranking de Performance
            </CardTitle>
            <CardDescription className="mt-1">
              Melhores e piores dias de trading
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/30 p-1 rounded-xl">
            <TabsTrigger 
              value="best" 
              className="gap-2 rounded-lg data-[state=active]:bg-success/20 data-[state=active]:text-success data-[state=active]:shadow-sm transition-all"
            >
              <Trophy className="w-4 h-4" />
              Melhores Dias
            </TabsTrigger>
            <TabsTrigger 
              value="worst" 
              className="gap-2 rounded-lg data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive data-[state=active]:shadow-sm transition-all"
            >
              <TrendingDown className="w-4 h-4" />
              Piores Dias
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="best" className="space-y-3 mt-0">
              {bestDays.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum dado disponível</p>
                </div>
              ) : (
                <>
                  {bestDays.map((day, index) => (
                    <DayCard
                      key={day.date}
                      day={day}
                      rank={index + 1}
                      isBest={true}
                    />
                  ))}
                  
                  {/* Summary */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 p-4 rounded-xl bg-gradient-to-r from-success/10 to-transparent border border-success/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total dos Top 5 dias</span>
                      <span className="text-xl font-bold text-success">
                        +{totalBest.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  </motion.div>
                </>
              )}
            </TabsContent>

            <TabsContent value="worst" className="space-y-3 mt-0">
              {worstDays.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum dado disponível</p>
                </div>
              ) : (
                <>
                  {worstDays.map((day, index) => (
                    <DayCard
                      key={day.date}
                      day={day}
                      rank={index + 1}
                      isBest={false}
                    />
                  ))}
                  
                  {/* Summary */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-4 p-4 rounded-xl bg-gradient-to-r from-destructive/10 to-transparent border border-destructive/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total dos Top 5 piores dias</span>
                      <span className="text-xl font-bold text-destructive">
                        {totalWorst.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  </motion.div>
                </>
              )}
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TopPerformanceDays;
