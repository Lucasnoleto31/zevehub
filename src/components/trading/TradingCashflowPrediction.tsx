import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  Sparkles, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  Calendar,
  DollarSign,
  Target,
  BarChart3,
  Lightbulb,
  TrendingDown,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoricalData {
  month: string;
  profit: number;
  loss: number;
  netResult: number;
  operations: number;
  winRate: string;
}

interface TopAsset {
  asset: string;
  profit: number;
  count: number;
  avgPerOp: number;
}

interface CashflowData {
  prediction: string;
  historical: HistoricalData[];
  topAssets: TopAsset[];
  metrics: {
    totalOperations: number;
    totalProfit: number;
    winRate: number;
  };
  generatedAt: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

const formatMonth = (monthStr: string) => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return format(date, "MMM/yy", { locale: ptBR });
};

export const TradingCashflowPrediction = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CashflowData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePrediction = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: responseData, error: fnError } = await supabase.functions.invoke(
        'predict-trading-cashflow',
        {}
      );

      if (fnError) throw fnError;

      if (responseData.error) {
        if (responseData.code === "INSUFFICIENT_DATA") {
          setError(responseData.error);
        } else {
          throw new Error(responseData.error);
        }
        return;
      }

      setData(responseData);
      toast.success("Previsão gerada com sucesso!");
    } catch (err: any) {
      console.error("Error generating prediction:", err);
      setError(err.message || "Erro ao gerar previsão");
      toast.error("Erro ao gerar previsão de cashflow");
    } finally {
      setLoading(false);
    }
  };

  // Parse prediction into sections
  const parsePrediction = (text: string) => {
    const sections: { title: string; content: string }[] = [];
    const lines = text.split('\n');
    let currentSection: { title: string; content: string } | null = null;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.match(/^\d+\.\s+\*\*|^##\s+|^\*\*\d+\.|^###\s+/)) {
        if (currentSection) sections.push(currentSection);
        currentSection = { 
          title: trimmed.replace(/^\d+\.\s+\*\*|\*\*$|^##\s+|^###\s+|^\*\*/g, '').replace(/\*\*/g, ''), 
          content: '' 
        };
      } else if (currentSection) {
        currentSection.content += (currentSection.content ? '\n' : '') + trimmed;
      }
    });

    if (currentSection) sections.push(currentSection);
    return sections.length > 0 ? sections : [{ title: 'Análise', content: text }];
  };

  const getSectionIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('projeção') || lower.includes('resultado')) return TrendingUp;
    if (lower.includes('tendência')) return BarChart3;
    if (lower.includes('ativo') || lower.includes('potencial')) return Target;
    if (lower.includes('recomend') || lower.includes('otimiz')) return Lightbulb;
    if (lower.includes('alerta') || lower.includes('risco')) return AlertCircle;
    return Sparkles;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 ring-2 ring-violet-500/20">
            <Sparkles className="w-6 h-6 text-violet-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Previsão de Cashflow</h2>
            <p className="text-sm text-muted-foreground">
              Análise preditiva baseada no seu histórico de operações
            </p>
          </div>
        </div>

        <Button
          onClick={generatePrediction}
          disabled={loading}
          className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              {data ? 'Atualizar Previsão' : 'Gerar Previsão com IA'}
            </>
          )}
        </Button>
      </div>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-600 dark:text-amber-400">{error}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Continue operando para acumular mais histórico.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initial State */}
      {!data && !loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br from-card via-card/95 to-violet-500/5 border-2 border-dashed border-violet-500/30"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent" />
          
          <div className="relative z-10 text-center space-y-4">
            <div className="inline-flex p-4 rounded-full bg-violet-500/10 ring-2 ring-violet-500/20">
              <Sparkles className="w-8 h-8 text-violet-500" />
            </div>
            <h3 className="text-lg font-semibold">Previsão Inteligente de Trading</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Utilize inteligência artificial para analisar seu histórico de operações e receber 
              projeções personalizadas de resultados futuros.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Badge variant="outline" className="bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-400">
                <TrendingUp className="w-3 h-3 mr-1" />
                Projeções de Lucro
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <Target className="w-3 h-3 mr-1" />
                Análise de Ativos
              </Badge>
              <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400">
                <Lightbulb className="w-3 h-3 mr-1" />
                Recomendações
              </Badge>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading State */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl p-8 bg-gradient-to-br from-card to-violet-500/5 border border-violet-500/30"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-violet-500/20 animate-pulse" />
                <Loader2 className="w-8 h-8 text-violet-500 absolute inset-0 m-auto animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">Analisando operações...</p>
                <p className="text-sm text-muted-foreground">
                  A IA está processando seu histórico de trading
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {data && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Metrics Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20">
                    <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Resultado Total</p>
                    <p className={cn(
                      "text-xl font-bold",
                      data.metrics.totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                      {formatCurrency(data.metrics.totalProfit)}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-500/20">
                    <Target className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Win Rate</p>
                    <p className="text-xl font-bold text-violet-600 dark:text-violet-400">
                      {data.metrics.winRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/20">
                    <BarChart3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Operações</p>
                    <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                      {data.metrics.totalOperations}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Historical Chart Mini */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-5 rounded-2xl bg-gradient-to-br from-card via-card/95 to-accent/5 border border-border/50"
            >
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Histórico dos Últimos 6 Meses</h3>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {data.historical.map((item, idx) => (
                  <div key={item.month} className="text-center">
                    <div 
                      className={cn(
                        "h-16 rounded-lg flex items-end justify-center mb-2 transition-all",
                        item.netResult >= 0 
                          ? "bg-gradient-to-t from-emerald-500/30 to-emerald-500/10" 
                          : "bg-gradient-to-t from-rose-500/30 to-rose-500/10"
                      )}
                    >
                      <div 
                        className={cn(
                          "w-full rounded-lg",
                          item.netResult >= 0 ? "bg-emerald-500" : "bg-rose-500"
                        )}
                        style={{ 
                          height: `${Math.min(100, Math.abs(item.netResult) / (Math.max(...data.historical.map(h => Math.abs(h.netResult))) || 1) * 100)}%`,
                          minHeight: '4px'
                        }}
                      />
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">
                      {formatMonth(item.month)}
                    </p>
                    <p className={cn(
                      "text-xs font-bold",
                      item.netResult >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                      {item.netResult >= 0 ? '+' : ''}{(item.netResult / 1000).toFixed(1)}k
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Top Assets */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-5 rounded-2xl bg-gradient-to-br from-card via-card/95 to-accent/5 border border-border/50"
            >
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Top Ativos por Performance</h3>
              </div>
              <div className="space-y-2">
                {data.topAssets.map((asset, idx) => (
                  <div 
                    key={asset.asset}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl",
                      asset.profit >= 0 
                        ? "bg-emerald-500/10 border border-emerald-500/20" 
                        : "bg-rose-500/10 border border-rose-500/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6">{idx + 1}</span>
                      <span className="font-semibold">{asset.asset}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {asset.count} ops
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-bold",
                        asset.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      )}>
                        {formatCurrency(asset.profit)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(asset.avgPerOp)}/op
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* AI Prediction */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 via-card to-purple-500/5 border border-violet-500/30"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-violet-500/20 ring-2 ring-violet-500/20">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Análise Preditiva</h3>
                  <p className="text-xs text-muted-foreground">
                    Gerada em {format(new Date(data.generatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {parsePrediction(data.prediction).map((section, idx) => {
                  const Icon = getSectionIcon(section.title);
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + idx * 0.05 }}
                      className="p-4 rounded-xl bg-background/50 border border-border/50"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-violet-500" />
                        <h4 className="font-semibold text-sm text-foreground">{section.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                        {section.content.replace(/\*\*/g, '').replace(/\*/g, '•')}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TradingCashflowPrediction;
