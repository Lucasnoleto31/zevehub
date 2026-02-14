import { useState, useMemo } from "react";
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
import { DollarSign, TrendingDown, Percent, AlertTriangle } from "lucide-react";

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
  strategy: string | null;
  contracts: number;
}

interface CapitalSimulatorProps {
  filteredOperations: Operation[];
}

const CapitalSimulator = ({ filteredOperations }: CapitalSimulatorProps) => {
  const [capitalInput, setCapitalInput] = useState("");

  const capital = useMemo(() => {
    const cleaned = capitalInput.replace(/\D/g, "");
    return cleaned ? parseInt(cleaned, 10) / 100 : 0;
  }, [capitalInput]);

  const handleCapitalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setCapitalInput("");
      return;
    }
    const num = parseInt(raw, 10) / 100;
    setCapitalInput(
      num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  };

  const simulation = useMemo(() => {
    if (capital <= 0 || filteredOperations.length === 0) return null;

    // Aggregate by day
    const dailyMap: Record<string, number> = {};
    for (const op of filteredOperations) {
      dailyMap[op.operation_date] = (dailyMap[op.operation_date] || 0) + op.result;
    }
    const sortedDays = Object.entries(dailyMap).sort(([a], [b]) => a.localeCompare(b));

    let balance = capital;
    let peak = capital;
    let maxDrawdown = 0;
    let brokeDay: number | null = null;

    const chartData = [{ day: "Início", balance: capital, date: "" }];

    for (let i = 0; i < sortedDays.length; i++) {
      const [date, result] = sortedDays[i];
      balance += result;

      if (balance > peak) peak = balance;
      const dd = peak > 0 ? ((peak - balance) / peak) * 100 : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;

      const [, m, d] = date.split("-");
      chartData.push({ day: `${d}/${m}`, balance: Math.round(balance * 100) / 100, date });

      if (balance <= 0 && brokeDay === null) {
        brokeDay = i + 1;
      }
    }

    const finalBalance = balance;
    const yieldPct = capital > 0 ? ((finalBalance - capital) / capital) * 100 : 0;

    return { chartData, finalBalance, brokeDay, yieldPct, maxDrawdown, totalDays: sortedDays.length };
  }, [capital, filteredOperations]);

  const formatCurrency = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const cards = simulation
    ? [
        {
          label: "Saldo Final",
          value: formatCurrency(simulation.finalBalance),
          color: simulation.finalBalance >= capital ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
          bg: simulation.finalBalance >= capital ? "bg-emerald-500/15" : "bg-red-500/15",
          icon: DollarSign,
          sub: `Capital inicial: ${formatCurrency(capital)}`,
        },
        {
          label: "Dias p/ Quebrar",
          value: simulation.brokeDay !== null ? `${simulation.brokeDay} dias` : "Não quebrou",
          color: simulation.brokeDay !== null ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
          bg: simulation.brokeDay !== null ? "bg-red-500/15" : "bg-emerald-500/15",
          icon: AlertTriangle,
          sub: simulation.brokeDay !== null ? "Saldo chegou a zero" : `Sobreviveu ${simulation.totalDays} dias`,
        },
        {
          label: "Rendimento",
          value: `${simulation.yieldPct >= 0 ? "+" : ""}${simulation.yieldPct.toFixed(1)}%`,
          color: simulation.yieldPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
          bg: simulation.yieldPct >= 0 ? "bg-emerald-500/15" : "bg-red-500/15",
          icon: Percent,
          sub: "Retorno sobre o capital",
        },
        {
          label: "Drawdown Máximo",
          value: `${simulation.maxDrawdown.toFixed(1)}%`,
          color: simulation.maxDrawdown > 50 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400",
          bg: simulation.maxDrawdown > 50 ? "bg-red-500/15" : "bg-amber-500/15",
          icon: TrendingDown,
          sub: "Maior queda do pico",
        },
      ]
    : [];

  // Downsample chart for performance
  const chartData = useMemo(() => {
    if (!simulation) return [];
    const data = simulation.chartData;
    if (data.length <= 365) return data;
    const step = Math.ceil(data.length / 365);
    return data.filter((_, i) => i === 0 || i === data.length - 1 || i % step === 0);
  }, [simulation]);

  return (
    <div className="space-y-6">
      {/* Capital Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 bg-gradient-to-br from-card via-card/95 to-accent/5 border border-emerald-500/20"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-emerald-500/15">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold">Simulador de Capital</h3>
            <p className="text-xs text-muted-foreground">
              Simule a evolução do seu capital com os resultados reais dos robôs
            </p>
          </div>
        </div>

        <div className="relative max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
            R$
          </span>
          <input
            type="text"
            value={capitalInput}
            onChange={handleCapitalChange}
            placeholder="5.000,00"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm text-base font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 placeholder:text-muted-foreground/50"
          />
        </div>
      </motion.div>

      {/* Results */}
      {simulation && (
        <>
          {/* Metric Cards */}
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
            className="rounded-2xl p-6 bg-gradient-to-br from-card via-card/95 to-accent/5 border border-emerald-500/20"
          >
            <h3 className="text-base font-bold mb-1">Evolução do Saldo</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Capital + resultados diários acumulados
            </p>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="capitalGradPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    interval="preserveStartEnd"
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
                  <ReferenceLine
                    y={0}
                    stroke="#ef4444"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{ value: "Quebra", position: "right", fill: "#ef4444", fontSize: 10 }}
                  />
                  <ReferenceLine
                    y={capital}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                  />
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      const diff = d.balance - capital;
                      return (
                        <div className="rounded-xl border border-border/50 bg-[#0a0a1a] px-4 py-3 text-xs shadow-2xl space-y-1">
                          <p className="font-bold text-white text-sm">{d.day}</p>
                          <p className={d.balance >= capital ? "text-emerald-400" : "text-red-400"}>
                            Saldo: {formatCurrency(d.balance)}
                          </p>
                          <p className={diff >= 0 ? "text-emerald-400" : "text-red-400"}>
                            P&L: {diff >= 0 ? "+" : ""}{formatCurrency(diff)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#capitalGradPos)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default CapitalSimulator;
