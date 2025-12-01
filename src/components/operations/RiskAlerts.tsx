import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, TrendingDown, TrendingUp, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Operation {
  operation_date: string;
  result: number;
  strategy: string | null;
}

interface RiskAlertsProps {
  operations: Operation[];
}

interface Alert {
  id: string;
  type: "high" | "medium" | "low";
  title: string;
  message: string;
  icon: React.ReactNode;
}

export const RiskAlerts = ({ operations }: RiskAlertsProps) => {
  const calculateAlerts = (): Alert[] => {
    const alerts: Alert[] = [];

    if (operations.length === 0) return alerts;

    // Calcular drawdown dos últimos 30 dias
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const recentOps = operations.filter(op => {
      const [year, month, day] = op.operation_date.split('-').map(Number);
      const opDate = new Date(year, month - 1, day);
      return opDate >= last30Days;
    });

    if (recentOps.length > 0) {
      let peak = 0;
      let accumulated = 0;
      let maxDrawdown = 0;

      recentOps.forEach(op => {
        accumulated += op.result;
        if (accumulated > peak) peak = accumulated;
        const currentDrawdown = ((peak - accumulated) / Math.abs(peak)) * 100;
        if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;
      });

      if (maxDrawdown > 8) {
        alerts.push({
          id: "drawdown-high",
          type: "high",
          title: "Drawdown Elevado Detectado",
          message: `Seu drawdown atingiu ${maxDrawdown.toFixed(1)}% nos últimos 30 dias. Considere reduzir o tamanho das posições.`,
          icon: <TrendingDown className="w-5 h-5" />,
        });
      } else if (maxDrawdown > 5) {
        alerts.push({
          id: "drawdown-warning",
          type: "medium",
          title: "Atenção ao Drawdown",
          message: `Drawdown atual de ${maxDrawdown.toFixed(1)}%. Monitore suas próximas operações com atenção.`,
          icon: <AlertTriangle className="w-5 h-5" />,
        });
      }
    }

    // Verificar perdas consecutivas
    let consecutiveLosses = 0;
    let maxConsecutiveLosses = 0;
    
    const sortedOps = [...operations].sort((a, b) => 
      a.operation_date.localeCompare(b.operation_date)
    );

    sortedOps.forEach(op => {
      if (op.result < 0) {
        consecutiveLosses++;
        if (consecutiveLosses > maxConsecutiveLosses) {
          maxConsecutiveLosses = consecutiveLosses;
        }
      } else {
        consecutiveLosses = 0;
      }
    });

    if (maxConsecutiveLosses >= 5) {
      alerts.push({
        id: "consecutive-losses-high",
        type: "high",
        title: "Série de Perdas Preocupante",
        message: `Detectadas ${maxConsecutiveLosses} perdas consecutivas. Revise sua estratégia e gestão de risco.`,
        icon: <TrendingDown className="w-5 h-5" />,
      });
    } else if (maxConsecutiveLosses >= 3) {
      alerts.push({
        id: "consecutive-losses-medium",
        type: "medium",
        title: "Perdas Consecutivas",
        message: `${maxConsecutiveLosses} operações negativas seguidas. Considere uma pausa para análise.`,
        icon: <AlertTriangle className="w-5 h-5" />,
      });
    }

    // Analisar performance por estratégia
    const strategyStats = operations.reduce((acc, op) => {
      if (!op.strategy) return acc;
      
      if (!acc[op.strategy]) {
        acc[op.strategy] = { total: 0, wins: 0, totalResult: 0 };
      }
      
      acc[op.strategy].total++;
      if (op.result > 0) acc[op.strategy].wins++;
      acc[op.strategy].totalResult += op.result;
      
      return acc;
    }, {} as Record<string, { total: number; wins: number; totalResult: number }>);

    Object.entries(strategyStats).forEach(([strategy, stats]) => {
      if (stats.total >= 10) {
        const winRate = (stats.wins / stats.total) * 100;
        
        if (winRate < 40) {
          alerts.push({
            id: `strategy-poor-${strategy}`,
            type: "medium",
            title: "Estratégia com Baixa Performance",
            message: `A estratégia "${strategy}" tem win rate de ${winRate.toFixed(1)}%. Considere revisão ou ajustes.`,
            icon: <Target className="w-5 h-5" />,
          });
        } else if (winRate > 70 && stats.totalResult > 0) {
          alerts.push({
            id: `strategy-excellent-${strategy}`,
            type: "low",
            title: "Estratégia Performando Bem",
            message: `A estratégia "${strategy}" tem win rate de ${winRate.toFixed(1)}% com resultado positivo. Continue o bom trabalho!`,
            icon: <TrendingUp className="w-5 h-5" />,
          });
        }
      }
    });

    return alerts;
  };

  const alerts = calculateAlerts();

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            Alertas e Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingUp className="w-12 h-12 text-success mb-3" />
            <p className="text-muted-foreground">
              Nenhum alerta de risco detectado no momento.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Continue operando com disciplina!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alertas e Recomendações
          </CardTitle>
          <Badge variant="secondary">{alerts.length} alerta(s)</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-l-4 ${
                alert.type === "high"
                  ? "bg-destructive/10 border-destructive"
                  : alert.type === "medium"
                  ? "bg-warning/10 border-warning"
                  : "bg-success/10 border-success"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 ${
                    alert.type === "high"
                      ? "text-destructive"
                      : alert.type === "medium"
                      ? "text-warning"
                      : "text-success"
                  }`}
                >
                  {alert.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">{alert.title}</h4>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {alerts.some(a => a.type === "high") && (
          <div className="mt-4 pt-4 border-t">
            <Button className="w-full" variant="outline" size="sm">
              Ver Recomendações Detalhadas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
