import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, Clock, TrendingUp, TrendingDown, Target, DollarSign, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Operation {
  id: string;
  operation_date: string;
  operation_time: string;
  asset: string;
  contracts: number;
  result: number;
  costs: number;
  strategy: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const OperationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [operation, setOperation] = useState<Operation | null>(null);
  const [loading, setLoading] = useState(true);
  const [similarOperations, setSimilarOperations] = useState<Operation[]>([]);

  useEffect(() => {
    if (id) {
      loadOperation();
    }
  }, [id]);

  const loadOperation = async () => {
    try {
      setLoading(true);

      // Carregar operação específica
      const { data: operationData, error: operationError } = await supabase
        .from("trading_operations")
        .select("*")
        .eq("id", id)
        .single();

      if (operationError) throw operationError;

      setOperation(operationData);

      // Carregar operações similares (mesmo ativo e estratégia)
      if (operationData) {
        const { data: similarData } = await supabase
          .from("trading_operations")
          .select("*")
          .eq("asset", operationData.asset)
          .neq("id", id)
          .order("operation_date", { ascending: false })
          .limit(5);

        if (similarData) {
          setSimilarOperations(similarData);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar operação:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!operation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Operação não encontrada</p>
            <Button onClick={() => navigate("/operations")} className="mt-4 w-full">
              Voltar para Operações
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const profitLoss = operation.result - operation.costs;
  const isProfit = profitLoss >= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/operations")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Operações
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Informações Principais */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl">Detalhes da Operação</CardTitle>
                <CardDescription className="text-base mt-2">
                  Análise completa e histórico
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {operation.asset}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Data e Hora */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-card border">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-semibold">
                    {format(new Date(operation.operation_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-card border">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Horário</p>
                  <p className="font-semibold">{operation.operation_time}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Resultado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    {isProfit ? (
                      <TrendingUp className="w-5 h-5 text-success" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-destructive" />
                    )}
                    <p className="text-sm text-muted-foreground">Resultado Líquido</p>
                  </div>
                  <p className={`text-3xl font-bold ${isProfit ? 'text-success' : 'text-destructive'}`}>
                    {isProfit ? '+' : ''}{profitLoss.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <p className="text-sm text-muted-foreground">Resultado Bruto</p>
                  </div>
                  <p className={`text-3xl font-bold ${operation.result >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {operation.result >= 0 ? '+' : ''}{operation.result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-primary" />
                    <p className="text-sm text-muted-foreground">Contratos</p>
                  </div>
                  <p className="text-3xl font-bold">{operation.contracts}</p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Detalhes Adicionais */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informações Adicionais</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">Custos Operacionais</p>
                  <p className="text-xl font-semibold">
                    {operation.costs.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>

                {operation.strategy && (
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Estratégia</p>
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      {operation.strategy}
                    </Badge>
                  </div>
                )}
              </div>

              {operation.notes && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Observações</p>
                  </div>
                  <p className="text-sm">{operation.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                <p>
                  Criado em: {format(new Date(operation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <p>
                  Última atualização: {format(new Date(operation.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operações Similares */}
        {similarOperations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Operações Similares</CardTitle>
              <CardDescription>
                Outras operações com {operation.asset}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {similarOperations.map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/operation/${op.id}`)}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{op.asset}</Badge>
                        {op.strategy && (
                          <Badge variant="secondary" className="text-xs">
                            {op.strategy}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(op.operation_date), "dd/MM/yyyy", { locale: ptBR })} às {op.operation_time}
                      </p>
                    </div>
                    <p className={`text-lg font-bold ${op.result >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {op.result >= 0 ? '+' : ''}{op.result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default OperationDetail;
