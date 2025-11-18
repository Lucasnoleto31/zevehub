import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Target, PieChart as PieChartIcon } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

interface Investment {
  id: string;
  name: string;
  type: 'stocks' | 'fixed_income';
  amount: number;
  currentValue: number;
  acquisitionDate: string;
}

interface PerformanceReportsProps {
  investments: Investment[];
}

export const PerformanceReports = ({ investments }: PerformanceReportsProps) => {
  // CDI e IPCA anualizados (valores de referência - em produção viriam de API)
  const CDI_RATE = 10.65; // % ao ano
  const IPCA_RATE = 4.5; // % ao ano

  const performanceMetrics = useMemo(() => {
    if (investments.length === 0) {
      return null;
    }

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const currentValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalReturn = currentValue - totalInvested;
    const returnPercentage = (totalReturn / totalInvested) * 100;

    // Calcular tempo médio de investimento (simplificado)
    const avgDaysInvested = investments.reduce((sum, inv) => {
      const days = Math.max(1, Math.floor((Date.now() - new Date(inv.acquisitionDate).getTime()) / (1000 * 60 * 60 * 24)));
      return sum + days;
    }, 0) / investments.length;

    const avgYearsInvested = avgDaysInvested / 365;

    // Retorno anualizado
    const annualizedReturn = avgYearsInvested > 0 
      ? (Math.pow(currentValue / totalInvested, 1 / avgYearsInvested) - 1) * 100 
      : returnPercentage;

    // Calcular volatilidade (desvio padrão dos retornos individuais)
    const individualReturns = investments.map(inv => 
      ((inv.currentValue - inv.amount) / inv.amount) * 100
    );
    const avgReturn = individualReturns.reduce((a, b) => a + b, 0) / individualReturns.length;
    const variance = individualReturns.reduce((sum, ret) => 
      sum + Math.pow(ret - avgReturn, 2), 0
    ) / individualReturns.length;
    const volatility = Math.sqrt(variance);

    // Sharpe Ratio simplificado (assumindo taxa livre de risco = CDI)
    const excessReturn = annualizedReturn - CDI_RATE;
    const sharpeRatio = volatility > 0 ? excessReturn / volatility : 0;

    // Comparação com benchmarks
    const vsIPCA = annualizedReturn - IPCA_RATE;
    const vsCDI = annualizedReturn - CDI_RATE;

    // Análise de diversificação
    const stocksValue = investments
      .filter(inv => inv.type === 'stocks')
      .reduce((sum, inv) => sum + inv.currentValue, 0);
    const fixedIncomeValue = investments
      .filter(inv => inv.type === 'fixed_income')
      .reduce((sum, inv) => sum + inv.currentValue, 0);

    const stocksPercent = (stocksValue / currentValue) * 100;
    const fixedIncomePercent = (fixedIncomeValue / currentValue) * 100;

    // Concentração (Herfindahl Index)
    const concentrationIndex = investments.reduce((sum, inv) => {
      const weight = inv.currentValue / currentValue;
      return sum + Math.pow(weight, 2);
    }, 0);

    return {
      totalInvested,
      currentValue,
      totalReturn,
      returnPercentage,
      annualizedReturn,
      volatility,
      sharpeRatio,
      vsIPCA,
      vsCDI,
      stocksPercent,
      fixedIncomePercent,
      concentrationIndex,
      avgYearsInvested,
    };
  }, [investments]);

  if (!performanceMetrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatórios de Performance</CardTitle>
          <CardDescription>
            Adicione investimentos para ver as métricas detalhadas
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const benchmarkData = [
    {
      name: 'Seu Portfólio',
      value: performanceMetrics.annualizedReturn,
    },
    {
      name: 'CDI',
      value: CDI_RATE,
    },
    {
      name: 'IPCA',
      value: IPCA_RATE,
    },
  ];

  const diversificationData = [
    {
      category: 'Rentabilidade',
      value: Math.min(performanceMetrics.returnPercentage / 20, 5),
    },
    {
      category: 'Diversificação',
      value: (1 - performanceMetrics.concentrationIndex) * 5,
    },
    {
      category: 'Sharpe Ratio',
      value: Math.max(0, Math.min(performanceMetrics.sharpeRatio + 2, 5)),
    },
    {
      category: 'Volatilidade (inv)',
      value: Math.max(0, 5 - (performanceMetrics.volatility / 10)),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Retorno Anualizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${performanceMetrics.annualizedReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {performanceMetrics.annualizedReturn.toFixed(2)}% a.a.
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Período: {performanceMetrics.avgYearsInvested.toFixed(1)} anos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Volatilidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceMetrics.volatility.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {performanceMetrics.volatility < 10 ? 'Baixa' : performanceMetrics.volatility < 20 ? 'Moderada' : 'Alta'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Sharpe Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {performanceMetrics.sharpeRatio.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {performanceMetrics.sharpeRatio > 1 ? 'Excelente' : performanceMetrics.sharpeRatio > 0.5 ? 'Bom' : 'Regular'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Concentração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(performanceMetrics.concentrationIndex * 100).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {performanceMetrics.concentrationIndex < 0.3 ? 'Bem diversificado' : performanceMetrics.concentrationIndex < 0.5 ? 'Moderado' : 'Concentrado'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Comparação com Benchmarks</CardTitle>
            <CardDescription>
              Seu retorno vs. CDI e IPCA (% a.a.)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={benchmarkData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  formatter={(value: number) => `${value.toFixed(2)}%`}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">vs. CDI</span>
                <Badge variant={performanceMetrics.vsCDI >= 0 ? 'default' : 'destructive'}>
                  {performanceMetrics.vsCDI >= 0 ? '+' : ''}{performanceMetrics.vsCDI.toFixed(2)}% a.a.
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">vs. IPCA</span>
                <Badge variant={performanceMetrics.vsIPCA >= 0 ? 'default' : 'destructive'}>
                  {performanceMetrics.vsIPCA >= 0 ? '+' : ''}{performanceMetrics.vsIPCA.toFixed(2)}% a.a.
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Análise de Risco/Retorno</CardTitle>
            <CardDescription>
              Radar de performance do portfólio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={diversificationData}>
                <PolarGrid className="stroke-muted" />
                <PolarAngleAxis dataKey="category" className="text-xs" />
                <PolarRadiusAxis angle={90} domain={[0, 5]} className="text-xs" />
                <Radar 
                  name="Score" 
                  dataKey="value" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.6} 
                />
                <Tooltip 
                  formatter={(value: number) => value.toFixed(1)}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Análise de Diversificação</CardTitle>
          <CardDescription>
            Distribuição entre classes de ativos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Bolsa de Valores</span>
                <span className="text-sm font-medium">{performanceMetrics.stocksPercent.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${performanceMetrics.stocksPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Renda Fixa</span>
                <span className="text-sm font-medium">{performanceMetrics.fixedIncomePercent.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-secondary transition-all duration-300"
                  style={{ width: `${performanceMetrics.fixedIncomePercent}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="text-sm font-semibold">Recomendações de Diversificação</h4>
              {performanceMetrics.concentrationIndex > 0.5 && (
                <p className="text-sm text-muted-foreground">
                  ⚠️ Portfólio concentrado. Considere diversificar mais seus investimentos.
                </p>
              )}
              {performanceMetrics.stocksPercent > 80 && (
                <p className="text-sm text-muted-foreground">
                  ⚠️ Alta exposição à renda variável. Considere aumentar a alocação em renda fixa.
                </p>
              )}
              {performanceMetrics.fixedIncomePercent > 80 && (
                <p className="text-sm text-muted-foreground">
                  💡 Portfólio conservador. Para maior rentabilidade, considere incluir ações.
                </p>
              )}
              {performanceMetrics.volatility > 25 && (
                <p className="text-sm text-muted-foreground">
                  ⚠️ Alta volatilidade detectada. Considere rebalancear o portfólio.
                </p>
              )}
              {performanceMetrics.sharpeRatio < 0 && (
                <p className="text-sm text-muted-foreground">
                  ⚠️ Retorno ajustado ao risco negativo. Revise sua estratégia de investimentos.
                </p>
              )}
              {performanceMetrics.sharpeRatio > 1 && performanceMetrics.concentrationIndex < 0.3 && (
                <p className="text-sm text-muted-foreground">
                  ✅ Ótima performance! Portfólio bem diversificado com bom retorno ajustado ao risco.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
