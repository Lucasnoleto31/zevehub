import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid, Cell,
} from "recharts";
import { Shield, DollarSign, Clock, TrendingUp } from "lucide-react";
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
      return {
        hourlyData: MARKET_HOURS.map(h => ({
          hour: `${h}h`,
          avgContracts: 0,
          maxContracts: 0,
          avgMargin: 0,
          peakMargin: 0,
          daysCount: 0,
        })),
        summaryStats: {
          overallAvgMargin: 0,
          peakHour: "—",
          peakMarginValue: 0,
          avgContractsPerDay: 0,
        },
      };
    }

    // Group contracts by (date, hour)
    const dateHourMap: Record<string, Record<number, number>> = {};

    for (const op of operations) {
      const date = op.operation_date;
      const hour = parseInt(op.operation_time.split(":")[0]);
      if (!MARKET_HOURS.includes(hour)) continue;

      if (!dateHourMap[date]) dateHourMap[date] = {};
      dateHourMap[date][hour] = (dateHourMap[date][hour] || 0) + (op.contracts || 1);
    }

    // Calculate avg and max per hour
    const hourAgg: Record<number, { total: number; max: number; days: number }> = {};
    for (const h of MARKET_HOURS) {
      hourAgg[h] = { total: 0, max: 0, days: 0 };
    }

    // Also track total contracts per day for daily average
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
      return {
        hour: `${h}h`,
        avgContracts: Math.round(avgContracts * 100) / 100,
        maxContracts: agg.max,
        avgMargin: Math.round(avgContracts * MARGIN_PER_CONTRACT),
        peakMargin: agg.max * MARGIN_PER_CONTRACT,
        daysCount: agg.days,
      };
    });

    // Summary stats
    const hoursWithData = hourlyData.filter(h => h.daysCount > 0);
    const overallAvgMargin = hoursWithData.length > 0
      ? Math.round(hoursWithData.reduce((sum, h) => sum + h.avgMargin, 0) / hoursWithData.length)
      : 0;

    const peakEntry = hourlyData.reduce((best, h) => h.peakMargin > best.peakMargin ? h : best, hourlyData[0]);

    return {
      hourlyData,
      summaryStats: {
        overallAvgMargin,
        peakHour: peakEntry.hour,
        peakMarginValue: peakEntry.peakMargin,
        avgContractsPerDay: totalDays > 0
          ? Math.round((totalContractsAllDays / totalDays) * 100) / 100
          : 0,
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
              <CardTitle className="text-lg font-bold">Margem Necessária por Hora</CardTitle>
              <CardDescription className="text-xs">
                Análise de margem baseada em R$ {MARGIN_PER_CONTRACT},00/contrato (com deságio de 30%)
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          </div>

          {/* Bar Chart */}
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

          {/* Legend */}
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
        <p className="text-[10px] text-muted-foreground pt-1">
          Baseado em {data.daysCount} dia{data.daysCount > 1 ? "s" : ""} operado{data.daysCount > 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
};

export default MarginAnalysis;
