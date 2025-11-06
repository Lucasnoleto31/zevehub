import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Target, Award, Calendar, Clock } from "lucide-react";

interface OperationsDashboardProps {
  userId: string;
}

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
}

interface Stats {
  totalOperations: number;
  positiveDays: number;
  negativeDays: number;
  winRate: number;
  totalResult: number;
  bestResult: number;
  worstResult: number;
  positiveStreak: number;
  negativeStreak: number;
  payoff: number;
  averageWin: number;
  averageLoss: number;
  positiveMonths: number;
  negativeMonths: number;
  monthlyConsistency: number;
  averageMonthlyResult: number;
}

const OperationsDashboard = ({ userId }: OperationsDashboardProps) => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalOperations: 0,
    positiveDays: 0,
    negativeDays: 0,
    winRate: 0,
    totalResult: 0,
    bestResult: 0,
    worstResult: 0,
    positiveStreak: 0,
    negativeStreak: 0,
    payoff: 0,
    averageWin: 0,
    averageLoss: 0,
    positiveMonths: 0,
    negativeMonths: 0,
    monthlyConsistency: 0,
    averageMonthlyResult: 0,
  });
  const [performanceCurve, setPerformanceCurve] = useState<any[]>([]);
  const [weekdayStats, setWeekdayStats] = useState<any[]>([]);
  const [monthStats, setMonthStats] = useState<any[]>([]);
  const [hourStats, setHourStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOperations();
  }, [userId]);

  const loadOperations = async () => {
    try {
      // Buscar todas as operações sem limite
      let allOperations: Operation[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("trading_operations")
          .select("operation_date, operation_time, result")
          .eq("user_id", userId)
          .order("operation_date", { ascending: true })
          .range(from, from + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allOperations = [...allOperations, ...data];
          from += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      console.log(`Carregadas ${allOperations.length} operações`);
      setOperations(allOperations);
      calculateStats(allOperations);
      generateCharts(allOperations);
    } catch (error) {
      console.error("Erro ao carregar operações:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ops: Operation[]) => {
    if (ops.length === 0) {
      setStats({
        totalOperations: 0,
        positiveDays: 0,
        negativeDays: 0,
        winRate: 0,
        totalResult: 0,
        bestResult: 0,
        worstResult: 0,
        positiveStreak: 0,
        negativeStreak: 0,
        payoff: 0,
        averageWin: 0,
        averageLoss: 0,
        positiveMonths: 0,
        negativeMonths: 0,
        monthlyConsistency: 0,
        averageMonthlyResult: 0,
      });
      return;
    }

    // Agrupar por dia
    const dailyResults = ops.reduce((acc, op) => {
      const date = op.operation_date;
      if (!acc[date]) acc[date] = 0;
      acc[date] += parseFloat(op.result.toString());
      return acc;
    }, {} as Record<string, number>);

    const dailyResultsArray = Object.values(dailyResults);
    const positiveOps = ops.filter((op) => parseFloat(op.result.toString()) > 0);
    const negativeOps = ops.filter((op) => parseFloat(op.result.toString()) < 0);

    const totalResult = ops.reduce((sum, op) => sum + parseFloat(op.result.toString()), 0);
    const positiveDays = dailyResultsArray.filter((r) => r > 0).length;
    const negativeDays = dailyResultsArray.filter((r) => r < 0).length;
    const winRate = (positiveDays / dailyResultsArray.length) * 100;

    const averageWin = positiveOps.length > 0
      ? positiveOps.reduce((sum, op) => sum + parseFloat(op.result.toString()), 0) / positiveOps.length
      : 0;

    const averageLoss = negativeOps.length > 0
      ? Math.abs(negativeOps.reduce((sum, op) => sum + parseFloat(op.result.toString()), 0) / negativeOps.length)
      : 0;

    const payoff = averageLoss > 0 ? averageWin / averageLoss : 0;

    // Calcular consistência mensal
    const monthlyResults = ops.reduce((acc, op) => {
      const date = new Date(op.operation_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) acc[monthKey] = 0;
      acc[monthKey] += parseFloat(op.result.toString());
      return acc;
    }, {} as Record<string, number>);

    const monthlyResultsArray = Object.values(monthlyResults);
    const positiveMonths = monthlyResultsArray.filter(r => r > 0).length;
    const negativeMonths = monthlyResultsArray.filter(r => r < 0).length;
    const monthlyConsistency = monthlyResultsArray.length > 0 
      ? (positiveMonths / monthlyResultsArray.length) * 100 
      : 0;
    const averageMonthlyResult = monthlyResultsArray.length > 0
      ? monthlyResultsArray.reduce((sum, r) => sum + r, 0) / monthlyResultsArray.length
      : 0;

    // Calcular sequências
    let currentStreak = 0;
    let maxPositiveStreak = 0;
    let maxNegativeStreak = 0;
    let currentPositiveStreak = 0;
    let currentNegativeStreak = 0;

    Object.values(dailyResults).forEach((result) => {
      if (result > 0) {
        currentPositiveStreak++;
        currentNegativeStreak = 0;
        maxPositiveStreak = Math.max(maxPositiveStreak, currentPositiveStreak);
      } else if (result < 0) {
        currentNegativeStreak++;
        currentPositiveStreak = 0;
        maxNegativeStreak = Math.max(maxNegativeStreak, currentNegativeStreak);
      }
    });

    setStats({
      totalOperations: ops.length,
      positiveDays,
      negativeDays,
      winRate,
      totalResult,
      bestResult: Math.max(...ops.map((op) => parseFloat(op.result.toString()))),
      worstResult: Math.min(...ops.map((op) => parseFloat(op.result.toString()))),
      positiveStreak: maxPositiveStreak,
      negativeStreak: maxNegativeStreak,
      payoff,
      averageWin,
      averageLoss,
      positiveMonths,
      negativeMonths,
      monthlyConsistency,
      averageMonthlyResult,
    });
  };

  const generateCharts = (ops: Operation[]) => {
    // Curva de performance (acumulado por dia)
    const dailyResults = ops.reduce((acc, op) => {
      const date = op.operation_date;
      if (!acc[date]) acc[date] = 0;
      acc[date] += parseFloat(op.result.toString());
      return acc;
    }, {} as Record<string, number>);

    let accumulated = 0;
    const curve = Object.entries(dailyResults)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, result]) => {
        accumulated += result;
        return {
          date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          value: accumulated,
        };
      });
    setPerformanceCurve(curve);

    // Melhores dias da semana (Segunda a Sexta apenas)
    const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex"];
    const weekdayData = ops.reduce((acc, op) => {
      const day = new Date(op.operation_date).getDay();
      // Ignorar domingo (0) e sábado (6)
      if (day === 0 || day === 6) return acc;
      
      const dayName = weekdays[day - 1]; // -1 porque segunda é 1, não 0
      if (!acc[dayName]) acc[dayName] = 0;
      acc[dayName] += parseFloat(op.result.toString());
      return acc;
    }, {} as Record<string, number>);

    setWeekdayStats(
      weekdays.map((day) => ({
        day,
        result: weekdayData[day] || 0,
      }))
    );

    // Performance mensal (agrupado por mês, somando todos os anos)
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const monthData = ops.reduce((acc, op) => {
      const date = new Date(op.operation_date);
      const monthIndex = date.getMonth();
      const monthName = monthNames[monthIndex];
      
      if (!acc[monthName]) acc[monthName] = 0;
      acc[monthName] += parseFloat(op.result.toString());
      return acc;
    }, {} as Record<string, number>);

    setMonthStats(
      monthNames.map((month) => ({
        month,
        result: monthData[month] || 0,
      }))
    );

    // Melhores horários
    const hourData = ops.reduce((acc, op) => {
      const hour = op.operation_time.split(":")[0];
      if (!acc[hour]) acc[hour] = 0;
      acc[hour] += parseFloat(op.result.toString());
      return acc;
    }, {} as Record<string, number>);

    setHourStats(
      Object.entries(hourData)
        .map(([hour, result]) => ({
          hour: `${hour}h`,
          result,
        }))
        .sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (operations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-muted-foreground">
              Nenhuma operação registrada ainda. Comece a registrar suas operações para visualizar estatísticas.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado Acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalResult >= 0 ? "text-success" : "text-destructive"}`}>
              {stats.totalResult >= 0 ? "+" : ""}
              {stats.totalResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              Taxa de Acerto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.positiveDays} dias positivos / {stats.negativeDays} negativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4" />
              Payoff
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.payoff.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ganho médio / Perda média
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consistência Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyConsistency.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.positiveMonths} meses positivos / {stats.negativeMonths} negativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sequências</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm text-muted-foreground">Positiva</span>
                </div>
                <span className="text-xl font-bold text-success">{stats.positiveStreak} dias</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-muted-foreground">Negativa</span>
                </div>
                <span className="text-xl font-bold text-destructive">{stats.negativeStreak} dias</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Curve */}
      <Card>
        <CardHeader>
          <CardTitle>Curva de Performance</CardTitle>
          <CardDescription>Evolução do resultado acumulado ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceCurve}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance Mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Performance por Mês do Ano</CardTitle>
          <CardDescription>Soma de todos os resultados de cada mês (ex: todos os janeiros somados)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
              <Bar dataKey="result" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekday Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Melhores Dias da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weekdayStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                <Bar dataKey="result" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hour Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Melhores Horários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                <Bar dataKey="result" fill="hsl(var(--success))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Melhor Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-success">
              +{stats.bestResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pior Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-destructive">
              {stats.worstResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Média Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${stats.averageMonthlyResult >= 0 ? "text-success" : "text-destructive"}`}>
              {stats.averageMonthlyResult >= 0 ? "+" : ""}
              {stats.averageMonthlyResult.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Operações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.totalOperations}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OperationsDashboard;
