import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
  strategy: string | null;
  contracts: number;
}

interface StrategyEvolutionProps {
  filteredOperations: Operation[];
}

const STRATEGY_COLORS: Record<string, string> = {
  "Alaska & Square": "#22d3ee", // cyan-400
  "Apollo": "#fbbf24",          // amber-400
  "Ares": "#a78bfa",            // violet-400
  "Orion": "#34d399",           // emerald-400
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl p-3 shadow-2xl">
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.dataKey}</span>
            </div>
            <span
              className="font-bold tabular-nums"
              style={{ color: entry.value >= 0 ? "hsl(var(--chart-2, 142 71% 45%))" : "hsl(var(--chart-5, 0 84% 60%))" }}
            >
              {Number(entry.value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StrategyEvolution = ({ filteredOperations }: StrategyEvolutionProps) => {
  const chartData = useMemo(() => {
    if (filteredOperations.length === 0) return [];

    // 1. Group by (date, strategy) -> dailyByStrategy[date][strategy] += result
    const dailyByStrategy: Record<string, Record<string, number>> = {};
    const strategiesSet = new Set<string>();

    for (const op of filteredOperations) {
      const strategy = op.strategy || "Sem Estratégia";
      const date = op.operation_date;
      strategiesSet.add(strategy);

      if (!dailyByStrategy[date]) dailyByStrategy[date] = {};
      dailyByStrategy[date][strategy] = (dailyByStrategy[date][strategy] || 0) + op.result;
    }

    // 2. Sort dates chronologically
    const sortedDates = Object.keys(dailyByStrategy).sort();
    const strategies = Array.from(strategiesSet);

    // 3. Accumulate per strategy
    const accumulated: Record<string, number> = {};
    strategies.forEach(s => (accumulated[s] = 0));

    const data = sortedDates.map(date => {
      const [, mm, dd] = date.split("-");
      const point: Record<string, any> = { date: `${dd}/${mm}` };

      for (const strategy of strategies) {
        accumulated[strategy] += dailyByStrategy[date][strategy] || 0;
        point[strategy] = accumulated[strategy];
      }

      return point;
    });

    // Intelligent sampling for large datasets
    if (data.length > 365) {
      const step = Math.ceil(data.length / 365);
      return data.filter((_, i) => i % step === 0 || i === data.length - 1);
    }

    return data;
  }, [filteredOperations]);

  const strategies = useMemo(() => {
    const set = new Set<string>();
    for (const op of filteredOperations) {
      if (op.strategy) set.add(op.strategy);
    }
    return Array.from(set);
  }, [filteredOperations]);

  if (chartData.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-cyan-500/20 overflow-hidden bg-gradient-to-br from-card via-card to-accent/5">
        <CardHeader className="bg-gradient-to-r from-cyan-500/5 via-transparent to-transparent">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            Evolução Comparativa das Estratégias
          </CardTitle>
          <CardDescription>
            Curva de equity acumulada de cada estratégia ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                {strategies.map(strategy => {
                  const color = STRATEGY_COLORS[strategy] || "#94a3b8";
                  return (
                    <linearGradient key={strategy} id={`gradient-${strategy.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
              />
              {strategies.map(strategy => {
                const color = STRATEGY_COLORS[strategy] || "#94a3b8";
                return (
                  <Area
                    key={strategy}
                    type="monotone"
                    dataKey={strategy}
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#gradient-${strategy.replace(/\s+/g, '-')})`}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, fill: color }}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StrategyEvolution;
