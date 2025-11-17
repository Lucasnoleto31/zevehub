import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Sparkles, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export const CashflowPrediction = () => {
  const [prediction, setPrediction] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [historical, setHistorical] = useState<any[]>([]);
  const [insufficientData, setInsufficientData] = useState(false);

  const generatePrediction = async () => {
    setLoading(true);
    setPrediction(null);
    setInsufficientData(false);

    try {
      const { data, error } = await supabase.functions.invoke("predict-cashflow", {
        body: {},
      });

      if (error) {
        console.error("Error from function:", error);
        const rawBody = (error as any)?.context?.body;
        let combinedMsg = error.message || "";
        if (rawBody) {
          try {
            const parsed = JSON.parse(rawBody);
            if (parsed?.error) combinedMsg = `${combinedMsg} ${parsed.error}`.trim();
          } catch {}
        }

        if (combinedMsg.includes("Histórico insuficiente")) {
          setInsufficientData(true);
          toast.info("Adicione mais transações para gerar previsões precisas");
          return;
        }
        
        if (combinedMsg.includes("429")) {
          toast.error("Limite de requisições excedido. Tente novamente em alguns minutos.");
          return;
        }
        if (combinedMsg.includes("402")) {
          toast.error("Créditos insuficientes. Adicione créditos em Settings → Workspace → Usage.");
          return;
        }

        toast.error(combinedMsg || "Erro ao chamar a previsão");
        return;
      }

      if (data?.error) {
        // Verificar se é o erro de dados insuficientes
        if (data.error.includes("Histórico insuficiente")) {
          setInsufficientData(true);
          toast.info("Adicione mais transações para gerar previsões precisas");
        } else {
          toast.error(data.error);
        }
        return;
      }

      setPrediction(data.prediction);
      setHistorical(data.historical || []);
      toast.success("Previsão gerada com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar previsão:", error);
      toast.error(error.message || "Erro ao gerar previsão");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Previsão de Fluxo de Caixa com IA
            </CardTitle>
            <Button
              onClick={generatePrediction}
              disabled={loading}
            >
              {loading ? "Analisando..." : "Gerar Previsão"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A IA analisa seu histórico financeiro dos últimos 12 meses para gerar previsões
              inteligentes e recomendações personalizadas. Necessário pelo menos 5 transações.
            </AlertDescription>
          </Alert>

          {insufficientData && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Dados insuficientes:</strong> Você precisa ter pelo menos 5 transações registradas 
                nos últimos 12 meses para gerar previsões. Continue registrando suas transações 
                na aba "Transações" para habilitar esta funcionalidade.
              </AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          )}

          {prediction && (
            <div className="space-y-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap bg-muted/50 p-4 rounded-lg border">
                  {prediction}
                </div>
              </div>

              {historical.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Histórico Analisado</h4>
                  <div className="grid gap-2">
                    {historical.map((month, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <span className="font-medium">{month.month}</span>
                        <div className="flex gap-4 text-sm">
                          <span className="text-primary">
                            Receita: R$ {month.income.toFixed(2)}
                          </span>
                          <span className="text-destructive">
                            Despesa: R$ {month.expense.toFixed(2)}
                          </span>
                          <span className={month.balance >= 0 ? "text-primary font-semibold" : "text-destructive font-semibold"}>
                            Saldo: R$ {month.balance.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!prediction && !loading && !insufficientData && (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Clique no botão acima para gerar uma previsão inteligente
                <br />
                baseada no seu histórico financeiro.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
