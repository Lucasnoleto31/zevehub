import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { CalendarDays } from "lucide-react";

interface Operation {
  operation_date: string;
  result: number;
}

interface MonthlyComparisonChartProps {
  operations: Operation[];
  loading?: boolean;
}

const MonthlyComparisonChart = ({ operations, loading }: MonthlyComparisonChartProps) => {
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, { gains: number; losses: number; total: number; count: number }>();

    operations.forEach((op) => {
      const [year, month] = op.operation_date.split("-");
      const key = `${year}-${month}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, { gains: 0, losses: 0, total: 0, count: 0 });
      }

      const current = monthMap.get(key)!;
      current.total += op.result;
      current.count += 1;

      if (op.result > 0) {
        current.gains += op.result;
      } else {
        current.losses += Math.abs(op.result);
      }
    });

    // Convert to array and sort by date
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12) // Last 12 months
      .map(([key, data]) => {
        const [year, month] = key.split("-");
        return {
          month: `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`,
          ganhos: data.gains,
          perdas: -data.losses,
          resultado: data.total,
          operacoes: data.count,
        };
      });
  }, [operations]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Comparativo Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          Comparativo Mensal
        </CardTitle>
        <CardDescription>
          Ganhos vs Perdas por mês (últimos 12 meses)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number, name: string) => [
                    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    name === 'ganhos' ? 'Ganhos' : name === 'perdas' ? 'Perdas' : 'Resultado'
                  ]}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Legend 
                  formatter={(value) => 
                    value === 'ganhos' ? 'Ganhos' : value === 'perdas' ? 'Perdas' : 'Resultado'
                  }
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Bar 
                  dataKey="ganhos" 
                  fill="hsl(var(--success))" 
                  radius={[4, 4, 0, 0]}
                  name="ganhos"
                />
                <Bar 
                  dataKey="perdas" 
                  fill="hsl(var(--destructive))" 
                  radius={[4, 4, 0, 0]}
                  name="perdas"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyComparisonChart;
