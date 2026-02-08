import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid, Cell,
} from "recharts";
import { Shield, DollarSign, Clock, TrendingUp, TrendingDown, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
  strategy: string | null;
  contracts: number;
}

interface MarginAnalysisProps {
  operations: Operation[];
}

const MARGIN_PER_CONTRACT = 150;
const MARKET_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];

const MarginAnalysis = ({ operations }: MarginAnalysisProps) => {
  const { hourlyData, summaryStats } = useMemo(() => {
    if (operations.length === 0) {
      const emptyHourly = MARKET_HOURS.map(h => ({
        hour: `${h}h`,
        avgContracts: 0,
        maxContracts: 0,
        avgMargin: 0,
        peakMargin: 0,
        daysCount: 0,
        avgStop: 0,
        avgGain: 0,
        payoff: 0,
      }));
      return {
        hourlyData: emptyHourly,
        summaryStats: {
          overallAvgMargin: 0,
          peakHour: "—",
          peakMarginValue: 0,
          avgContractsPerDay: 0,
          overallAvgStop: 0,
          overallAvgGain: 0,
          overallPayoff: 0,
        },
      };
    }

    // Group contracts by (date, hour) and track wins/losses by hour
    const dateHourMap: Record<string, Record<number, number>> = {};
    const hourWins: Record<number, { total: number; count: number }> = {};
    const hourLosses: Record<number, { total: number; count: number }> = {};

    for (const h of MARKET_HOURS) {
      hourWins[h] = { total: 0, count: 0 };
      hourLosses[h] = { total: 0, count: 0 };
    }

    for (const op of operations) {
      const date = op.operation_date;
      const hour = parseInt(op.operation_time.split(":")[0]);
      if (!MARKET_HOURS.includes(hour)) continue;

      // Contracts aggregation
      if (!dateHourMap[date]) dateHourMap[date] = {};
      dateHourMap[date][hour] = (dateHourMap[date][hour] || 0) + (op.contracts || 1);

      // Win/Loss aggregation
      if (op.result > 0) {
        hourWins[hour].total += op.result;
        hourWins[hour].count++;
      } else if (op.result < 0) {
        hourLosses[hour].total += op.result;
        hourLosses[hour].count++;
      }
    }

    // Calculate avg and max contracts per hour
    const hourAgg: Record<number, { total: number; max: number; days: number }> = {};
    for (const h of MARKET_HOURS) {
      hourAgg[h] = { total: 0, max: 0, days: 0 };
    }

    let totalContractsAllDays = 0;
    const totalDays = Object.keys(dateHourMap).length;

    for (const [, hours] of Object.entries(dateHourMap)) {
      let dayTotal = 0;
      for (const [hourStr, contracts] of Object.entries(hours)) {
        const hour = parseInt(hourStr);
        if (!hourAgg[hour]) continue;
        hourAgg[hour].total += contracts;
        hourAgg[hour].days++;
        if (contracts > hourAgg[hour].max) hourAgg[hour].max = contracts;
        dayTotal += contracts;
      }
      totalContractsAllDays += dayTotal;
    }

    const hourlyData = MARKET_HOURS.map(h => {
      const agg = hourAgg[h];
      const avgContracts = agg.days > 0 ? agg.total / agg.days : 0;
      const avgStop = hourLosses[h].count > 0
        ? Math.round(hourLosses[h].total / hourLosses[h].count)
        : 0;
      const avgGain = hourWins[h].count > 0
        ? Math.round(hourWins[h].total / hourWins[h].count)
        : 0;
      const payoff = avgStop !== 0
        ? Math.round((avgGain / Math.abs(avgStop)) * 100) / 100
        : 0;

      return {
        hour: `${h}h`,
        avgContracts: Math.round(avgContracts * 100) / 100,
        maxContracts: agg.max,
        avgMargin: Math.round(avgContracts * MARGIN_PER_CONTRACT),
        peakMargin: agg.max * MARGIN_PER_CONTRACT,
        daysCount: agg.days,
        avgStop,
        avgGain,
        payoff,
      };
    });

    // Summary stats
    const hoursWithData = hourlyData.filter(h => h.daysCount > 0);
    const overallAvgMargin = hoursWithData.length > 0
      ? Math.round(hoursWithData.reduce((sum, h) => sum + h.avgMargin, 0) / hoursWithData.length)
      : 0;

    const peakEntry = hourlyData.reduce((best, h) => h.peakMargin > best.peakMargin ? h : best, hourlyData[0]);

    const hoursWithStop = hoursWithData.filter(h => h.avgStop !== 0);
    const hoursWithGain = hoursWithData.filter(h => h.avgGain !== 0);

    const overallAvgStop = hoursWithStop.length > 0
      ? Math.round(hoursWithStop.reduce((sum, h) => sum + h.avgStop, 0) / hoursWithStop.length)
      : 0;
    const overallAvgGain = hoursWithGain.length > 0
      ? Math.round(hoursWithGain.reduce((sum, h) => sum + h.avgGain, 0) / hoursWithGain.length)
      : 0;
    const overallPayoff = overallAvgStop !== 0
      ? Math.round((overallAvgGain / Math.abs(overallAvgStop)) * 100) / 100
      : 0;

    return {
      hourlyData,
      summaryStats: {
        overallAvgMargin,
        peakHour: peakEntry.hour,
        peakMarginValue: peakEntry.peakMargin,
        avgContractsPerDay: totalDays > 0
          ? Math.round((totalContractsAllDays / totalDays) * 100) / 100
          : 0,
        overallAvgStop,
        overallAvgGain,
        overallPayoff,
      },
    };
  }, [operations]);

  const maxPeakMargin = Math.max(...hourlyData.map(h => h.peakMargin), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className={cn(
        "border overflow-hidden backdrop-blur-sm transition-all duration-500",
        "bg-gradient-to-br from-card via-card to-amber-500/5",
        "hover:shadow-2xl hover:shadow-amber-500/5",
        "border-amber-500/20"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 shadow-lg shadow-amber-500/10"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Shield className="w-5 h-5 text-amber-400" />
            </motion.div>
            <div>
              <CardTitle className="text-lg font-bold">Margem, Stop & Gain por Hora</CardTitle>
              <CardDescription className="text-xs">
                Análise de margem (R$ {MARGIN_PER_CONTRACT}/contrato c/ deságio 30%) + stop e gain ideais baseados no histórico
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <SummaryCard
              icon={DollarSign}
              label="Margem Média"
              value={`R$ ${summaryStats.overallAvgMargin.toLocaleString("pt-BR")}`}
              sublabel="Média por janela"
              color="text-cyan-400"
              bgColor="from-cyan-500/10 to-cyan-500/5 border-cyan-500/20"
            />
            <SummaryCard
              icon={TrendingUp}
              label="Pico de Margem"
              value={`R$ ${summaryStats.peakMarginValue.toLocaleString("pt-BR")}`}
              sublabel={`Maior demanda às ${summaryStats.peakHour}`}
              color="text-amber-400"
              bgColor="from-amber-500/10 to-amber-500/5 border-amber-500/20"
            />
            <SummaryCard
              icon={Clock}
              label="Contratos/Dia"
              value={summaryStats.avgContractsPerDay.toFixed(1)}
              sublabel="Média por dia"
              color="text-violet-400"
              bgColor="from-violet-500/10 to-violet-500/5 border-violet-500/20"
            />
            <SummaryCard
              icon={TrendingDown}
              label="Stop Ideal"
              value={`R$ ${summaryStats.overallAvgStop.toLocaleString("pt-BR")}`}
              sublabel="Média das perdas"
              color="text-red-400"
              bgColor="from-red-500/10 to-red-500/5 border-red-500/20"
            />
            <SummaryCard
              icon={Target}
              label="Gain Ideal"
              value={`R$ ${summaryStats.overallAvgGain.toLocaleString("pt-BR")}`}
              sublabel={`Payoff: ${summaryStats.overallPayoff.toFixed(2)}x`}
              color="text-emerald-400"
              bgColor="from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"
            />
          </div>

          {/* Margin Bar Chart */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Margem Necessária</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hourlyData} barCategoryGap="15%">
                <defs>
                  <linearGradient id="gradient-margin-avg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={1} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.7} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.15} vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`}
                />
                <Tooltip content={<MarginTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.1 }} />

                {maxPeakMargin > 0 && (
                  <ReferenceLine y={maxPeakMargin} stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 4"
                    label={{ value: `Pico: R$ ${maxPeakMargin.toLocaleString("pt-BR")}`, position: "insideTopRight", fill: "#f59e0b", fontSize: 11, fontWeight: 600 }}
                  />
                )}

                <Bar dataKey="avgMargin" radius={[6, 6, 6, 6]} maxBarSize={44}>
                  {hourlyData.map((entry, index) => (
                    <Cell key={`cell-margin-${index}`}
                      fill={entry.daysCount > 0 ? "url(#gradient-margin-avg)" : "hsl(var(--muted))"}
                      stroke={entry.daysCount > 0 ? "#06b6d4" : "transparent"} strokeWidth={1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-cyan-400" />
                <span>Margem Média</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 border-t-2 border-dashed border-amber-400" />
                <span>Pico Máximo</span>
              </div>
            </div>
          </div>

          {/* Stop vs Gain Bar Chart */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Stop Ideal vs Gain Ideal</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hourlyData} barCategoryGap="20%">
                <defs>
                  <linearGradient id="gradient-stop" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="gradient-gain" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.7} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.15} vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `R$${v}`}
                />
                <Tooltip content={<StopGainTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.1 }} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />

                <Bar dataKey="avgStop" name="Stop" radius={[4, 4, 4, 4]} maxBarSize={28} fill="url(#gradient-stop)" />
                <Bar dataKey="avgGain" name="Gain" radius={[4, 4, 4, 4]} maxBarSize={28} fill="url(#gradient-gain)" />
              </BarChart>
            </ResponsiveContainer>

            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-red-400" />
                <span>Stop Médio</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-emerald-400" />
                <span>Gain Médio</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/* ─── Sub-components ─── */

const SummaryCard = ({
  icon: Icon, label, value, sublabel, color, bgColor,
}: {
  icon: React.ElementType; label: string; value: string; sublabel: string; color: string; bgColor: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className={cn("p-4 rounded-xl bg-gradient-to-br border", bgColor)}
  >
    <div className="flex items-center gap-2 mb-2">
      <Icon className={cn("w-4 h-4", color)} />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
    <p className={cn("text-xl font-bold", color)}>{value}</p>
    <p className="text-[10px] text-muted-foreground mt-1">{sublabel}</p>
  </motion.div>
);

const MarginTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  if (data.daysCount === 0) return null;

  return (
    <div className="bg-card/95 backdrop-blur-xl border border-amber-500/30 rounded-xl p-4 shadow-2xl">
      <p className="text-sm font-bold text-foreground mb-3">{label}</p>
      <div className="space-y-2 text-sm">
        <TooltipRow label="Contratos (média)" value={data.avgContracts} />
        <TooltipRow label="Contratos (máx)" value={data.maxContracts} />
        <div className="h-px bg-border/30 my-1" />
        <TooltipRow label="Margem Média" value={`R$ ${data.avgMargin.toLocaleString("pt-BR")}`} valueClass="text-cyan-400" />
        <TooltipRow label="Margem Pico" value={`R$ ${data.peakMargin.toLocaleString("pt-BR")}`} valueClass="text-amber-400" />
        <div className="h-px bg-border/30 my-1" />
        <TooltipRow label="Stop Ideal" value={`R$ ${data.avgStop.toLocaleString("pt-BR")}`} valueClass="text-red-400" />
        <TooltipRow label="Gain Ideal" value={`R$ ${data.avgGain.toLocaleString("pt-BR")}`} valueClass="text-emerald-400" />
        <TooltipRow label="Payoff" value={`${data.payoff.toFixed(2)}x`} valueClass="text-foreground" />
        <p className="text-[10px] text-muted-foreground pt-1">
          Baseado em {data.daysCount} dia{data.daysCount > 1 ? "s" : ""} operado{data.daysCount > 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
};

const StopGainTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data || data.daysCount === 0) return null;

  return (
    <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-2xl">
      <p className="text-sm font-bold text-foreground mb-3">{label}</p>
      <div className="space-y-2 text-sm">
        <TooltipRow label="Stop Ideal" value={`R$ ${data.avgStop.toLocaleString("pt-BR")}`} valueClass="text-red-400" />
        <TooltipRow label="Gain Ideal" value={`R$ ${data.avgGain.toLocaleString("pt-BR")}`} valueClass="text-emerald-400" />
        <div className="h-px bg-border/30 my-1" />
        <TooltipRow label="Payoff" value={`${data.payoff.toFixed(2)}x`} valueClass="text-foreground" />
      </div>
    </div>
  );
};

const TooltipRow = ({ label, value, valueClass = "text-foreground" }: { label: string; value: string | number; valueClass?: string }) => (
  <div className="flex items-center justify-between gap-6">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn("font-semibold", valueClass)}>{value}</span>
  </div>
);

export default MarginAnalysis;
