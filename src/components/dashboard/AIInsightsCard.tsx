import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, TrendingDown, Clock, Target, RefreshCw, Lightbulb, AlertTriangle, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
  strategy?: string | null;
}

interface AIInsightsCardProps {
  operations: Operation[];
}

interface InsightData {
  insights: string[];
  suggestions: string[];
  highlight: string;
  analysis?: {
    bestHour: { hour: number; winRate: number; avgResult: number };
    worstHour: { hour: number; winRate: number; avgResult: number };
    bestDay: { day: string; winRate: number; avgResult: number };
    worstDay: { day: string; winRate: number; avgResult: number };
    morningPerformance: { winRate: number; avgResult: number; operations: number };
    afternoonPerformance: { winRate: number; avgResult: number; operations: number };
    recoveryRate: number;
    bestStrategy: { name: string; winRate: number; avgResult: number } | null;
    worstStrategy: { name: string; winRate: number; avgResult: number } | null;
  };
}

const AIInsightsCard = ({ operations }: AIInsightsCardProps) => {
  const [insightData, setInsightData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzePatterns = async () => {
    if (operations.length < 10) {
      setError("Mínimo de 10 operações necessárias para análise");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-trading-patterns", {
        body: { operations: operations.map(op => ({
          operation_date: op.operation_date,
          operation_time: op.operation_time,
          result: op.result,
          strategy: op.strategy
        })) }
      });

      if (fnError) throw fnError;

      if (data.error) {
        throw new Error(data.error);
      }

      setInsightData(data);
    } catch (err) {
      console.error("Error analyzing patterns:", err);
      const message = err instanceof Error ? err.message : "Erro ao analisar padrões";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            Insights com IA
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={analyzePatterns}
            disabled={loading || operations.length < 10}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Analisando..." : "Analisar"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!insightData && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 rounded-full bg-muted/50 p-4">
              <Lightbulb className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Clique em "Analisar" para receber insights personalizados
            </p>
            <p className="text-xs text-muted-foreground">
              {operations.length < 10 
                ? `${operations.length}/10 operações (mínimo necessário)` 
                : `${operations.length} operações disponíveis para análise`}
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8"
            >
              <div className="relative mb-4">
                <div className="h-12 w-12 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-4 border-transparent border-t-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Analisando padrões de trading...</p>
            </motion.div>
          )}

          {insightData && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Highlight */}
              {insightData.highlight && (
                <div className="rounded-xl bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 p-4 border border-violet-500/20">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-violet-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{insightData.highlight}</p>
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              {insightData.analysis && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs text-muted-foreground">Melhor Horário</span>
                    </div>
                    <p className="font-semibold text-emerald-500">{insightData.analysis.bestHour.hour}h</p>
                    <p className="text-xs text-muted-foreground">{insightData.analysis.bestHour.winRate.toFixed(0)}% acerto</p>
                  </div>
                  <div className="rounded-lg bg-red-500/10 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-muted-foreground">Evitar Horário</span>
                    </div>
                    <p className="font-semibold text-red-500">{insightData.analysis.worstHour.hour}h</p>
                    <p className="text-xs text-muted-foreground">{insightData.analysis.worstHour.winRate.toFixed(0)}% acerto</p>
                  </div>
                  {insightData.analysis.bestStrategy && (
                    <div className="rounded-lg bg-blue-500/10 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-blue-500" />
                        <span className="text-xs text-muted-foreground">Melhor Estratégia</span>
                      </div>
                      <p className="font-semibold text-blue-500 truncate text-sm">{insightData.analysis.bestStrategy.name}</p>
                      <p className="text-xs text-muted-foreground">{insightData.analysis.bestStrategy.winRate.toFixed(0)}% acerto</p>
                    </div>
                  )}
                  <div className="rounded-lg bg-amber-500/10 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-amber-500" />
                      <span className="text-xs text-muted-foreground">Recuperação</span>
                    </div>
                    <p className="font-semibold text-amber-500">{insightData.analysis.recoveryRate.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">após perdas</p>
                  </div>
                </div>
              )}

              {/* Insights */}
              {insightData.insights && insightData.insights.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Insights
                  </h4>
                  <div className="space-y-2">
                    {insightData.insights.map((insight, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-2 text-sm"
                      >
                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span className="text-muted-foreground">{insight}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {insightData.suggestions && insightData.suggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-500" />
                    Sugestões de Melhoria
                  </h4>
                  <div className="space-y-2">
                    {insightData.suggestions.map((suggestion, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="rounded-lg bg-muted/30 p-3 text-sm"
                      >
                        <div className="flex items-start gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-500 flex-shrink-0">
                            {index + 1}
                          </span>
                          <span>{suggestion}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Session Comparison */}
              {insightData.analysis && (
                <div className="rounded-lg bg-muted/30 p-4">
                  <h4 className="text-sm font-medium mb-3">Comparativo de Sessão</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Manhã (até 12h)</p>
                      <p className={`text-lg font-bold ${insightData.analysis.morningPerformance.winRate >= insightData.analysis.afternoonPerformance.winRate ? "text-emerald-500" : "text-muted-foreground"}`}>
                        {insightData.analysis.morningPerformance.winRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">{insightData.analysis.morningPerformance.operations} ops</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Tarde (após 12h)</p>
                      <p className={`text-lg font-bold ${insightData.analysis.afternoonPerformance.winRate > insightData.analysis.morningPerformance.winRate ? "text-emerald-500" : "text-muted-foreground"}`}>
                        {insightData.analysis.afternoonPerformance.winRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">{insightData.analysis.afternoonPerformance.operations} ops</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default AIInsightsCard;
