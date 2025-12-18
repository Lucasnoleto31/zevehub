import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";

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
      <Card className="border border-border/40 bg-card/50 backdrop-blur-sm animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-6 bg-muted rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted/50 rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const dataByDate: { [key: string]: number } = {};
  operations.forEach((op) => {
    const date = op.operation_date;
    if (!dataByDate[date]) dataByDate[date] = 0;
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
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl p-3 shadow-2xl">
          <p className="text-sm font-bold text-foreground mb-1">{data.date}</p>
          <p className={cn("text-sm font-medium", data.accumulated >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
            Acumulado: {formatCurrency(data.accumulated)}
          </p>
          <p className={cn("text-xs", data.result >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70')}>
            Dia: {formatCurrency(data.result)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card className="border border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            Curva de Equity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Sem dados para exibir
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={cn(
        "border transition-all duration-500 overflow-hidden",
        "bg-gradient-to-br from-card/90 via-card/70 to-card/50",
        "backdrop-blur-xl hover:shadow-2xl",
        isPositive ? "border-emerald-500/20 hover:border-emerald-500/40" : "border-rose-500/20 hover:border-rose-500/40"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className={cn(
                "p-2.5 rounded-xl",
                isPositive ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"
              )}>
                {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
              <span className="font-bold">Curva de Equity</span>
            </CardTitle>
            <span className={cn(
              "text-2xl font-black tracking-tight",
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            )}>
              {formatCurrency(lastValue)}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGradientPos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(52, 211, 153)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="rgb(52, 211, 153)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="equityGradientNeg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(251, 113, 133)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="rgb(251, 113, 133)" stopOpacity={0} />
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
                  stroke={isPositive ? "rgb(52, 211, 153)" : "rgb(251, 113, 133)"}
                  strokeWidth={2.5}
                  fill={isPositive ? "url(#equityGradientPos)" : "url(#equityGradientNeg)"}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
