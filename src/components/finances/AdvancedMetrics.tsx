import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction } from "@/pages/PersonalFinances";
import { TrendingUp, TrendingDown, Target, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface AdvancedMetricsProps {
  transactions: Transaction[];
}

export const AdvancedMetrics = ({ transactions }: AdvancedMetricsProps) => {
  const monthlyComparison = useMemo(() => {
    const monthlyData: { [key: string]: { income: number; expense: number } } = {};

    transactions.forEach((t) => {
      const date = new Date(t.transaction_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expense: 0 };
      }

      if (t.type === "income") {
        monthlyData[monthKey].income += Number(t.amount);
      } else {
        monthlyData[monthKey].expense += Number(t.amount);
      }
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
        receitas: data.income,
        despesas: data.expense,
        saldo: data.income - data.expense,
      }));
  }, [transactions]);

  const predictions = useMemo(() => {
    if (monthlyComparison.length < 3) return null;

    const recentMonths = monthlyComparison.slice(-3);
    const avgIncome = recentMonths.reduce((sum, m) => sum + m.receitas, 0) / recentMonths.length;
    const avgExpense = recentMonths.reduce((sum, m) => sum + m.despesas, 0) / recentMonths.length;
    const avgBalance = avgIncome - avgExpense;

    const trend = recentMonths.length >= 2
      ? recentMonths[recentMonths.length - 1].saldo - recentMonths[0].saldo
      : 0;

    return {
      avgIncome,
      avgExpense,
      avgBalance,
      trend,
      nextMonthPrediction: avgBalance + (trend / recentMonths.length),
    };
  }, [monthlyComparison]);

  const categoryAnalysis = useMemo(() => {
    const categoryTotals: { [key: string]: number } = {};
    
    transactions
      .filter(t => t.type === "expense")
      .forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
      });

    return Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount,
      }));
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Comparativo Mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyComparison}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
              />
              <Line 
                type="monotone" 
                dataKey="receitas" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={2}
                name="Receitas"
              />
              <Line 
                type="monotone" 
                dataKey="despesas" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={2}
                name="Despesas"
              />
              <Line 
                type="monotone" 
                dataKey="saldo" 
                stroke="hsl(var(--chart-3))" 
                strokeWidth={2}
                name="Saldo"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Previsões */}
      {predictions && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Média de Receitas</p>
                  <p className="text-2xl font-bold text-primary">
                    R$ {predictions.avgIncome.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Média de Despesas</p>
                  <p className="text-2xl font-bold text-destructive">
                    R$ {predictions.avgExpense.toFixed(2)}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tendência</p>
                  <p className={`text-2xl font-bold ${predictions.trend >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {predictions.trend >= 0 ? '+' : ''}R$ {predictions.trend.toFixed(2)}
                  </p>
                </div>
                <Target className={`h-8 w-8 ${predictions.trend >= 0 ? 'text-primary' : 'text-destructive'}`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Previsão Próximo Mês</p>
                  <p className={`text-2xl font-bold ${predictions.nextMonthPrediction >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    R$ {predictions.nextMonthPrediction.toFixed(2)}
                  </p>
                </div>
                <AlertCircle className={`h-8 w-8 ${predictions.nextMonthPrediction >= 0 ? 'text-primary' : 'text-destructive'}`} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top 5 Categorias de Despesas */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Categorias de Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryAnalysis}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="category" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
              />
              <Bar dataKey="amount" fill="hsl(var(--chart-2))" name="Valor Total" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
