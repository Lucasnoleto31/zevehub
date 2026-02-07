import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Target, Info, Clock, Zap, Shield, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LineChart, Line, ResponsiveContainer, Area, AreaChart } from "recharts";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface Operation {
  operation_date: string;
  result: number;
  strategy?: string;
}

interface Metrics {
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  expectancy: number;
  recoveryFactor: number;
  drawdownDuration: number;
}

interface HistoricalMetrics {
  month: string;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  expectancy: number;
  recoveryFactor: number;
  drawdownDuration: number;
}

interface AdvancedMetricsProps {
  operations: Operation[];
}

const AdvancedMetrics = ({ operations }: AdvancedMetricsProps) => {
  const [metricsByStrategy, setMetricsByStrategy] = useState<Record<string, Metrics>>({});
  const [historicalByStrategy, setHistoricalByStrategy] = useState<Record<string, HistoricalMetrics[]>>({});
  const [strategies, setStrategies] = useState<string[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>("");

  useEffect(() => {
    calculateMetricsByStrategy();
  }, [operations]);

  useEffect(() => {
    if (strategies.length > 0 && !selectedStrategy) {
      setSelectedStrategy(strategies[0]);
    }
  }, [strategies]);

  // Guard: skip heavy rendering for very large datasets
  if (operations.length > 50000) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-2 border-border/30 bg-gradient-to-br from-card via-card to-accent/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/20">
                <Activity className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Métricas Avançadas</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Dataset muito grande ({operations.length.toLocaleString()} operações). Refine os filtros.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  const calculateMetricsByStrategy = () => {
    if (operations.length === 0) {
      setMetricsByStrategy({});
      setHistoricalByStrategy({});
      setStrategies([]);
      return;
    }

    const operationsByStrategy: Record<string, Operation[]> = {};
    operations.forEach((op) => {
      const strategy = op.strategy || "Sem estratégia";
      if (!operationsByStrategy[strategy]) {
        operationsByStrategy[strategy] = [];
      }
      operationsByStrategy[strategy].push(op);
    });

    const calculatedMetrics: Record<string, Metrics> = {};
    const calculatedHistorical: Record<string, HistoricalMetrics[]> = {};
    const strategyNames = Object.keys(operationsByStrategy);

    strategyNames.forEach((strategy) => {
      const strategyOps = operationsByStrategy[strategy];
      calculatedMetrics[strategy] = calculateMetrics(strategyOps);
      calculatedHistorical[strategy] = calculateHistoricalMetrics(strategyOps);
    });

    setMetricsByStrategy(calculatedMetrics);
    setHistoricalByStrategy(calculatedHistorical);
    setStrategies(strategyNames);
  };

  const calculateHistoricalMetrics = (ops: Operation[]): HistoricalMetrics[] => {
    // Group operations by month
    const opsByMonth: Record<string, Operation[]> = {};
    ops.forEach((op) => {
      const month = op.operation_date.substring(0, 7); // YYYY-MM
      if (!opsByMonth[month]) {
        opsByMonth[month] = [];
      }
      opsByMonth[month].push(op);
    });

    // Calculate metrics for each month
    const months = Object.keys(opsByMonth).sort();
    const lastMonths = months.slice(-6); // Last 6 months

    return lastMonths.map((month) => {
      const monthOps = opsByMonth[month];
      const metrics = calculateMetrics(monthOps);
      return {
        month,
        ...metrics,
      };
    });
  };

  const calculateMetrics = (ops: Operation[]): Metrics => {
    if (ops.length === 0) {
      return {
        sharpeRatio: 0,
        maxDrawdown: 0,
        profitFactor: 0,
        expectancy: 0,
        recoveryFactor: 0,
        drawdownDuration: 0,
      };
    }
    
    const dailyResults = new Map<string, number>();
    ops.forEach((op) => {
      const date = op.operation_date;
      dailyResults.set(date, (dailyResults.get(date) || 0) + op.result);
    });

    const dailyReturns = Array.from(dailyResults.values());

    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) /
      dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    const riskFreeRate = 0;
    const sharpeRatio = stdDev !== 0 ? (avgReturn - riskFreeRate) / stdDev : 0;

    let peak = 0;
    let maxDrawdown = 0;
    let accumulated = 0;

    dailyReturns.forEach((result) => {
      accumulated += result;
      if (accumulated > peak) {
        peak = accumulated;
      }
      const drawdown = peak - accumulated;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    const gains = ops.filter((op) => op.result > 0).reduce((sum, op) => sum + op.result, 0);
    const losses = Math.abs(
      ops.filter((op) => op.result < 0).reduce((sum, op) => sum + op.result, 0)
    );
    const profitFactor = losses !== 0 ? gains / losses : gains > 0 ? Infinity : 0;

    const totalOperations = ops.length;
    const winningTrades = ops.filter((op) => op.result > 0).length;
    const losingTrades = ops.filter((op) => op.result < 0).length;
    const avgWin = winningTrades > 0 ? gains / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? losses / losingTrades : 0;
    const winRate = winningTrades / totalOperations;
    const lossRate = losingTrades / totalOperations;
    const expectancy = winRate * avgWin - lossRate * avgLoss;

    const totalProfit = ops.reduce((sum, op) => sum + op.result, 0);
    const recoveryFactor = maxDrawdown !== 0 ? totalProfit / maxDrawdown : 0;

    const sortedDates = Array.from(dailyResults.keys()).sort();
    let drawdownDurations: number[] = [];
    let currentDrawdownStart: string | null = null;
    let peakValue = 0;
    let accumulatedValue = 0;

    sortedDates.forEach((date, index) => {
      accumulatedValue += dailyResults.get(date) || 0;
      
      if (accumulatedValue > peakValue) {
        if (currentDrawdownStart !== null) {
          const startIndex = sortedDates.indexOf(currentDrawdownStart);
          const duration = index - startIndex;
          drawdownDurations.push(duration);
          currentDrawdownStart = null;
        }
        peakValue = accumulatedValue;
      } else if (accumulatedValue < peakValue && currentDrawdownStart === null) {
        currentDrawdownStart = date;
      }
    });

    if (currentDrawdownStart !== null) {
      const startIndex = sortedDates.indexOf(currentDrawdownStart);
      const duration = sortedDates.length - 1 - startIndex;
      drawdownDurations.push(duration);
    }

    const avgDrawdownDuration = drawdownDurations.length > 0
      ? drawdownDurations.reduce((a, b) => a + b, 0) / drawdownDurations.length
      : 0;

    return {
      sharpeRatio: isFinite(sharpeRatio) ? sharpeRatio : 0,
      maxDrawdown,
      profitFactor: isFinite(profitFactor) ? profitFactor : 0,
      expectancy,
      recoveryFactor: isFinite(recoveryFactor) ? recoveryFactor : 0,
      drawdownDuration: avgDrawdownDuration,
    };
  };

  const MiniSparkline = ({ 
    data, 
    dataKey, 
    color, 
    isInverted = false 
  }: { 
    data: HistoricalMetrics[]; 
    dataKey: keyof HistoricalMetrics; 
    color: string;
    isInverted?: boolean;
  }) => {
    if (!data || data.length < 2) return null;

    const values = data.map(d => d[dataKey] as number);
    const trend = values[values.length - 1] - values[0];
    const isTrendPositive = isInverted ? trend < 0 : trend > 0;

    return (
      <div className="relative h-12 w-full mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${dataKey}-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${dataKey}-${color})`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
        {/* Trend indicator */}
        <div className={cn(
          "absolute -top-1 right-0 text-[10px] font-bold px-1.5 py-0.5 rounded",
          isTrendPositive 
            ? "bg-emerald-500/20 text-emerald-400" 
            : "bg-rose-500/20 text-rose-400"
        )}>
          {isTrendPositive ? "↑" : "↓"} {Math.abs(((values[values.length - 1] - values[0]) / (values[0] || 1)) * 100).toFixed(0)}%
        </div>
      </div>
    );
  };

  const MetricCard = ({
    title,
    value,
    icon: Icon,
    description,
    tooltip,
    isPositive,
    accentColor = "primary",
    index = 0,
    sparklineData,
    sparklineKey,
    sparklineInverted = false,
  }: {
    title: string;
    value: string;
    icon: React.ElementType;
    description: string;
    tooltip: string;
    isPositive?: boolean;
    accentColor?: "emerald" | "rose" | "amber" | "cyan" | "violet" | "primary";
    index?: number;
    sparklineData?: HistoricalMetrics[];
    sparklineKey?: keyof HistoricalMetrics;
    sparklineInverted?: boolean;
  }) => {
    const colorClasses = {
      primary: {
        border: "border-primary/20 hover:border-primary/40",
        icon: "from-primary/20 to-primary/5 text-primary border-primary/20",
        glow: "from-primary/10",
        sparkline: "hsl(var(--primary))",
      },
      emerald: {
        border: "border-emerald-500/20 hover:border-emerald-500/40",
        icon: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
        glow: "from-emerald-500/10",
        sparkline: "#4ade80",
      },
      rose: {
        border: "border-rose-500/20 hover:border-rose-500/40",
        icon: "from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/20",
        glow: "from-rose-500/10",
        sparkline: "#f87171",
      },
      amber: {
        border: "border-amber-500/20 hover:border-amber-500/40",
        icon: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20",
        glow: "from-amber-500/10",
        sparkline: "#fbbf24",
      },
      cyan: {
        border: "border-cyan-500/20 hover:border-cyan-500/40",
        icon: "from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/20",
        glow: "from-cyan-500/10",
        sparkline: "#22d3ee",
      },
      violet: {
        border: "border-violet-500/20 hover:border-violet-500/40",
        icon: "from-violet-500/20 to-violet-500/5 text-violet-400 border-violet-500/20",
        glow: "from-violet-500/10",
        sparkline: "#a78bfa",
      },
    };

    const colors = colorClasses[accentColor];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: index * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
      >
        <Card className={cn(
          "group relative overflow-hidden backdrop-blur-xl transition-all duration-500",
          "bg-gradient-to-br from-card via-card to-accent/5",
          "border-2 hover:shadow-2xl hover:shadow-black/20",
          colors.border
        )}>
          {/* Gradient overlay on hover */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
            colors.glow,
            "via-transparent to-transparent"
          )} />
          
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] bg-[size:20px_20px]" />

          <CardContent className="pt-5 pb-4 relative z-10">
            <div className="space-y-1">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <motion.div 
                    className={cn(
                      "p-2 rounded-xl bg-gradient-to-br border shadow-lg",
                      colors.icon
                    )}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <Icon className="w-4 h-4" />
                  </motion.div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <button type="button" className="cursor-help">
                          <Info className="w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent 
                        side="top" 
                        align="center"
                        sideOffset={8}
                        className="max-w-[280px] z-[100] bg-popover text-popover-foreground border border-border shadow-lg"
                      >
                        <p className="text-xs leading-relaxed">{tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
              
              <motion.p
                className={cn(
                  "text-2xl md:text-3xl font-black tracking-tight",
                  isPositive !== undefined
                    ? isPositive
                      ? "text-emerald-400"
                      : "text-rose-400"
                    : "text-foreground"
                )}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.08 + 0.2, type: "spring", stiffness: 200 }}
              >
                {value}
              </motion.p>
              
              <div className="flex items-center gap-1.5">
                {isPositive !== undefined && (
                  isPositive ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                  )
                )}
                <p className="text-xs text-muted-foreground font-medium">{description}</p>
              </div>

              {/* Sparkline */}
              {sparklineData && sparklineKey && sparklineData.length >= 2 && (
                <MiniSparkline 
                  data={sparklineData} 
                  dataKey={sparklineKey} 
                  color={colors.sparkline}
                  isInverted={sparklineInverted}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const renderMetricsForStrategy = (metrics: Metrics, historical: HistoricalMetrics[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <MetricCard
        title="Sharpe Ratio"
        value={metrics.sharpeRatio.toFixed(2)}
        icon={Zap}
        description={
          metrics.sharpeRatio > 1
            ? "Excelente retorno ajustado"
            : metrics.sharpeRatio > 0
            ? "Retorno positivo com risco"
            : "Retorno abaixo do esperado"
        }
        tooltip="Mede o retorno ajustado ao risco. Valores acima de 1 são considerados bons, acima de 2 excelentes."
        isPositive={metrics.sharpeRatio > 0}
        accentColor={metrics.sharpeRatio > 0 ? "emerald" : "rose"}
        index={0}
        sparklineData={historical}
        sparklineKey="sharpeRatio"
      />

      <MetricCard
        title="Max Drawdown"
        value={metrics.maxDrawdown.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
        icon={TrendingDown}
        description="Maior perda acumulada"
        tooltip="A maior queda do pico até o vale. Indica o maior risco histórico enfrentado."
        isPositive={false}
        accentColor="rose"
        index={1}
        sparklineData={historical}
        sparklineKey="maxDrawdown"
        sparklineInverted={true}
      />

      <MetricCard
        title="Profit Factor"
        value={
          isFinite(metrics.profitFactor)
            ? metrics.profitFactor.toFixed(2)
            : "∞"
        }
        icon={Target}
        description={
          metrics.profitFactor > 2
            ? "Performance excepcional"
            : metrics.profitFactor > 1
            ? "Estratégia lucrativa"
            : "Necessita ajustes"
        }
        tooltip="Relação entre lucros e perdas. Valores acima de 1.5 indicam boa lucratividade."
        isPositive={metrics.profitFactor > 1}
        accentColor={metrics.profitFactor > 1 ? "emerald" : "rose"}
        index={2}
        sparklineData={historical}
        sparklineKey="profitFactor"
      />

      <MetricCard
        title="Expectancy"
        value={metrics.expectancy.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
        icon={Activity}
        description="Ganho esperado por operação"
        tooltip="Valor médio esperado de ganho ou perda por operação executada."
        isPositive={metrics.expectancy > 0}
        accentColor={metrics.expectancy > 0 ? "cyan" : "rose"}
        index={3}
        sparklineData={historical}
        sparklineKey="expectancy"
      />

      <MetricCard
        title="Recovery Factor"
        value={metrics.recoveryFactor.toFixed(2)}
        icon={Shield}
        description={
          metrics.recoveryFactor > 3
            ? "Recuperação forte"
            : metrics.recoveryFactor > 1
            ? "Boa recuperação"
            : "Recuperação lenta"
        }
        tooltip="Relação entre lucro total e drawdown máximo. Valores acima de 2 são bons."
        isPositive={metrics.recoveryFactor > 1}
        accentColor={metrics.recoveryFactor > 1 ? "violet" : "amber"}
        index={4}
        sparklineData={historical}
        sparklineKey="recoveryFactor"
      />

      <MetricCard
        title="Drawdown Duration"
        value={`${metrics.drawdownDuration.toFixed(1)} dias`}
        icon={Clock}
        description={
          metrics.drawdownDuration < 5
            ? "Recuperação muito rápida"
            : metrics.drawdownDuration < 10
            ? "Recuperação rápida"
            : metrics.drawdownDuration < 20
            ? "Recuperação moderada"
            : "Recuperação lenta"
        }
        tooltip="Tempo médio em dias para recuperar de um período de drawdown. Valores menores indicam recuperação mais rápida."
        isPositive={metrics.drawdownDuration < 10}
        accentColor={metrics.drawdownDuration < 10 ? "emerald" : "amber"}
        index={5}
        sparklineData={historical}
        sparklineKey="drawdownDuration"
        sparklineInverted={true}
      />
    </div>
  );

  if (strategies.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-2 border-border/30 bg-gradient-to-br from-card via-card to-accent/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/20">
                <Activity className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Métricas Avançadas por Robô</CardTitle>
                <CardDescription>Nenhuma operação encontrada</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={cn(
        "border-2 overflow-hidden backdrop-blur-xl",
        "bg-gradient-to-br from-card via-card to-violet-500/5",
        "border-violet-500/20"
      )}>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <motion.div 
              className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/20 shadow-lg shadow-violet-500/10"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Activity className="w-6 h-6 text-violet-400" />
            </motion.div>
            <div>
              <CardTitle className="text-xl font-bold">Métricas Avançadas por Robô</CardTitle>
              <CardDescription className="text-sm">Indicadores de risco e performance ajustada por estratégia • Últimos 6 meses</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Strategy Selector - Premium Pills */}
          <div className="flex flex-wrap gap-2 p-2 rounded-2xl bg-muted/30 border border-border/30">
            {strategies.map((strategy, index) => (
              <motion.button
                key={strategy}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedStrategy(strategy)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
                  selectedStrategy === strategy
                    ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/30"
                    : "bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground border border-transparent hover:border-border/50"
                )}
              >
                {strategy}
              </motion.button>
            ))}
          </div>

          {/* Metrics Grid */}
          {selectedStrategy && metricsByStrategy[selectedStrategy] && (
            <motion.div
              key={selectedStrategy}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderMetricsForStrategy(
                metricsByStrategy[selectedStrategy],
                historicalByStrategy[selectedStrategy] || []
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdvancedMetrics;
