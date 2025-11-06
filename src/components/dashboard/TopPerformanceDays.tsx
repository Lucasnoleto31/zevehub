import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingDown, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    processTopDays();
  }, [operations]);

  const processTopDays = () => {
    // Agrupar por dia
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

    // Converter para array e ordenar
    const daysArray: DayPerformance[] = Array.from(dayMap.entries()).map(
      ([date, data]) => ({
        date,
        result: data.result,
        operations: data.count,
      })
    );

    // Top 5 melhores dias
    const best = [...daysArray]
      .sort((a, b) => b.result - a.result)
      .slice(0, 5);
    setBestDays(best);

    // Top 5 piores dias
    const worst = [...daysArray]
      .sort((a, b) => a.result - b.result)
      .slice(0, 5);
    setWorstDays(worst);
  };


  const DayCard = ({ day, rank, isBest }: { day: DayPerformance; rank: number; isBest: boolean }) => (
    <div
      className={`p-4 rounded-lg border ${
        rank === 1
          ? isBest
            ? "border-success bg-success/5"
            : "border-destructive bg-destructive/5"
          : "bg-card"
      } hover:bg-accent/50 transition-colors`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              rank === 1
                ? isBest
                  ? "bg-success text-success-foreground"
                  : "bg-destructive text-destructive-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {rank === 1 && isBest ? <Trophy className="w-4 h-4" /> : rank}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <p className="font-semibold">
                {format(new Date(day.date), "dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {day.operations} operação(ões)
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className={`text-2xl font-bold ${
              day.result >= 0 ? "text-success" : "text-destructive"
            }`}
          >
            {day.result >= 0 ? "+" : ""}
            {day.result.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
          <Badge variant={day.result >= 0 ? "default" : "destructive"}>
            {((day.result / day.operations) * 100).toFixed(1)}% por operação
          </Badge>
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Ranking de Performance
        </CardTitle>
        <CardDescription>
          Melhores e piores dias de trading
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="best" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="best" className="gap-2">
              <Trophy className="w-4 h-4" />
              Melhores Dias
            </TabsTrigger>
            <TabsTrigger value="worst" className="gap-2">
              <TrendingDown className="w-4 h-4" />
              Piores Dias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="best" className="space-y-3 mt-4">
            {bestDays.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado disponível
              </p>
            ) : (
              bestDays.map((day, index) => (
                <DayCard
                  key={day.date}
                  day={day}
                  rank={index + 1}
                  isBest={true}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="worst" className="space-y-3 mt-4">
            {worstDays.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum dado disponível
              </p>
            ) : (
              worstDays.map((day, index) => (
                <DayCard
                  key={day.date}
                  day={day}
                  rank={index + 1}
                  isBest={false}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TopPerformanceDays;
