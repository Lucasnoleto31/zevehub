import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Legend } from "recharts";
import { Shield, TrendingUp, AlertTriangle, Target } from "lucide-react";

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
  strategy: string | null;
  contracts: number;
}

interface MarginAnalysisProps {
  filteredOperations: Operation[];
}

const STOP_SAFETY_MARGIN = 1.4; // +40% margem de segurança
const MARGIN_PER_CONTRACT = 150; // R$ 150,00 por contrato (já com deságio de 30%)

const MarginAnalysis = ({ filteredOperations }: MarginAnalysisProps) => {
  const { hourlyData, summaryStats } = useMemo(() => {
    if (filteredOperations.length === 0) {
      return { hourlyData: [], summaryStats: { avgMargin: 0, avgContractsPerDay: 0, overallAvgStop: 0, overallAvgGain: 0 } };
    }

    // Map 1: contracts by (date, hour) → margem
    const dateHourContractMap: Record<string, Record<number, number>> = {};
    // Map 2: results by (date, hour) → stop/gain
    const dateHourResultMap: Record<string, Record<number, number>> = {};

    for (const op of filteredOperations) {
      const date = op.operation_date;
      const hour = parseInt(op.operation_time.split(":")[0]);
      if (hour < 9 || hour > 17) continue;

      // Contracts map
      if (!dateHourContractMap[date]) dateHourContractMap[date] = {};
      dateHourContractMap[date][hour] = (dateHourContractMap[date][hour] || 0) + op.contracts;

      // Results map
      if (!dateHourResultMap[date]) dateHourResultMap[date] = {};
      dateHourResultMap[date][hour] = (dateHourResultMap[date][hour] || 0) + op.result;
    }

    const hourlyMap: Record<number, {
      marginSum: number; marginCount: number;
      gainSum: number; gainCount: number;
      lossSum: number; lossCount: number;
      winDays: number; lossDays: number;
    }> = {};

    // Process contracts for margin
    for (const [, hours] of Object.entries(dateHourContractMap)) {
      for (const [hourStr, contracts] of Object.entries(hours)) {
        const hour = parseInt(hourStr);
        if (!hourlyMap[hour]) {
          hourlyMap[hour] = { marginSum: 0, marginCount: 0, gainSum: 0, gainCount: 0, lossSum: 0, lossCount: 0, winDays: 0, lossDays: 0 };
        }
        const margin = contracts * MARGIN_PER_CONTRACT;
        hourlyMap[hour].marginSum += margin;
        hourlyMap[hour].marginCount++;
      }
    }

    // Process results for stop/gain
    const allDates = Object.keys(dateHourResultMap);
    for (let hour = 9; hour <= 17; hour++) {
      if (!hourlyMap[hour]) {
        hourlyMap[hour] = { marginSum: 0, marginCount: 0, gainSum: 0, gainCount: 0, lossSum: 0, lossCount: 0, winDays: 0, lossDays: 0 };
      }
      for (const date of allDates) {
        const result = dateHourResultMap[date]?.[hour];
        if (result === undefined) continue;
        if (result > 0) {
          hourlyMap[hour].gainSum += result;
          hourlyMap[hour].gainCount++;
          hourlyMap[hour].winDays++;
        } else if (result < 0) {
          hourlyMap[hour].lossSum += result;
          hourlyMap[hour].lossCount++;
          hourlyMap[hour].lossDays++;
        }
      }
    }

    const data = [];
    let totalAvgMargin = 0;
    let totalAvgGain = 0;
    let totalAvgStop = 0;
    let gainHourCount = 0;
    let stopHourCount = 0;

    for (let hour = 9; hour <= 17; hour++) {
      const h = hourlyMap[hour];
      if (!h || (h.marginCount === 0 && h.gainCount === 0 && h.lossCount === 0)) continue;

      const avgMargin = h.marginCount > 0 ? Math.round(h.marginSum / h.marginCount) : 0;
      const avgGain = h.gainCount > 0 ? Math.round(h.gainSum / h.gainCount) : 0;
      const avgStop = h.lossCount > 0 ? Math.round(Math.abs(h.lossSum / h.lossCount) * STOP_SAFETY_MARGIN) : 0;
      const payoff = avgStop > 0 ? parseFloat((avgGain / avgStop).toFixed(2)) : 0;

      totalAvgMargin += avgMargin;
      if (avgGain > 0) { totalAvgGain += avgGain; gainHourCount++; }
      if (avgStop > 0) { totalAvgStop += avgStop; stopHourCount++; }

      data.push({
        hour: `${hour}h`,
        avgMargin,
        avgGain,
        avgStop,
        winDays: h.winDays,
        lossDays: h.lossDays,
        payoff,
      });
    }

    const totalHours = data.length;

    // Calculate avg contracts per day
    const uniqueDays = new Set(filteredOperations.map(op => op.operation_date)).size;
    const totalContracts = filteredOperations.reduce((sum, op) => sum + op.contracts, 0);
    const avgContractsPerDay = uniqueDays > 0 ? Math.round((totalContracts / uniqueDays) * 10) / 10 : 0;

    return {
      hourlyData: data,
      summaryStats: {
        avgMargin: totalHours > 0 ? Math.round(totalAvgMargin / totalHours) : 0,
        avgContractsPerDay,
        overallAvgStop: stopHourCount > 0 ? Math.round(totalAvgStop / stopHourCount) : 0,
        overallAvgGain: gainHourCount > 0 ? Math.round(totalAvgGain / gainHourCount) : 0,
      },
    };
  }, [filteredOperations]);

  if (hourlyData.length === 0) return null;

  const formatCurrency = (v: number) => `R$ ${v.toLocaleString("pt-BR")}`;

  const cards = [
    { label: "Margem Média", value: formatCurrency(summaryStats.avgMargin), color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/15", icon: Shield, sub: "R$ 150/contrato x média horária" },
    { label: "Contratos Médios/Dia", value: String(summaryStats.avgContractsPerDay), color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/15", icon: TrendingUp, sub: "Média de contratos por dia operado" },
    { label: "Stop Ideal", value: formatCurrency(summaryStats.overallAvgStop), color: "text-red-600 dark:text-red-400", bg: "bg-red-500/15", icon: AlertTriangle, sub: "Média + 40% margem de segurança" },
    { label: "Gain Ideal", value: formatCurrency(summaryStats.overallAvgGain), color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15", icon: Target, sub: "Média dos resultados positivos" },
  ];

  const MarginTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="rounded-xl border border-border/50 bg-[#0a0a1a] px-4 py-3 text-xs shadow-2xl space-y-1">
        <p className="font-bold text-white text-sm">{label}</p>
        <p className="text-cyan-400">Margem Média: {formatCurrency(d.avgMargin)}</p>
        <p className="text-emerald-400">Gain Ideal: {formatCurrency(d.avgGain)}</p>
        <p className="text-red-400">Stop Ideal: {formatCurrency(d.avgStop)}</p>
        <p className="text-muted-foreground">Dias +: {d.winDays} | Dias -: {d.lossDays}</p>
      </div>
    );
  };

  const StopGainTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="rounded-xl border border-border/50 bg-[#0a0a1a] px-4 py-3 text-xs shadow-2xl space-y-1">
        <p className="font-bold text-white text-sm">{label}</p>
        <p className="text-emerald-400">Gain Ideal: {formatCurrency(d.avgGain)}</p>
        <p className="text-red-400">Stop Ideal: {formatCurrency(d.avgStop)}</p>
        <p className="text-white">Payoff: {d.payoff.toFixed(2)}</p>
        <p className="text-muted-foreground">Dias +: {d.winDays} | Dias -: {d.lossDays}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{card.label}</span>
              <div className={`p-1.5 rounded-lg ${card.bg}`}>
                <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
              </div>
            </div>
            <div className={`text-lg font-black ${card.color}`}>{card.value}</div>
            <p className="text-[10px] text-muted-foreground mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart 1: Margin by hour */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-6 bg-gradient-to-br from-card via-card/95 to-accent/5 border border-cyan-500/20"
      >
        <h3 className="text-base font-bold mb-1">Margem por Hora</h3>
        <p className="text-xs text-muted-foreground mb-4">Margem média e pico de contratos por janela de horário</p>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={hourlyData}>
              <defs>
                <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${v}`} />
              <Tooltip content={<MarginTooltip />} />
              <Bar dataKey="avgMargin" fill="url(#marginGrad)" radius={[6, 6, 0, 0]} name="Margem Média" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Chart 2: Stop vs Gain by hour */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl p-6 bg-gradient-to-br from-card via-card/95 to-accent/5 border border-violet-500/20"
      >
        <h3 className="text-base font-bold mb-1">Stop e Gain Ideal por Hora</h3>
        <p className="text-xs text-muted-foreground mb-4">Baseado no resultado médio acumulado por janela (stop com +40% de segurança)</p>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData}>
              <defs>
                <linearGradient id="gainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="stopGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${v}`} />
              <Tooltip content={<StopGainTooltip />} />
              <Bar dataKey="avgGain" fill="url(#gainGrad)" radius={[6, 6, 0, 0]} name="Gain Ideal" />
              <Bar dataKey="avgStop" fill="url(#stopGrad)" radius={[6, 6, 0, 0]} name="Stop Ideal" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-cyan-400" /> Margem Média</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-emerald-400" /> Gain Ideal</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-red-400" /> Stop Ideal</div>
      </div>
    </div>
  );
};

export default MarginAnalysis;
