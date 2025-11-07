import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Calendar, Clock, Target } from "lucide-react";
import { ptBR } from "date-fns/locale";

interface Operation {
  id: string;
  operation_date: string;
  operation_time: string;
  asset: string;
  contracts: number;
  result: number;
  strategy: string | null;
  costs: number;
}

interface OperationsStats {
  totalOperations: number;
  totalResult: number;
  winRate: number;
  avgResult: number;
}

interface RecentOperationsProps {
  userId: string;
}

const RecentOperations = ({ userId }: RecentOperationsProps) => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [stats, setStats] = useState<OperationsStats>({
    totalOperations: 0,
    totalResult: 0,
    winRate: 0,
    avgResult: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOperations();
  }, [userId]);

  const loadOperations = async () => {
    try {
      setLoading(true);

      // Buscar operações recentes
      const { data: operationsData, error: operationsError } = await supabase
        .from("trading_operations")
        .select("*")
        .order("operation_date", { ascending: false })
        .order("operation_time", { ascending: false })
        .limit(10);

      if (operationsError) throw operationsError;

      // Buscar todas as operações para estatísticas
      const { data: allOperationsData, error: statsError } = await supabase
        .from("trading_operations")
        .select("result");

      if (statsError) throw statsError;

      if (operationsData) {
        setOperations(operationsData);
      }

      if (allOperationsData && allOperationsData.length > 0) {
        const totalOps = allOperationsData.length;
        const totalResult = allOperationsData.reduce((sum, op) => sum + (op.result || 0), 0);
        const wins = allOperationsData.filter(op => (op.result || 0) > 0).length;
        const winRate = (wins / totalOps) * 100;
        const avgResult = totalResult / totalOps;

        setStats({
          totalOperations: totalOps,
          totalResult,
          winRate,
          avgResult,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar operações:", error);
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

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">
              {stats.totalOperations}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total de Operações</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${stats.totalResult >= 0 ? 'text-success' : 'text-destructive'}`}>
              {stats.totalResult >= 0 ? '+' : ''}{stats.totalResult.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Resultado Total</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-foreground">
              {stats.winRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Taxa de Acerto</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${stats.avgResult >= 0 ? 'text-success' : 'text-destructive'}`}>
              {stats.avgResult >= 0 ? '+' : ''}{stats.avgResult.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Resultado Médio</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Operations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Operações Recentes
          </CardTitle>
          <CardDescription>
            Últimas 10 operações registradas de todos os robôs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma operação encontrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {operations.map((operation) => (
                <div
                  key={operation.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono">
                        {operation.asset}
                      </Badge>
                      {operation.strategy && (
                        <Badge variant="secondary">
                          {operation.strategy}
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {operation.contracts} contrato(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {(() => { const [y,m,d] = operation.operation_date.split('-'); return `${d}/${m}/${y}`; })()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {operation.operation_time}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className={`text-lg font-bold flex items-center gap-1 ${
                        operation.result >= 0 ? 'text-success' : 'text-destructive'
                      }`}>
                        {operation.result >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {operation.result >= 0 ? '+' : ''}{operation.result.toFixed(2)}
                      </div>
                      {operation.costs > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Custos: {operation.costs.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecentOperations;
