import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Sparkles, 
  Target,
  Settings2,
  ChevronDown,
  Check,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
  strategy: string | null;
}

interface BestConfigItem {
  value: number;
  result: number;
  winRate: number;
  operationsCount: number;
}

interface BestConfig {
  strategy: string;
  bestHours: BestConfigItem[];
  bestWeekdays: BestConfigItem[];
  bestMonths: BestConfigItem[];
  totalResult: number;
  estimatedResult: number;
  totalOperations: number;
  confidence: "low" | "medium" | "high";
}

interface StrategyOptimizerProps {
  operations: Operation[];
  strategies: string[];
  onApplyConfig: (config: {
    strategy: string;
    hours: string[];
    weekdays: string[];
    months: string[];
  }) => void;
  onOpenFilters: () => void;
}

const weekdayNames: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sab",
};

const monthNames: Record<number, string> = {
  0: "Jan",
  1: "Fev",
  2: "Mar",
  3: "Abr",
  4: "Mai",
  5: "Jun",
  6: "Jul",
  7: "Ago",
  8: "Set",
  9: "Out",
  10: "Nov",
  11: "Dez",
};

const calculateBestConfig = (strategy: string, operations: Operation[]): BestConfig => {
  // Single-pass: filter by strategy + aggregate hour/weekday/month simultaneously
  const hourStats: Record<number, { total: number; positive: number; result: number }> = {};
  const weekdayStats: Record<number, { total: number; positive: number; result: number }> = {};
  const monthStats: Record<number, { total: number; positive: number; result: number }> = {};
  let totalResult = 0;
  let strategyCount = 0;

  operations.forEach(op => {
    if (op.strategy !== strategy) return;
    strategyCount++;
    totalResult += op.result;
    const isPositive = op.result > 0;

    // Hour
    const hour = parseInt(op.operation_time.split(':')[0]);
    if (!hourStats[hour]) hourStats[hour] = { total: 0, positive: 0, result: 0 };
    hourStats[hour].total++;
    hourStats[hour].result += op.result;
    if (isPositive) hourStats[hour].positive++;

    // Weekday
    const parts = op.operation_date.split('-');
    const date = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    const weekday = date.getDay();
    if (!weekdayStats[weekday]) weekdayStats[weekday] = { total: 0, positive: 0, result: 0 };
    weekdayStats[weekday].total++;
    weekdayStats[weekday].result += op.result;
    if (isPositive) weekdayStats[weekday].positive++;

    // Month
    const month = +parts[1] - 1;
    if (!monthStats[month]) monthStats[month] = { total: 0, positive: 0, result: 0 };
    monthStats[month].total++;
    monthStats[month].result += op.result;
    if (isPositive) monthStats[month].positive++;
  });

  // Filtrar apenas com resultado POSITIVO e ordenar
  const bestHours = Object.entries(hourStats)
    .filter(([_, data]) => data.result > 0)
    .sort((a, b) => b[1].result - a[1].result)
    .map(([hour, data]) => ({
      value: parseInt(hour),
      result: data.result,
      winRate: (data.positive / data.total) * 100,
      operationsCount: data.total,
    }));

  const bestWeekdays = Object.entries(weekdayStats)
    .filter(([_, data]) => data.result > 0)
    .sort((a, b) => b[1].result - a[1].result)
    .map(([day, data]) => ({
      value: parseInt(day),
      result: data.result,
      winRate: (data.positive / data.total) * 100,
      operationsCount: data.total,
    }));

  const bestMonths = Object.entries(monthStats)
    .filter(([_, data]) => data.result > 0)
    .sort((a, b) => b[1].result - a[1].result)
    .map(([month, data]) => ({
      value: parseInt(month),
      result: data.result,
      winRate: (data.positive / data.total) * 100,
      operationsCount: data.total,
    }));

  // Calcular resultado estimado (soma dos melhores)
  const estimatedResult = 
    bestHours.reduce((sum, h) => sum + h.result, 0) +
    bestWeekdays.reduce((sum, d) => sum + d.result, 0) +
    bestMonths.reduce((sum, m) => sum + m.result, 0);

  // Determinar confiança baseado no volume
  let confidence: "low" | "medium" | "high" = "low";
  if (strategyCount > 500) confidence = "high";
  else if (strategyCount > 100) confidence = "medium";

  return {
    strategy,
    bestHours,
    bestWeekdays,
    bestMonths,
    totalResult,
    estimatedResult,
    totalOperations: strategyCount,
    confidence,
  };
};

