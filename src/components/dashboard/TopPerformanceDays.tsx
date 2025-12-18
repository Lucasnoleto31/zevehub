import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingDown, Calendar, Crown, Medal, Award } from "lucide-react";

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

  useEffect(() => {
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
      ([date, data]) => ({ date, result: data.result, operations: data.count })
    );

    setBestDays([...daysArray].sort((a, b) => b.result - a.result).slice(0, 5));
    setWorstDays([...daysArray].sort((a, b) => a.result - b.result).slice(0, 5));
  }, [operations]);

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-");
    const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
    return `${d} de ${months[parseInt(m, 10) - 1]} de ${y}`;
  };

  const formatCurrency = (value: number) => 
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getRankIcon = (rank: number, isBest: boolean) => {
    if (!isBest) return null;
    if (rank === 1) return <Crown className="w-4 h-4" />;
    if (rank === 2) return <Medal className="w-4 h-4" />;
    if (rank === 3) return <Award className="w-4 h-4" />;
    return null;
  };

  const getRankStyle = (rank: number, isBest: boolean) => {
    if (isBest && rank === 1) return "bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/20";
    if (isBest && rank === 2) return "bg-gradient-to-r from-slate-400 to-slate-300 text-black";
    if (isBest && rank === 3) return "bg-gradient-to-r from-amber-700 to-amber-600 text-white";
    if (!isBest && rank === 1) return "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/20";
    return "bg-muted text-muted-foreground";
  };

  const getCardStyle = (rank: number, isBest: boolean) => {
    if (rank === 1) {
      return isBest 
        ? "border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.1)]" 
        : "border-red-500/40 bg-gradient-to-r from-red-500/10 to-transparent shadow-[0_0_20px_rgba(239,68,68,0.1)]";
    }
    return "border-border/50 bg-card/50";
  };

  const DayCard = ({ day, rank, isBest }: { day: DayPerformance; rank: number; isBest: boolean }) => {
    const avgPerOp = day.result / day.operations;
    return (
      <div className={`p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] ${getCardStyle(rank, isBest)}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${getRankStyle(rank, isBest)}`}>
              {getRankIcon(rank, isBest) || rank}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold">{formatDate(day.date)}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {day.operations} operação{day.operations !== 1 ? "ões" : ""}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${day.result >= 0 ? "text-success" : "text-destructive"}`}>
              {day.result >= 0 ? "+" : ""}{formatCurrency(day.result)}
            </p>
            <Badge className={day.result >= 0 ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
              {avgPerOp >= 0 ? "+" : ""}{formatCurrency(avgPerOp)}/op
            </Badge>
          </div>
        </div>
      </div>
    );
  };

  const totalBest = bestDays.reduce((acc, d) => acc + d.result, 0);
  const totalWorst = worstDays.reduce((acc, d) => acc + d.result, 0);

  return (
    <Card className="bg-gradient-to-br from-card via-card to-accent/5 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          Ranking de Performance
        </CardTitle>
        <CardDescription>Melhores e piores dias de trading</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="best" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/30 p-1 rounded-xl">
            <TabsTrigger value="best" className="gap-2 rounded-lg data-[state=active]:bg-success/20 data-[state=active]:text-success">
              <Trophy className="w-4 h-4" /> Melhores Dias
            </TabsTrigger>
            <TabsTrigger value="worst" className="gap-2 rounded-lg data-[state=active]:bg-destructive/20 data-[state=active]:text-destructive">
              <TrendingDown className="w-4 h-4" /> Piores Dias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="best" className="space-y-3 mt-0">
            {bestDays.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
            ) : (
              <>
                {bestDays.map((day, i) => <DayCard key={day.date} day={day} rank={i + 1} isBest />)}
                <div className="p-4 rounded-xl bg-success/10 border border-success/20 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Top 5</span>
                  <span className="text-xl font-bold text-success">+{formatCurrency(totalBest)}</span>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="worst" className="space-y-3 mt-0">
            {worstDays.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum dado disponível</p>
            ) : (
              <>
                {worstDays.map((day, i) => <DayCard key={day.date} day={day} rank={i + 1} isBest={false} />)}
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Top 5</span>
                  <span className="text-xl font-bold text-destructive">{formatCurrency(totalWorst)}</span>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TopPerformanceDays;
