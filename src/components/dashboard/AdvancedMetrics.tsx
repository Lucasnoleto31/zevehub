import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Target, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Metrics {
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  expectancy: number;
  recoveryFactor: number;
}

const AdvancedMetrics = () => {
  const [metrics, setMetrics] = useState<Metrics>({
    sharpeRatio: 0,
    maxDrawdown: 0,
    profitFactor: 0,
    expectancy: 0,
    recoveryFactor: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateMetrics();
  }, []);

  const calculateMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from("trading_operations")
        .select("operation_date, result")
        .order("operation_date", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Agrupar por dia
        const dailyResults = new Map<string, number>();
        data.forEach((op) => {
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
        const riskFreeRate = 0; // Taxa livre de risco (pode ajustar)
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
        const gains = data.filter((op) => op.result > 0).reduce((sum, op) => sum + op.result, 0);
        const losses = Math.abs(
          data.filter((op) => op.result < 0).reduce((sum, op) => sum + op.result, 0)
        );
        const profitFactor = losses !== 0 ? gains / losses : gains > 0 ? Infinity : 0;

        // Calcular Expectancy (expectativa)
        const totalOperations = data.length;
        const winningTrades = data.filter((op) => op.result > 0).length;
        const losingTrades = data.filter((op) => op.result < 0).length;
        const avgWin = winningTrades > 0 ? gains / winningTrades : 0;
        const avgLoss = losingTrades > 0 ? losses / losingTrades : 0;
        const winRate = winningTrades / totalOperations;
        const lossRate = losingTrades / totalOperations;
        const expectancy = winRate * avgWin - lossRate * avgLoss;

        // Calcular Recovery Factor
        const totalProfit = data.reduce((sum, op) => sum + op.result, 0);
        const recoveryFactor = maxDrawdown !== 0 ? totalProfit / maxDrawdown : 0;

        setMetrics({
          sharpeRatio: isFinite(sharpeRatio) ? sharpeRatio : 0,
          maxDrawdown,
          profitFactor: isFinite(profitFactor) ? profitFactor : 0,
          expectancy,
          recoveryFactor: isFinite(recoveryFactor) ? recoveryFactor : 0,
        });
      }
    } catch (error) {
      console.error("Erro ao calcular métricas:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Métricas Avançadas
        </CardTitle>
        <CardDescription>
          Indicadores de risco e performance ajustada
        </CardDescription>
      </CardHeader>
      <CardContent>
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
        </div>
      </CardContent>
    </Card>
  );
};

export default AdvancedMetrics;
