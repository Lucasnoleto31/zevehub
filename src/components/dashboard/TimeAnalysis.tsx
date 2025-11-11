import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Calendar, TrendingUp, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface TimeStats {
  hour: string;
  total_operations: number;
  wins: number;
  losses: number;
  total_result: number;
  win_rate: number;
  avg_result: number;
}

interface DayStats {
  day: string;
  total_operations: number;
  wins: number;
  losses: number;
  total_result: number;
  win_rate: number;
  avg_result: number;
}

const TimeAnalysis = ({ userId }: { userId: string }) => {
  const [hourlyStats, setHourlyStats] = useState<TimeStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DayStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeAnalysis();
  }, [userId]);

  const loadTimeAnalysis = async () => {
    try {
      const { data: operations, error } = await supabase
        .from("trading_operations")
        .select("operation_time, operation_date, result");

      if (error) throw error;

      if (operations) {
        // Análise por hora
        const hourlyData: { [key: string]: { ops: number; wins: number; total: number } } = {};
        
        operations.forEach((op) => {
          const hour = op.operation_time.split(":")[0];
          if (!hourlyData[hour]) {
            hourlyData[hour] = { ops: 0, wins: 0, total: 0 };
          }
          hourlyData[hour].ops += 1;
          hourlyData[hour].wins += op.result > 0 ? 1 : 0;
          hourlyData[hour].total += op.result;
        });

        const hourlyStatsArray: TimeStats[] = Object.entries(hourlyData).map(([hour, data]) => ({
          hour: `${hour}:00`,
          total_operations: data.ops,
          wins: data.wins,
          losses: data.ops - data.wins,
          total_result: data.total,
          win_rate: (data.wins / data.ops) * 100,
          avg_result: data.total / data.ops,
        })).sort((a, b) => a.hour.localeCompare(b.hour));

        setHourlyStats(hourlyStatsArray);

        // Análise por dia da semana
        const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
        const dailyData: { [key: string]: { ops: number; wins: number; total: number } } = {};

        operations.forEach((op) => {
          const date = new Date(op.operation_date);
          const dayOfWeek = dayNames[date.getDay()];
          
          if (!dailyData[dayOfWeek]) {
            dailyData[dayOfWeek] = { ops: 0, wins: 0, total: 0 };
          }
          dailyData[dayOfWeek].ops += 1;
          dailyData[dayOfWeek].wins += op.result > 0 ? 1 : 0;
          dailyData[dayOfWeek].total += op.result;
        });

        const dailyStatsArray: DayStats[] = dayNames
          .filter((day) => dailyData[day])
          .map((day) => ({
            day,
            total_operations: dailyData[day].ops,
            wins: dailyData[day].wins,
            losses: dailyData[day].ops - dailyData[day].wins,
            total_result: dailyData[day].total,
            win_rate: (dailyData[day].wins / dailyData[day].ops) * 100,
            avg_result: dailyData[day].total / dailyData[day].ops,
          }));

        setDailyStats(dailyStatsArray);
      }
    } catch (error) {
      console.error("Erro ao carregar análise temporal:", error);
    } finally {
      setLoading(false);
    }
  };

  const getBestTime = () => {
    if (hourlyStats.length === 0) return null;
    return hourlyStats.reduce((best, current) => 
      current.avg_result > best.avg_result ? current : best
    );
  };

  const getBestDay = () => {
    if (dailyStats.length === 0) return null;
    return dailyStats.reduce((best, current) => 
      current.avg_result > best.avg_result ? current : best
    );
  };

  const bestTime = getBestTime();
  const bestDay = getBestDay();

  if (loading) {
    return <Card className="animate-fade-in"><CardContent className="p-6">Carregando...</CardContent></Card>;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-foreground mb-2">
            {data.hour || data.day}
          </p>
          <p className="text-xs text-muted-foreground">
            Operações: <span className="font-medium text-foreground">{data.total_operations}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Win Rate: <span className="font-medium text-foreground">{data.win_rate.toFixed(1)}%</span>
          </p>
          <p className={`text-xs font-bold ${data.avg_result >= 0 ? 'text-success' : 'text-destructive'}`}>
            Média: R$ {data.avg_result >= 0 ? '+' : ''}{data.avg_result.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Melhores Períodos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card-strong">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Melhor Horário</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {bestTime ? (
              <>
                <div className="text-2xl font-bold text-primary">{bestTime.hour}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="default">Win Rate: {bestTime.win_rate.toFixed(1)}%</Badge>
                  <Badge variant="secondary" className={bestTime.avg_result >= 0 ? 'text-success' : 'text-destructive'}>
                    Média: R$ {bestTime.avg_result >= 0 ? '+' : ''}{bestTime.avg_result.toFixed(2)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {bestTime.total_operations} operações realizadas
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados suficientes</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card-strong">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Melhor Dia</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {bestDay ? (
              <>
                <div className="text-2xl font-bold text-primary">{bestDay.day}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="default">Win Rate: {bestDay.win_rate.toFixed(1)}%</Badge>
                  <Badge variant="secondary" className={bestDay.avg_result >= 0 ? 'text-success' : 'text-destructive'}>
                    Média: R$ {bestDay.avg_result >= 0 ? '+' : ''}{bestDay.avg_result.toFixed(2)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {bestDay.total_operations} operações realizadas
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados suficientes</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Análise por Horário */}
      <Card className="glass-card animate-chart-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Performance por Horário
          </CardTitle>
          <CardDescription>Resultado médio por hora do dia</CardDescription>
        </CardHeader>
        <CardContent className="animate-scale-in">
          {hourlyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyStats} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
                <XAxis 
                  dataKey="hour" 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg_result" radius={[8, 8, 0, 0]}>
                  {hourlyStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.avg_result >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>

      {/* Análise por Dia da Semana */}
      <Card className="glass-card animate-chart-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Performance por Dia da Semana
          </CardTitle>
          <CardDescription>Resultado médio por dia da semana</CardDescription>
        </CardHeader>
        <CardContent className="animate-scale-in">
          {dailyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyStats} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avg_result" radius={[8, 8, 0, 0]}>
                  {dailyStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.avg_result >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeAnalysis;
