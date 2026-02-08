import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid, Cell,
} from "recharts";
import { Shield, DollarSign, Clock, TrendingUp, Target, ShieldAlert } from "lucide-react";
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
const STOP_SAFETY_MARGIN = 1.4; // +40% de margem de segurança

const MarginAnalysis = ({ operations }: MarginAnalysisProps) => {
  const { hourlyData, summaryStats } = useMemo(() => {
    if (operations.length === 0) {
      return {
        hourlyData: MARKET_HOURS.map(h => ({
          hour: `${h}h`,
          avgContracts: 0,
          maxContracts: 0,
          avgMargin: 0,
          peakMargin: 0,
          daysCount: 0,
          avgGain: 0,
          avgStop: 0,
          winDays: 0,
          lossDays: 0,
        })),
        summaryStats: {
          overallAvgMargin: 0,
          peakHour: "—",
          peakMarginValue: 0,
          avgContractsPerDay: 0,
          overallAvgGain: 0,
          overallAvgStop: 0,
        },
      };
    }

    // Group contracts by (date, hour)
    const dateHourMap: Record<string, Record<number, number>> = {};
    // Group results by (date, hour)
    const dateHourResultMap: Record<string, Record<number, number>> = {};

    for (const op of operations) {
      const date = op.operation_date;
      const hour = parseInt(op.operation_time.split(":")[0]);
      if (!MARKET_HOURS.includes(hour)) continue;

      // Contracts aggregation
      if (!dateHourMap[date]) dateHourMap[date] = {};
      dateHourMap[date][hour] = (dateHourMap[date][hour] || 0) + (op.contracts || 1);

      // Results aggregation
      if (!dateHourResultMap[date]) dateHourResultMap[date] = {};
      dateHourResultMap[date][hour] = (dateHourResultMap[date][hour] || 0) + op.result;
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

    // Calculate stop/gain per hour from accumulated results
    const hourStopGain: Record<number, { gainSum: number; gainCount: number; lossSum: number; lossCount: number }> = {};
    for (const h of MARKET_HOURS) {
      hourStopGain[h] = { gainSum: 0, gainCount: 0, lossSum: 0, lossCount: 0 };
    }

    for (const [, hours] of Object.entries(dateHourResultMap)) {
      for (const [hourStr, result] of Object.entries(hours)) {
        const hour = parseInt(hourStr);
        if (!hourStopGain[hour]) continue;
        if (result > 0) {
          hourStopGain[hour].gainSum += result;
          hourStopGain[hour].gainCount++;
        } else if (result < 0) {
          hourStopGain[hour].lossSum += result;
          hourStopGain[hour].lossCount++;
        }
      }
    }

    const hourlyData = MARKET_HOURS.map(h => {
      const agg = hourAgg[h];
      const sg = hourStopGain[h];
      const avgContracts = agg.days > 0 ? agg.total / agg.days : 0;
      const avgGain = sg.gainCount > 0 ? Math.round(sg.gainSum / sg.gainCount) : 0;
      const avgStop = sg.lossCount > 0 ? Math.round(Math.abs(sg.lossSum / sg.lossCount) * STOP_SAFETY_MARGIN) : 0;

      return {
        hour: `${h}h`,
        avgContracts: Math.round(avgContracts * 100) / 100,
        maxContracts: agg.max,
        avgMargin: Math.round(avgContracts * MARGIN_PER_CONTRACT),
        peakMargin: agg.max * MARGIN_PER_CONTRACT,
        daysCount: agg.days,
        avgGain,
        avgStop,
        winDays: sg.gainCount,
        lossDays: sg.lossCount,
      };
    });

    // Summary stats
    const hoursWithData = hourlyData.filter(h => h.daysCount > 0);
    const overallAvgMargin = hoursWithData.length > 0
      ? Math.round(hoursWithData.reduce((sum, h) => sum + h.avgMargin, 0) / hoursWithData.length)
      : 0;

    const peakEntry = hourlyData.reduce((best, h) => h.peakMargin > best.peakMargin ? h : best, hourlyData[0]);

    const hoursWithGain = hourlyData.filter(h => h.avgGain > 0);
    const hoursWithStop = hourlyData.filter(h => h.avgStop > 0);

    const overallAvgGain = hoursWithGain.length > 0
      ? Math.round(hoursWithGain.reduce((sum, h) => sum + h.avgGain, 0) / hoursWithGain.length)
      : 0;
    const overallAvgStop = hoursWithStop.length > 0
      ? Math.round(hoursWithStop.reduce((sum, h) => sum + h.avgStop, 0) / hoursWithStop.length)
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
        overallAvgGain,
        overallAvgStop,
      },
    };
  }, [operations]);

  const maxPeakMargin = Math.max(...hourlyData.map(h => h.peakMargin), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      {/* Margin Analysis Card */}
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
              <CardTitle className="text-lg font-bold">Margem, Stop e Gain por Hora</CardTitle>
              <CardDescription className="text-xs">
                Análise de margem (R$ {MARGIN_PER_CONTRACT},00/contrato com deságio 30%) e limites ideais por janela
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Summary Cards - 5 cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <SummaryCard
              icon={DollarSign}
              label="Margem Média"
              value={`R$ ${summaryStats.overallAvgMargin.toLocaleString("pt-BR")}`}
              sublabel="Média por janela de horário"
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
              sublabel="Média de contratos por dia"
              color="text-violet-400"
              bgColor="from-violet-500/10 to-violet-500/5 border-violet-500/20"
            />
            <SummaryCard
              icon={Target}
              label="Gain Ideal"
              value={`R$ ${summaryStats.overallAvgGain.toLocaleString("pt-BR")}`}
              sublabel="Média geral dos ganhos/hora"
              color="text-emerald-400"
              bgColor="from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"
            />
            <SummaryCard
              icon={ShieldAlert}
              label="Stop Ideal"
              value={`R$ ${summaryStats.overallAvgStop.toLocaleString("pt-BR")}`}
              sublabel="Média + 40% margem de segurança"
              color="text-red-400"
              bgColor="from-red-500/10 to-red-500/5 border-red-500/20"
            />
          </div>

          {/* Margin Bar Chart */}
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={hourlyData} barCategoryGap="15%">
              <defs>
                <linearGradient id="gradient-margin-avg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={1} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.7} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.15}
                vertical={false}
              />

              <XAxis
                dataKey="hour"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => {
                  if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`;
                  return `R$${value}`;
                }}
              />

              <Tooltip content={<MarginTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.1 }} />

              {maxPeakMargin > 0 && (
                <ReferenceLine
                  y={maxPeakMargin}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  label={{
                    value: `Pico: R$ ${maxPeakMargin.toLocaleString("pt-BR")}`,
                    position: "insideTopRight",
                    fill: "#f59e0b",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              )}

              <Bar dataKey="avgMargin" radius={[6, 6, 6, 6]} maxBarSize={44}>
                {hourlyData.map((entry, index) => (
                  <Cell
                    key={`cell-margin-${index}`}
                    fill={entry.daysCount > 0 ? "url(#gradient-margin-avg)" : "hsl(var(--muted))"}
                    stroke={entry.daysCount > 0 ? "#06b6d4" : "transparent"}
                    strokeWidth={1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend for margin chart */}
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-cyan-400" />
              <span>Margem Média</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 border-t-2 border-dashed border-amber-400" />
              <span>Pico Máximo</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stop vs Gain Chart Card */}
      <Card className={cn(
        "border overflow-hidden backdrop-blur-sm transition-all duration-500",
        "bg-gradient-to-br from-card via-card to-emerald-500/5",
        "hover:shadow-2xl hover:shadow-emerald-500/5",
        "border-emerald-500/20"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 shadow-lg shadow-emerald-500/10"
              whileHover={{ scale: 1.05, rotate: -5 }}
            >
              <Target className="w-5 h-5 text-emerald-400" />
            </motion.div>
            <div>
              <CardTitle className="text-lg font-bold">Stop e Gain Ideal por Hora</CardTitle>
              <CardDescription className="text-xs">
                Baseado no resultado médio acumulado por janela (stop com +40% de segurança)
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyData} barCategoryGap="20%">
              <defs>
                <linearGradient id="gradient-gain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="gradient-stop" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.7} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.15}
                vertical={false}
              />

              <XAxis
                dataKey="hour"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => {
                  if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`;
                  return `R$${value}`;
                }}
              />

              <Tooltip content={<StopGainTooltip />} cursor={{ fill: "hsl(var(--accent))", opacity: 0.1 }} />

              <Bar dataKey="avgGain" name="Gain Ideal" fill="url(#gradient-gain)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Bar dataKey="avgStop" name="Stop Ideal" fill="url(#gradient-stop)" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-emerald-400" />
              <span>Gain Ideal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-red-400" />
              <span>Stop Ideal</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sublabel: string;
  color: string;
  bgColor: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className={cn(
      "p-4 rounded-xl bg-gradient-to-br border",
      bgColor
    )}
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
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  if (data.daysCount === 0) return null;

  return (
    <div className="bg-card/95 backdrop-blur-xl border border-amber-500/30 rounded-xl p-4 shadow-2xl">
      <p className="text-sm font-bold text-foreground mb-3">{label}</p>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Contratos (média)</span>
          <span className="font-semibold text-foreground">{data.avgContracts}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Contratos (máx)</span>
          <span className="font-semibold text-foreground">{data.maxContracts}</span>
        </div>
        <div className="h-px bg-border/30 my-1" />
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Margem Média</span>
          <span className="font-bold text-cyan-400">
            R$ {data.avgMargin.toLocaleString("pt-BR")}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Margem Pico</span>
          <span className="font-bold text-amber-400">
            R$ {data.peakMargin.toLocaleString("pt-BR")}
          </span>
        </div>
        <div className="h-px bg-border/30 my-1" />
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Gain Ideal</span>
          <span className="font-bold text-emerald-400">
            R$ {data.avgGain.toLocaleString("pt-BR")}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Stop Ideal</span>
          <span className="font-bold text-red-400">
            R$ {data.avgStop.toLocaleString("pt-BR")}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground pt-1">
          {data.winDays} dia{data.winDays !== 1 ? "s" : ""} positivo{data.winDays !== 1 ? "s" : ""} · {data.lossDays} dia{data.lossDays !== 1 ? "s" : ""} negativo{data.lossDays !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
};

const StopGainTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  if (data.daysCount === 0) return null;

  const payoff = data.avgStop > 0 ? (data.avgGain / data.avgStop).toFixed(2) : "—";

  return (
    <div className="bg-card/95 backdrop-blur-xl border border-emerald-500/30 rounded-xl p-4 shadow-2xl">
      <p className="text-sm font-bold text-foreground mb-3">{label}</p>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Gain Ideal</span>
          <span className="font-bold text-emerald-400">
            R$ {data.avgGain.toLocaleString("pt-BR")}
          </span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Stop Ideal</span>
          <span className="font-bold text-red-400">
            R$ {data.avgStop.toLocaleString("pt-BR")}
          </span>
        </div>
        <div className="h-px bg-border/30 my-1" />
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Payoff</span>
          <span className="font-bold text-foreground">{payoff}x</span>
        </div>
        <p className="text-[10px] text-muted-foreground pt-1">
          {data.winDays} dia{data.winDays !== 1 ? "s" : ""} positivo{data.winDays !== 1 ? "s" : ""} · {data.lossDays} dia{data.lossDays !== 1 ? "s" : ""} negativo{data.lossDays !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
};

export default MarginAnalysis;
