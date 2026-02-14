import { useState, useMemo, useCallback } from "react";
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
import { Shuffle, TrendingUp, Shield, AlertTriangle, Sparkles } from "lucide-react";

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
  strategy: string | null;
  contracts: number;
}

interface MonteCarloSimulatorProps {
  filteredOperations: Operation[];
}

const NUM_SIMULATIONS = 500;

const MonteCarloSimulator = ({ filteredOperations }: MonteCarloSimulatorProps) => {
  const [simResult, setSimResult] = useState<{
    chartData: { day: number; best: number; median: number; worst: number }[];
    profitProb: number;
    medianResult: number;
    var95: number;
    bestScenario: number;
  } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const dailyResults = useMemo(() => {
    const map: Record<string, number> = {};
    for (const op of filteredOperations) {
      map[op.operation_date] = (map[op.operation_date] || 0) + op.result;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [filteredOperations]);

  const runSimulation = useCallback(() => {
    if (dailyResults.length < 2) return;
    setIsSimulating(true);

    // Use setTimeout to allow UI to update with loading state
    setTimeout(() => {
      const n = dailyResults.length;
      const allFinals: number[] = [];
      const allCurves: number[][] = [];

      for (let s = 0; s < NUM_SIMULATIONS; s++) {
        // Fisher-Yates shuffle
        const shuffled = [...dailyResults];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const curve: number[] = [0];
        let acc = 0;
        for (let d = 0; d < n; d++) {
          acc += shuffled[d];
          curve.push(acc);
        }
        allCurves.push(curve);
        allFinals.push(acc);
      }

      // Sort finals for percentiles
      allFinals.sort((a, b) => a - b);
      const p5 = allFinals[Math.floor(NUM_SIMULATIONS * 0.05)];
      const p50 = allFinals[Math.floor(NUM_SIMULATIONS * 0.5)];
      const p95 = allFinals[Math.floor(NUM_SIMULATIONS * 0.95)];

      // Build percentile curves
      const chartData: { day: number; best: number; median: number; worst: number }[] = [];
      for (let d = 0; d <= n; d++) {
        const dayValues = allCurves.map((c) => c[d]).sort((a, b) => a - b);
        chartData.push({
          day: d,
          best: Math.round(dayValues[Math.floor(NUM_SIMULATIONS * 0.95)]),
          median: Math.round(dayValues[Math.floor(NUM_SIMULATIONS * 0.5)]),
          worst: Math.round(dayValues[Math.floor(NUM_SIMULATIONS * 0.05)]),
        });
      }

      // Downsample if too many points
      let finalChart = chartData;
      if (finalChart.length > 365) {
        const step = Math.ceil(finalChart.length / 365);
        finalChart = finalChart.filter((_, i) => i === 0 || i === finalChart.length - 1 || i % step === 0);
      }

      const profitCount = allFinals.filter((v) => v > 0).length;

      setSimResult({
        chartData: finalChart,
        profitProb: (profitCount / NUM_SIMULATIONS) * 100,
        medianResult: p50,
        var95: p5,
        bestScenario: p95,
      });
      setIsSimulating(false);
    }, 50);
  }, [dailyResults]);

  const formatCurrency = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (dailyResults.length < 2) return null;

  const cards = simResult
    ? [
        {
          label: "Prob. de Lucro",
          value: `${simResult.profitProb.toFixed(1)}%`,
          color: simResult.profitProb >= 50 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
          bg: simResult.profitProb >= 50 ? "bg-emerald-500/15" : "bg-red-500/15",
          icon: TrendingUp,
          sub: `${NUM_SIMULATIONS} simulações`,
        },
        {
          label: "Resultado Mediano",
          value: formatCurrency(simResult.medianResult),
          color: simResult.medianResult >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400",
          bg: "bg-blue-500/15",
          icon: Sparkles,
          sub: "Percentil 50",
        },
        {
          label: "VaR 95%",
          value: formatCurrency(simResult.var95),
          color: "text-red-600 dark:text-red-400",
          bg: "bg-red-500/15",
          icon: AlertTriangle,
          sub: "Pior cenário com 95% confiança",
        },
        {
          label: "Melhor Cenário",
          value: formatCurrency(simResult.bestScenario),
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-500/15",
          icon: Shield,
          sub: "Percentil 95",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header + Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 bg-gradient-to-br from-card via-card/95 to-accent/5 border border-violet-500/20"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/15">
              <Shuffle className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="text-base font-bold">Simulador Monte Carlo</h3>
              <p className="text-xs text-muted-foreground">
                {NUM_SIMULATIONS} simulações randomizadas baseadas nos seus resultados reais
              </p>
            </div>
          </div>
          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white text-sm font-bold hover:from-violet-500 hover:to-blue-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
          >
            {isSimulating ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Simulando...
              </span>
            ) : (
              "Simular"
            )}
          </button>
        </div>
      </motion.div>

      {/* Results */}
      {simResult && (
        <>
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
            className="rounded-2xl p-6 bg-gradient-to-br from-card via-card/95 to-accent/5 border border-violet-500/20"
          >
            <h3 className="text-base font-bold mb-1">Projeção de Cenários</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Melhor (P95), Mediano (P50) e Pior (P5) cenários
            </p>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simResult.chartData}>
                  <defs>
                    <linearGradient id="mcBestGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="mcWorstGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    interval="preserveStartEnd"
                    label={{ value: "Dias", position: "insideBottomRight", offset: -5, fontSize: 10 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) =>
                      v >= 1000 || v <= -1000
                        ? `${(v / 1000).toFixed(0)}k`
                        : v.toString()
                    }
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="rounded-xl border border-border/50 bg-[#0a0a1a] px-4 py-3 text-xs shadow-2xl space-y-1">
                          <p className="font-bold text-white text-sm">Dia {d.day}</p>
                          <p className="text-emerald-400">Melhor: {formatCurrency(d.best)}</p>
                          <p className="text-blue-400">Mediano: {formatCurrency(d.median)}</p>
                          <p className="text-red-400">Pior: {formatCurrency(d.worst)}</p>
                        </div>
                      );
                    }}
                  />
                  <Area type="monotone" dataKey="best" stroke="#10b981" strokeWidth={2} fill="url(#mcBestGrad)" dot={false} />
                  <Area type="monotone" dataKey="median" stroke="#3b82f6" strokeWidth={2} fill="none" dot={false} />
                  <Area type="monotone" dataKey="worst" stroke="#ef4444" strokeWidth={2} fill="url(#mcWorstGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default MonteCarloSimulator;
