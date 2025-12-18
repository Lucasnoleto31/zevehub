import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Operation {
  operation_date: string;
  result: number;
}

interface PerformanceByDayChartProps {
  operations: Operation[];
  loading?: boolean;
}

export const PerformanceByDayChart = ({ operations, loading }: PerformanceByDayChartProps) => {
  if (loading) {
    return (
      <Card className="border-2 animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="h-[280px] bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dayData: { [key: number]: { total: number; count: number } } = {};

  operations.forEach((op) => {
    const [year, month, day] = op.operation_date.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    
    if (!dayData[dayOfWeek]) {
      dayData[dayOfWeek] = { total: 0, count: 0 };
    }
    dayData[dayOfWeek].total += op.result || 0;
    dayData[dayOfWeek].count += 1;
  });

  const chartData = dayNames.map((name, index) => ({
    day: name,
    total: dayData[index]?.total || 0,
    count: dayData[index]?.count || 0,
    avg: dayData[index] ? dayData[index].total / dayData[index].count : 0,
  }));

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border-2 border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{data.day}</p>
          <p className={`text-sm ${data.total >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            Total: {formatCurrency(data.total)}
          </p>
          <p className="text-xs text-muted-foreground">
            Operações: {data.count}
          </p>
        </div>
      );
    }
    return null;
  };

  if (operations.length === 0) {
    return (
      <Card className="border-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-primary" />
            Performance por Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            Sem dados para exibir
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="w-5 h-5 text-primary" />
          Performance por Dia da Semana
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.total >= 0 ? 'hsl(145, 63%, 49%)' : 'hsl(0, 85%, 60%)'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
