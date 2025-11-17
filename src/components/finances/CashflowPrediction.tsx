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
  const [demoMode, setDemoMode] = useState(false);

  const loadDemoData = () => {
    setDemoMode(true);
    setInsufficientData(false);
    
    // Dados históricos fake dos últimos 6 meses
    const demoHistorical = [
      { month: "2025-06", income: 4500.00, expense: 3200.00, balance: 1300.00 },
      { month: "2025-07", income: 4800.00, expense: 3500.00, balance: 1300.00 },
      { month: "2025-08", income: 4500.00, expense: 2900.00, balance: 1600.00 },
      { month: "2025-09", income: 5000.00, expense: 3400.00, balance: 1600.00 },
      { month: "2025-10", income: 4700.00, expense: 3100.00, balance: 1600.00 },
      { month: "2025-11", income: 4900.00, expense: 3300.00, balance: 1600.00 },
    ];
    
    const demoPrediction = `📊 **PREVISÃO DE FLUXO DE CAIXA - PRÓXIMOS 3 MESES** (Dados de Demonstração)

**DEZEMBRO 2025:**
• Receita Prevista: R$ 4.850,00
• Despesa Prevista: R$ 3.250,00
• Saldo Projetado: R$ 1.600,00

**JANEIRO 2026:**
• Receita Prevista: R$ 4.750,00
• Despesa Prevista: R$ 3.400,00
• Saldo Projetado: R$ 1.350,00

**FEVEREIRO 2026:**
• Receita Prevista: R$ 4.900,00
• Despesa Prevista: R$ 3.300,00
• Saldo Projetado: R$ 1.600,00

📈 **TENDÊNCIAS IDENTIFICADAS:**
1. Receitas estáveis com média mensal de R$ 4.800,00
2. Despesas controladas, variando entre R$ 2.900,00 e R$ 3.500,00
3. Saldo positivo consistente de aproximadamente R$ 1.500,00/mês

💡 **RECOMENDAÇÕES:**
1. **Reserva de Emergência**: Com saldo mensal de ~R$ 1.500, considere guardar 30% (R$ 450) para fundo de emergência
2. **Otimização de Gastos**: Suas despesas estão controladas. Identifique os 20% de gastos que podem ser reduzidos
3. **Investimentos**: Com fluxo positivo constante, considere investir R$ 500-700/mês em aplicações de médio prazo

⚠️ **ALERTAS:**
• Janeiro pode ter saldo menor devido ao aumento típico de despesas pós-festas
• Mantenha reserva de pelo menos R$ 3.000 para cobrir 2 meses de despesas essenciais

*Esta é uma demonstração. Adicione suas transações reais para obter previsões personalizadas!*`;
    
    setPrediction(demoPrediction);
    setHistorical(demoHistorical);
    toast.success("Demonstração carregada! Adicione suas transações para previsões reais.");
  };

  const generatePrediction = async () => {
    setLoading(true);
    setPrediction(null);
    setInsufficientData(false);
    setDemoMode(false);

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

      if (data?.error || data?.code === "INSUFFICIENT_DATA") {
        // Verificar se é o erro de dados insuficientes
        if (data?.error?.includes("Histórico insuficiente") || data?.code === "INSUFFICIENT_DATA") {
          setInsufficientData(true);
          toast.info("Adicione mais transações para gerar previsões precisas");
        } else if (data?.error) {
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
              <AlertDescription className="space-y-2">
                <div>
                  <strong>Dados insuficientes:</strong> Você precisa ter pelo menos 5 transações registradas 
                  nos últimos 12 meses para gerar previsões. Continue registrando suas transações 
                  na aba "Transações" para habilitar esta funcionalidade.
                </div>
                <Button 
                  onClick={loadDemoData} 
                  variant="outline" 
                  size="sm"
                  className="mt-2"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Ver Demonstração com Dados de Exemplo
                </Button>
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
              {demoMode && (
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    Você está visualizando uma demonstração com dados de exemplo. 
                    Adicione suas transações reais para obter previsões personalizadas!
                  </AlertDescription>
                </Alert>
              )}
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
