import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Operation {
  operation_date: string;
  result: number;
  strategy: string | null;
}

interface StrategyCorrelationAnalysisProps {
  operations: Operation[];
}

const StrategyCorrelationAnalysis = ({ operations }: StrategyCorrelationAnalysisProps) => {
  // Agrupar operações por data e estratégia
  const groupByDateAndStrategy = () => {
    const strategies = Array.from(new Set(operations.map(op => op.strategy).filter(Boolean))) as string[];
    
    if (strategies.length < 2) {
      return { strategies: [], correlationMatrix: [], dailyResults: {} };
    }

    // Criar um mapa de resultados diários por estratégia
    const dailyResults: { [date: string]: { [strategy: string]: number } } = {};

    operations.forEach(op => {
      if (!op.strategy) return;
      
      const date = op.operation_date;
      if (!dailyResults[date]) {
        dailyResults[date] = {};
      }
      
      if (!dailyResults[date][op.strategy]) {
        dailyResults[date][op.strategy] = 0;
      }
      
      dailyResults[date][op.strategy] += op.result;
    });

    return { strategies, dailyResults };
  };

  // Calcular correlação de Pearson entre duas séries
  const calculateCorrelation = (series1: number[], series2: number[]): number => {
    if (series1.length !== series2.length || series1.length === 0) return 0;

    const n = series1.length;
    const mean1 = series1.reduce((a, b) => a + b, 0) / n;
    const mean2 = series2.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = series1[i] - mean1;
      const diff2 = series2[i] - mean2;
      numerator += diff1 * diff2;
      sum1Sq += diff1 * diff1;
      sum2Sq += diff2 * diff2;
    }

    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    return denominator === 0 ? 0 : numerator / denominator;
  };

  // Construir matriz de correlação
  const buildCorrelationMatrix = () => {
    const { strategies, dailyResults } = groupByDateAndStrategy();
    
    if (strategies.length < 2) return null;

    // Obter todas as datas únicas
    const dates = Object.keys(dailyResults).sort();
    
    // Construir séries temporais para cada estratégia
    const strategySeries: { [strategy: string]: number[] } = {};
    
    strategies.forEach(strategy => {
      strategySeries[strategy] = dates.map(date => dailyResults[date][strategy] || 0);
    });

    // Calcular matriz de correlação
    const matrix: { strategy1: string; strategy2: string; correlation: number }[] = [];
    
    for (let i = 0; i < strategies.length; i++) {
      for (let j = 0; j < strategies.length; j++) {
        const correlation = i === j ? 1 : calculateCorrelation(
          strategySeries[strategies[i]],
          strategySeries[strategies[j]]
        );
        
        matrix.push({
          strategy1: strategies[i],
          strategy2: strategies[j],
          correlation: correlation
        });
      }
    }

    return { strategies, matrix };
  };

  const result = buildCorrelationMatrix();

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Análise de Correlação de Estratégias
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>É necessário ter pelo menos 2 estratégias com operações para calcular a correlação.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <CardDescription>
            Medida estatística de como os resultados de diferentes estratégias se relacionam
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dados insuficientes. Adicione operações com diferentes estratégias para visualizar a correlação.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { strategies, matrix } = result;

  // Função para determinar a cor baseada na correlação
  const getCorrelationColor = (value: number) => {
    if (value >= 0.7) return "bg-green-500/80";
    if (value >= 0.3) return "bg-green-500/50";
    if (value >= 0.1) return "bg-green-500/20";
    if (value >= -0.1) return "bg-gray-500/20";
    if (value >= -0.3) return "bg-red-500/20";
    if (value >= -0.7) return "bg-red-500/50";
    return "bg-red-500/80";
  };

  // Função para obter descrição da correlação
  const getCorrelationDescription = (value: number) => {
    if (value >= 0.7) return "Correlação positiva forte";
    if (value >= 0.3) return "Correlação positiva moderada";
    if (value >= 0.1) return "Correlação positiva fraca";
    if (value >= -0.1) return "Sem correlação";
    if (value >= -0.3) return "Correlação negativa fraca";
    if (value >= -0.7) return "Correlação negativa moderada";
    return "Correlação negativa forte";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Análise de Correlação de Estratégias
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="mb-2">A correlação varia de -1 a +1:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>+1:</strong> Correlação perfeita positiva - estratégias ganham/perdem juntas</li>
                  <li><strong>0:</strong> Sem correlação - estratégias são independentes</li>
                  <li><strong>-1:</strong> Correlação perfeita negativa - quando uma ganha, a outra perde</li>
                </ul>
                <p className="mt-2 text-xs">
                  Estratégias com baixa correlação podem diversificar seu risco.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <CardDescription>
          Matriz de correlação entre pares de estratégias (baseada em resultados diários)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border border-border p-2 text-sm font-medium bg-muted/50"></th>
                {strategies.map((strategy) => (
                  <th
                    key={strategy}
                    className="border border-border p-2 text-sm font-medium bg-muted/50 min-w-[100px]"
                  >
                    {strategy}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {strategies.map((strategy1) => (
                <tr key={strategy1}>
                  <td className="border border-border p-2 text-sm font-medium bg-muted/50">
                    {strategy1}
                  </td>
                  {strategies.map((strategy2) => {
                    const cell = matrix.find(
                      (m) => m.strategy1 === strategy1 && m.strategy2 === strategy2
                    );
                    const correlation = cell?.correlation || 0;
                    
                    return (
                      <TooltipProvider key={strategy2}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <td
                              className={cn(
                                "border border-border p-2 text-center cursor-help transition-colors",
                                getCorrelationColor(correlation)
                              )}
                            >
                              <span className="text-sm font-medium">
                                {correlation.toFixed(2)}
                              </span>
                            </td>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-semibold">{strategy1} × {strategy2}</p>
                              <p className="text-xs">{getCorrelationDescription(correlation)}</p>
                              <p className="text-xs text-muted-foreground">
                                Valor: {(correlation * 100).toFixed(0)}%
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-semibold">Legenda de Interpretação:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500/80 rounded"></div>
              <span><strong>0.7 a 1.0:</strong> Correlação positiva forte - movem-se juntas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500/50 rounded"></div>
              <span><strong>0.3 a 0.7:</strong> Correlação positiva moderada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-500/20 rounded"></div>
              <span><strong>-0.1 a 0.1:</strong> Sem correlação - independentes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500/80 rounded"></div>
              <span><strong>-1.0 a -0.7:</strong> Correlação negativa forte - movem-se opostas</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            💡 <strong>Dica:</strong> Estratégias com correlação próxima de zero ou negativa podem ajudar a diversificar seu portfólio, 
            reduzindo o risco total. Estratégias altamente correlacionadas tendem a amplificar os resultados (ganhos e perdas).
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StrategyCorrelationAnalysis;