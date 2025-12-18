import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Operation {
  operation_date: string;
  result: number;
}

interface EquityCurveChartProps {
  operations: Operation[];
  loading?: boolean;
}

export const EquityCurveChart = ({ operations, loading }: EquityCurveChartProps) => {
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

  // Process data for equity curve
  const dataByDate: { [key: string]: number } = {};
  operations.forEach((op) => {
    const date = op.operation_date;
    if (!dataByDate[date]) {
      dataByDate[date] = 0;
    }
    dataByDate[date] += op.result || 0;
  });

  let accumulated = 0;
  const chartData = Object.entries(dataByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, result]) => {
      accumulated += result;
      const [y, m, d] = date.split('-');
      return {
        date: `${d}/${m}`,
        accumulated: Number(accumulated.toFixed(2)),
        result: Number(result.toFixed(2)),
      };
    });

  const lastValue = chartData.length > 0 ? chartData[chartData.length - 1].accumulated : 0;
  const isPositive = lastValue >= 0;

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
          <p className="text-sm font-medium text-foreground">{data.date}</p>
          <p className={`text-sm ${data.accumulated >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            Acumulado: {formatCurrency(data.accumulated)}
          </p>
          <p className={`text-xs ${data.result >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            Dia: {formatCurrency(data.result)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card className="border-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            Curva de Equity
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
    <Card className="border-2 hover:shadow-lg transition-all duration-300 group">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {isPositive ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500" />
            )}
            Curva de Equity
          </CardTitle>
          <span className={`text-lg font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {formatCurrency(lastValue)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="equityGradientPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(145, 63%, 49%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(145, 63%, 49%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="equityGradientNeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0, 85%, 60%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(0, 85%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="accumulated"
                stroke={isPositive ? "hsl(145, 63%, 49%)" : "hsl(0, 85%, 60%)"}
                strokeWidth={2}
                fill={isPositive ? "url(#equityGradientPos)" : "url(#equityGradientNeg)"}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