const ConfidenceBadge = ({ confidence }: { confidence: "low" | "medium" | "high" }) => {
  const configs = {
    low: { label: "Baixa", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    medium: { label: "Média", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
    high: { label: "Alta", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  };
  
  return (
    <Badge variant="outline" className={cn("gap-1", configs[confidence].color)}>
      <Star className="w-3 h-3" />
      {configs[confidence].label}
    </Badge>
  );
};

const ResultBadge = ({ result }: { result: number }) => (
  <span className={cn(
    "text-xs font-medium",
    result > 0 ? "text-emerald-500" : "text-destructive"
  )}>
    {result > 0 ? "+" : ""}R$ {result.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
  </span>
);

const StrategyCard = ({ 
  config, 
  onApply, 
  onCustomize,
  isExpanded,
  onToggle
}: { 
  config: BestConfig; 
  onApply: () => void;
  onCustomize: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const hasOptimizations = config.bestHours.length > 0 || config.bestWeekdays.length > 0 || config.bestMonths.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-xl hover:border-primary/30 transition-all duration-300">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{config.strategy}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {config.totalOperations.toLocaleString()} operações
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ConfidenceBadge confidence={config.confidence} />
                  <div className={cn(
                    "text-right",
                    config.totalResult > 0 ? "text-emerald-500" : "text-destructive"
                  )}>
                    <p className="text-sm font-semibold">
                      {config.totalResult > 0 ? "+" : ""}R$ {config.totalResult.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    className="p-1.5 rounded-full bg-muted/50"
                  >
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-5">
              {!hasOptimizations ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Não há configurações otimizadas disponíveis para esta estratégia.</p>
                  <p className="text-xs mt-1">Todos os horários/dias/meses têm resultado negativo.</p>
                </div>
              ) : (
                <>
                  {/* Best Hours */}
                  {config.bestHours.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="w-4 h-4 text-violet-500" />
                        <span>Melhores Horários</span>
                        <Badge variant="secondary" className="bg-violet-500/10 text-violet-500 text-xs">
                          {config.bestHours.length}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {config.bestHours.slice(0, 5).map((item) => (
                          <div
                            key={item.value}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/5 border border-violet-500/20"
                          >
                            <Check className="w-3 h-3 text-violet-500" />
                            <span className="text-sm font-medium">{item.value}h</span>
                            <ResultBadge result={item.result} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Best Weekdays */}
                  {config.bestWeekdays.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Calendar className="w-4 h-4 text-emerald-500" />
                        <span>Melhores Dias</span>
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 text-xs">
                          {config.bestWeekdays.length}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {config.bestWeekdays.map((item) => (
                          <div
                            key={item.value}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20"
                          >
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-sm font-medium">{weekdayNames[item.value]}</span>
                            <ResultBadge result={item.result} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Best Months */}
                  {config.bestMonths.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        <span>Melhores Meses</span>
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 text-xs">
                          {config.bestMonths.length}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {config.bestMonths.slice(0, 6).map((item) => (
                          <div
                            key={item.value}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/20"
                          >
                            <Check className="w-3 h-3 text-amber-500" />
                            <span className="text-sm font-medium">{monthNames[item.value]}</span>
                            <ResultBadge result={item.result} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Estimated Result */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">Usando esta configuração:</span>
                      </div>
                      <span className={cn(
                        "text-lg font-bold",
                        config.estimatedResult > 0 ? "text-emerald-500" : "text-destructive"
                      )}>
                        {config.estimatedResult > 0 ? "+" : ""}R$ {Math.abs(config.estimatedResult).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button 
                      onClick={onApply}
                      className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    >
                      <Target className="w-4 h-4" />
                      Aplicar Config
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={onCustomize}
                      className="flex-1 gap-2"
                    >
                      <Settings2 className="w-4 h-4" />
                      Personalizar
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </motion.div>
  );
};

const StrategyOptimizer = ({ 
  operations, 
  strategies, 
  onApplyConfig,
  onOpenFilters
}: StrategyOptimizerProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);

  const configs = useMemo(() => {
    return strategies.map(strategy => calculateBestConfig(strategy, operations));
  }, [operations, strategies]);

  // Ordenar por resultado total
  const sortedConfigs = useMemo(() => {
    return [...configs].sort((a, b) => b.totalResult - a.totalResult);
  }, [configs]);

  const handleApplyConfig = (config: BestConfig) => {
    onApplyConfig({
      strategy: config.strategy,
      hours: config.bestHours.map(h => h.value.toString()),
      weekdays: config.bestWeekdays.map(d => d.value.toString()),
      months: config.bestMonths.map(m => m.value.toString()),
    });
    toast.success(`Configuração otimizada aplicada para ${config.strategy}`, {
      description: "Filtros atualizados com as melhores configurações históricas.",
    });
  };

  const handleCustomize = (strategy: string) => {
    onApplyConfig({
      strategy,
      hours: [],
      weekdays: [],
      months: [],
    });
    onOpenFilters();
    toast.info(`Personalizando filtros para ${strategy}`, {
      description: "Ajuste os filtros manualmente na seção abaixo.",
    });
  };

  if (strategies.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-xl overflow-hidden shadow-xl">
          {/* Header */}
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-5 hover:bg-muted/20 transition-all duration-300 group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    Otimizador de Estratégias
                    <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                      IA
                    </Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Melhores configurações baseadas em dados históricos
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-muted-foreground">
                  {strategies.length} robô{strategies.length > 1 ? "s" : ""}
                </Badge>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  className="p-2 rounded-full bg-muted/50"
                >
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-5 pb-6 space-y-4 border-t border-border/30 pt-5">
              <AnimatePresence mode="wait">
                {sortedConfigs.map((config, index) => (
                  <StrategyCard
                    key={config.strategy}
                    config={config}
                    isExpanded={expandedStrategy === config.strategy}
                    onToggle={() => setExpandedStrategy(
                      expandedStrategy === config.strategy ? null : config.strategy
                    )}
                    onApply={() => handleApplyConfig(config)}
                    onCustomize={() => handleCustomize(config.strategy)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </motion.div>
  );
};

export default StrategyOptimizer;
