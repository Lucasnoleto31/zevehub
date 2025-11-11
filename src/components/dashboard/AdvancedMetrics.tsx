import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Target, Info, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface AdvancedMetricsProps {
  operations: Operation[];
}

const AdvancedMetrics = ({ operations }: AdvancedMetricsProps) => {
  const [metricsByStrategy, setMetricsByStrategy] = useState<Record<string, Metrics>>({});
  const [strategies, setStrategies] = useState<string[]>([]);

  useEffect(() => {
    calculateMetricsByStrategy();
  }, [operations]);

  const calculateMetricsByStrategy = () => {
    if (operations.length === 0) {
      setMetricsByStrategy({});
      setStrategies([]);
      return;
    }

    // Agrupar operações por estratégia
    const operationsByStrategy: Record<string, Operation[]> = {};
    operations.forEach((op) => {
      const strategy = op.strategy || "Sem estratégia";
      if (!operationsByStrategy[strategy]) {
        operationsByStrategy[strategy] = [];
      }
      operationsByStrategy[strategy].push(op);
    });

    const calculatedMetrics: Record<string, Metrics> = {};
    const strategyNames = Object.keys(operationsByStrategy);

    strategyNames.forEach((strategy) => {
      const strategyOps = operationsByStrategy[strategy];
      calculatedMetrics[strategy] = calculateMetrics(strategyOps);
    });

    setMetricsByStrategy(calculatedMetrics);
    setStrategies(strategyNames);
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
    // Agrupar por dia
    const dailyResults = new Map<string, number>();
    ops.forEach((op) => {
      const date = op.operation_date;
      dailyResults.set(date, (dailyResults.get(date) || 0) + op.result);
    });

    const dailyReturns = Array.from(dailyResults.values());

    // Calcular Sharpe Ratio
    const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance =
      dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) /
      dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    const riskFreeRate = 0;
    const sharpeRatio = stdDev !== 0 ? (avgReturn - riskFreeRate) / stdDev : 0;

    // Calcular Maximum Drawdown
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

    // Calcular Profit Factor
    const gains = ops.filter((op) => op.result > 0).reduce((sum, op) => sum + op.result, 0);
    const losses = Math.abs(
      ops.filter((op) => op.result < 0).reduce((sum, op) => sum + op.result, 0)
    );
    const profitFactor = losses !== 0 ? gains / losses : gains > 0 ? Infinity : 0;

    // Calcular Expectancy (expectativa)
    const totalOperations = ops.length;
    const winningTrades = ops.filter((op) => op.result > 0).length;
    const losingTrades = ops.filter((op) => op.result < 0).length;
    const avgWin = winningTrades > 0 ? gains / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? losses / losingTrades : 0;
    const winRate = winningTrades / totalOperations;
    const lossRate = losingTrades / totalOperations;
    const expectancy = winRate * avgWin - lossRate * avgLoss;

    // Calcular Recovery Factor
    const totalProfit = ops.reduce((sum, op) => sum + op.result, 0);
    const recoveryFactor = maxDrawdown !== 0 ? totalProfit / maxDrawdown : 0;

    // Calcular Drawdown Duration (duração média de drawdowns em dias)
    const sortedDates = Array.from(dailyResults.keys()).sort();
    let drawdownDurations: number[] = [];
    let currentDrawdownStart: string | null = null;
    let peakValue = 0;
    let accumulatedValue = 0;

    sortedDates.forEach((date, index) => {
      accumulatedValue += dailyResults.get(date) || 0;
      
      if (accumulatedValue > peakValue) {
        // Novo pico - se estava em drawdown, terminou
        if (currentDrawdownStart !== null) {
          const startIndex = sortedDates.indexOf(currentDrawdownStart);
          const duration = index - startIndex;
          drawdownDurations.push(duration);
          currentDrawdownStart = null;
        }
        peakValue = accumulatedValue;
      } else if (accumulatedValue < peakValue && currentDrawdownStart === null) {
        // Começou um drawdown
        currentDrawdownStart = date;
      }
    });

    // Se terminou em drawdown, conta até o último dia
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


  const MetricCard = ({
    title,
    value,
    icon: Icon,
    description,
    tooltip,
    isPositive,
  }: {
    title: string;
    value: string;
    icon: any;
    description: string;
    tooltip: string;
    isPositive?: boolean;
  }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p
              className={`text-3xl font-bold ${
                isPositive !== undefined
                  ? isPositive
                    ? "text-success"
                    : "text-destructive"
                  : "text-foreground"
              }`}
            >
              {value}
            </p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderMetricsForStrategy = (metrics: Metrics) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <MetricCard
        title="Sharpe Ratio"
        value={metrics.sharpeRatio.toFixed(2)}
        icon={TrendingUp}
        description={
          metrics.sharpeRatio > 1
            ? "Excelente retorno ajustado"
            : metrics.sharpeRatio > 0
            ? "Retorno positivo com risco"
            : "Retorno abaixo do esperado"
        }
        tooltip="Mede o retorno ajustado ao risco. Valores acima de 1 são considerados bons, acima de 2 excelentes."
        isPositive={metrics.sharpeRatio > 0}
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
      />

      <MetricCard
        title="Recovery Factor"
        value={metrics.recoveryFactor.toFixed(2)}
        icon={TrendingUp}
        description={
          metrics.recoveryFactor > 3
            ? "Recuperação forte"
            : metrics.recoveryFactor > 1
            ? "Boa recuperação"
            : "Recuperação lenta"
        }
        tooltip="Relação entre lucro total e drawdown máximo. Valores acima de 2 são bons."
        isPositive={metrics.recoveryFactor > 1}
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
      />
    </div>
  );

  if (strategies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Métricas Avançadas por Robô
          </CardTitle>
          <CardDescription>
            Nenhuma operação encontrada para exibir métricas
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Métricas Avançadas por Robô
        </CardTitle>
        <CardDescription>
          Indicadores de risco e performance ajustada por estratégia
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={strategies[0]} className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto">
            {strategies.map((strategy) => (
              <TabsTrigger key={strategy} value={strategy} className="flex-1 min-w-[120px]">
                {strategy}
              </TabsTrigger>
            ))}
          </TabsList>
          {strategies.map((strategy) => (
            <TabsContent key={strategy} value={strategy} className="mt-6">
              {renderMetricsForStrategy(metricsByStrategy[strategy])}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdvancedMetrics;
