import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Clock, TrendingUp, TrendingDown, Target } from "lucide-react";

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
  strategy: string | null;
  contracts: number;
}

interface IntradayDecayProps {
  filteredOperations: Operation[];
}

const IntradayDecay = ({ filteredOperations }: IntradayDecayProps) => {
  const analysis = useMemo(() => {
    if (filteredOperations.length === 0) return null;

    // Group by hour
    const hourMap: Record<number, { sum: number; count: number }> = {};
    for (const op of filteredOperations) {
      const hour = parseInt(op.operation_time.split(":")[0]);
      if (hour < 9 || hour > 17) continue;
      if (!hourMap[hour]) hourMap[hour] = { sum: 0, count: 0 };
      hourMap[hour].sum += op.result;
      hourMap[hour].count++;
    }

    if (Object.keys(hourMap).length === 0) return null;

    // Calculate average per hour and accumulate
    const chartData: { hour: string; avgResult: number; accumulated: number }[] = [];
    let accumulated = 0;
    let bestHour = { hour: 0, avg: -Infinity };
    let worstHour = { hour: 0, avg: Infinity };
    let peakHour = { hour: 0, value: -Infinity };

    for (let h = 9; h <= 17; h++) {
      const entry = hourMap[h];
      if (!entry) {
        chartData.push({ hour: `${h}h`, avgResult: 0, accumulated });
        continue;
      }

      const avg = entry.sum / entry.count;
      accumulated += avg;

      if (avg > bestHour.avg) bestHour = { hour: h, avg };
      if (avg < worstHour.avg) worstHour = { hour: h, avg };
      if (accumulated > peakHour.value) peakHour = { hour: h, value: accumulated };

      chartData.push({
        hour: `${h}h`,
        avgResult: Math.round(avg * 100) / 100,
        accumulated: Math.round(accumulated * 100) / 100,
      });
    }

    const finalAccumulated = accumulated;
    const decay = peakHour.value - finalAccumulated;

    return {
      chartData,
      bestHour: `${bestHour.hour}h`,
      worstHour: `${worstHour.hour}h`,
      peakHour: `${peakHour.hour}h`,
      decay,
      peakValue: peakHour.value,
      finalValue: finalAccumulated,
    };
  }, [filteredOperations]);

  if (!analysis) return null;

  const formatCurrency = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const cards = [
    {
      label: "Melhor Horário",
      value: analysis.bestHour,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/15",
      icon: TrendingUp,
      sub: "Maior resultado médio",
    },
    {
      label: "Pior Horário",
      value: analysis.worstHour,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-500/15",
      icon: TrendingDown,
      sub: "Maior perda média",
    },
    {
      label: "Pico do Dia",
      value: `${analysis.peakHour} (${formatCurrency(analysis.peakValue)})`,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/15",
      icon: Target,
      sub: "Horário do máximo acumulado",
    },
    {
      label: "Decaimento",
      value: analysis.decay > 0 ? formatCurrency(analysis.decay) : "Sem decaimento",
      color: analysis.decay > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
      bg: analysis.decay > 0 ? "bg-red-500/15" : "bg-emerald-500/15",
      icon: Clock,
      sub: analysis.decay > 0 ? "Diferença pico → fechamento" : "Resultado cresce até o fim",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-card via-card/95 to-accent/5 border border-border/50 hover:border-primary/30 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg ${card.bg}`}>
                <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
              </div>
            </div>
            <div className={`text-lg font-black ${card.color}`}>{card.value}</div>
            <p className="text-[10px] text-muted-foreground mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-6 bg-gradient-to-br from-card via-card/95 to-accent/5 border border-amber-500/20"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-amber-500/15">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold">Decaimento Intraday</h3>
            <p className="text-xs text-muted-foreground">
              Evolução do resultado médio acumulado hora a hora
            </p>
          </div>
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analysis.chartData}>
              <defs>
                <linearGradient id="decayGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => `${v}`}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  return (
                    <div className="rounded-xl border border-border/50 bg-[#0a0a1a] px-4 py-3 text-xs shadow-2xl space-y-1">
                      <p className="font-bold text-white text-sm">{d.hour}</p>
                      <p className="text-amber-400">
                        Resultado Médio: {formatCurrency(d.avgResult)}
                      </p>
                      <p className={d.accumulated >= 0 ? "text-emerald-400" : "text-red-400"}>
                        Acumulado: {formatCurrency(d.accumulated)}
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="accumulated"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fill="url(#decayGrad)"
                dot={{ r: 4, fill: "#f59e0b", stroke: "#0a0a1a", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};

export default IntradayDecay;
