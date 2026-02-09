import { useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Shield, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const STOP_SAFETY_MARGIN = 1.4;

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

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const MarginAnalysis = ({ filteredOperations }: MarginAnalysisProps) => {
  const { hourlyData, totalMargin, avgGain, avgStop } = useMemo(() => {
    const hourBuckets: Record<number, { results: number[]; positives: number[]; negatives: number[] }> = {};

    for (let h = 9; h <= 18; h++) {
      hourBuckets[h] = { results: [], positives: [], negatives: [] };
    }

    for (const op of filteredOperations) {
      const hour = parseInt(op.operation_time.split(":")[0]);
      if (hour < 9 || hour > 18) continue;
      const bucket = hourBuckets[hour];
      bucket.results.push(op.result);
      if (op.result > 0) bucket.positives.push(op.result);
      else if (op.result < 0) bucket.negatives.push(op.result);
    }

    const hourlyData = [];
    let totalMarginSum = 0;
    const gains: number[] = [];
    const stops: number[] = [];

    for (let h = 9; h <= 18; h++) {
      const b = hourBuckets[h];
      const margin = b.results.reduce((s, v) => s + v, 0);
      const gain = b.positives.length > 0
        ? Math.round(b.positives.reduce((s, v) => s + v, 0) / b.positives.length)
        : 0;
      const stop = b.negatives.length > 0
        ? Math.round((Math.abs(b.negatives.reduce((s, v) => s + v, 0)) / b.negatives.length) * STOP_SAFETY_MARGIN)
        : 0;

      totalMarginSum += margin;
      if (gain > 0) gains.push(gain);
      if (stop > 0) stops.push(stop);

      hourlyData.push({
        hora: `${h}h`,
        margem: Math.round(margin),
        gain,
        stop,
        operacoes: b.results.length,
      });
    }

    const avgGain = gains.length > 0 ? Math.round(gains.reduce((s, v) => s + v, 0) / gains.length) : 0;
    const avgStop = stops.length > 0 ? Math.round(stops.reduce((s, v) => s + v, 0) / stops.length) : 0;

    return { hourlyData, totalMargin: Math.round(totalMarginSum), avgGain, avgStop };
  }, [filteredOperations]);

  if (filteredOperations.length === 0) return null;

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    return (
      <div className="rounded-xl border border-border/50 bg-[#0a0a1a] px-4 py-3 shadow-xl backdrop-blur-sm">
        <p className="text-sm font-semibold text-white mb-2">{label}</p>
        <div className="space-y-1 text-xs">
          <p className="text-emerald-400">Margem: {formatCurrency(data.margem)}</p>
          <p className="text-cyan-400">Gain Ideal: {formatCurrency(data.gain)}</p>
          <p className="text-rose-400">Stop Ideal: {formatCurrency(data.stop)}</p>
          <p className="text-muted-foreground mt-1">{data.operacoes} operações</p>
        </div>
      </div>
    );
  };

  const cards = [
    {
      label: "Margem Total",
      value: formatCurrency(totalMargin),
      icon: DollarSign,
      color: "emerald",
      borderClass: "border-emerald-500/30",
      bgClass: "from-emerald-500/10 to-emerald-500/5",
      iconBg: "bg-emerald-500/15",
      iconColor: "text-emerald-400",
    },
    {
      label: "Gain Ideal",
      value: formatCurrency(avgGain),
      icon: TrendingUp,
      color: "cyan",
      borderClass: "border-cyan-500/30",
      bgClass: "from-cyan-500/10 to-cyan-500/5",
      iconBg: "bg-cyan-500/15",
      iconColor: "text-cyan-400",
    },
    {
      label: "Stop Ideal",
      value: formatCurrency(avgStop),
      sublabel: "Média + 40% margem de segurança",
      icon: Shield,
      color: "rose",
      borderClass: "border-rose-500/30",
      bgClass: "from-rose-500/10 to-rose-500/5",
      iconBg: "bg-rose-500/15",
      iconColor: "text-rose-400",
    },
  ];

  return (
    <motion.div variants={itemVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card) => (
          <motion.div
            key={card.label}
            variants={itemVariants}
            className={`rounded-2xl border ${card.borderClass} bg-gradient-to-br ${card.bgClass} p-5 backdrop-blur-sm`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <span className="text-sm text-muted-foreground font-medium">{card.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            {card.sublabel && (
              <p className="text-xs text-muted-foreground mt-1">{card.sublabel}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Chart */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-card/80 to-card/40 p-6 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Análise por Horário</h3>
            <p className="text-xs text-muted-foreground">
              Margem acumulada, gain ideal e stop ideal (com +40% de segurança) por hora
            </p>
          </div>
        </div>

        <div className="h-[350px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} barGap={2} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="hora" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value: string) => <span className="text-muted-foreground">{value}</span>}
              />
              <Bar dataKey="margem" name="Margem" fill="#34d399" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gain" name="Gain Ideal" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              <Bar dataKey="stop" name="Stop Ideal" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MarginAnalysis;
