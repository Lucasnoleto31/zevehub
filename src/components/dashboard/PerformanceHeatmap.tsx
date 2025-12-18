// Performance Heatmap - Premium Design with Theme Toggle
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Crown, AlertTriangle, GitCompare, Calendar, ArrowUp, ArrowDown, Minus, Sparkles, Flame, TrendingUp, TrendingDown, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
}

interface HeatmapData {
  weekday: string;
  hour: string;
  result: number;
  operations: number;
  totalResult: number;
}

interface ComparisonData extends HeatmapData {
  previousOperations: number;
  previousTotalResult: number;
  change: number;
  changePercent: number;
}

interface PerformanceHeatmapProps {
  operations: Operation[];
}

type ViewMode = "normal" | "comparison";
type ComparisonPeriod = "all" | "week" | "month" | "quarter";
type HeatmapTheme = "dark" | "light";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const HOURS = Array.from({ length: 9 }, (_, i) => `${i + 9}h`);

// Theme configurations
const themes = {
  dark: {
    card: "border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20",
    cardComparison: "border-violet-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/20",
    grid: "bg-[linear-gradient(to_right,hsl(var(--border)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.05)_1px,transparent_1px)]",
    orb1: "bg-amber-500",
    orb2: "bg-emerald-500",
    orbComparison1: "bg-violet-500",
    orbComparison2: "bg-cyan-500",
    header: "text-slate-200",
    subHeader: "text-slate-400",
    statBg: "bg-slate-800/40 border-slate-700/30",
    statText: "text-slate-400",
    statValue: "text-slate-200",
    weekdayBg: "bg-slate-800/60 border-slate-700/40 text-slate-300",
    hourText: "text-slate-400",
    toggleBg: "bg-slate-800/60 border-slate-700/50",
    emptyCell: { bg: "bg-slate-800/40", border: "border-slate-700/30", text: "text-slate-600", glow: "" },
    profit: {
      high: { bg: "bg-gradient-to-br from-emerald-500 to-emerald-600", border: "border-emerald-400/60", text: "text-white font-bold", glow: "shadow-[0_0_20px_rgba(16,185,129,0.4)]" },
      mid: { bg: "bg-gradient-to-br from-emerald-500/70 to-emerald-600/70", border: "border-emerald-400/40", text: "text-white font-medium", glow: "shadow-[0_0_12px_rgba(16,185,129,0.25)]" },
      low: { bg: "bg-emerald-500/30", border: "border-emerald-400/25", text: "text-emerald-300", glow: "" }
    },
    loss: {
      high: { bg: "bg-gradient-to-br from-rose-500 to-rose-600", border: "border-rose-400/60", text: "text-white font-bold", glow: "shadow-[0_0_20px_rgba(244,63,94,0.4)]" },
      mid: { bg: "bg-gradient-to-br from-rose-500/70 to-rose-600/70", border: "border-rose-400/40", text: "text-white font-medium", glow: "shadow-[0_0_12px_rgba(244,63,94,0.25)]" },
      low: { bg: "bg-rose-500/30", border: "border-rose-400/25", text: "text-rose-300", glow: "" }
    },
    improved: {
      high: { bg: "bg-gradient-to-br from-cyan-500 to-cyan-600", border: "border-cyan-400/60", text: "text-white font-bold", glow: "shadow-[0_0_20px_rgba(6,182,212,0.4)]" },
      low: { bg: "bg-cyan-500/40", border: "border-cyan-400/30", text: "text-cyan-200", glow: "" }
    },
    declined: {
      high: { bg: "bg-gradient-to-br from-orange-500 to-orange-600", border: "border-orange-400/60", text: "text-white font-bold", glow: "shadow-[0_0_20px_rgba(249,115,22,0.4)]" },
      low: { bg: "bg-orange-500/40", border: "border-orange-400/30", text: "text-orange-200", glow: "" }
    },
    tooltipBg: "bg-slate-800/95 border-slate-700/50",
    ringOffset: "ring-offset-slate-900",
    legendProfit: "bg-rose-500/10 border-rose-500/30",
    legendLoss: "bg-emerald-500/10 border-emerald-500/30",
    legendEmpty: "bg-slate-700/30 border-slate-600/30",
    comparisonStatsBg: "bg-gradient-to-r from-violet-500/10 via-slate-800/50 to-violet-500/10 border-violet-500/30"
  },
  light: {
    card: "border-amber-400/50 bg-gradient-to-br from-amber-50 via-white to-orange-50",
    cardComparison: "border-violet-400/50 bg-gradient-to-br from-violet-50 via-white to-purple-50",
    grid: "bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)]",
    orb1: "bg-amber-300",
    orb2: "bg-emerald-300",
    orbComparison1: "bg-violet-300",
    orbComparison2: "bg-cyan-300",
    header: "text-slate-800",
    subHeader: "text-slate-500",
    statBg: "bg-white/80 border-slate-200 shadow-sm",
    statText: "text-slate-500",
    statValue: "text-slate-800",
    weekdayBg: "bg-white/80 border-slate-200 text-slate-700 shadow-sm",
    hourText: "text-slate-500",
    toggleBg: "bg-white/80 border-slate-200 shadow-sm",
    emptyCell: { bg: "bg-slate-100/80", border: "border-slate-200", text: "text-slate-400", glow: "" },
    profit: {
      high: { bg: "bg-gradient-to-br from-emerald-400 to-emerald-500", border: "border-emerald-300", text: "text-white font-bold", glow: "shadow-lg shadow-emerald-200" },
      mid: { bg: "bg-gradient-to-br from-emerald-300 to-emerald-400", border: "border-emerald-200", text: "text-white font-medium", glow: "shadow-md shadow-emerald-100" },
      low: { bg: "bg-emerald-100", border: "border-emerald-200", text: "text-emerald-700", glow: "" }
    },
    loss: {
      high: { bg: "bg-gradient-to-br from-rose-400 to-rose-500", border: "border-rose-300", text: "text-white font-bold", glow: "shadow-lg shadow-rose-200" },
      mid: { bg: "bg-gradient-to-br from-rose-300 to-rose-400", border: "border-rose-200", text: "text-white font-medium", glow: "shadow-md shadow-rose-100" },
      low: { bg: "bg-rose-100", border: "border-rose-200", text: "text-rose-700", glow: "" }
    },
    improved: {
      high: { bg: "bg-gradient-to-br from-cyan-400 to-cyan-500", border: "border-cyan-300", text: "text-white font-bold", glow: "shadow-lg shadow-cyan-200" },
      low: { bg: "bg-cyan-100", border: "border-cyan-200", text: "text-cyan-700", glow: "" }
    },
    declined: {
      high: { bg: "bg-gradient-to-br from-orange-400 to-orange-500", border: "border-orange-300", text: "text-white font-bold", glow: "shadow-lg shadow-orange-200" },
      low: { bg: "bg-orange-100", border: "border-orange-200", text: "text-orange-700", glow: "" }
    },
    tooltipBg: "bg-white/95 border-slate-200 shadow-xl",
    ringOffset: "ring-offset-white",
    legendProfit: "bg-rose-50 border-rose-200",
    legendLoss: "bg-emerald-50 border-emerald-200",
    legendEmpty: "bg-slate-100 border-slate-200",
    comparisonStatsBg: "bg-gradient-to-r from-violet-100/50 via-white to-violet-100/50 border-violet-200"
  }
};

const PerformanceHeatmap = ({ operations }: PerformanceHeatmapProps) => {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>("all");
  const [theme, setTheme] = useState<HeatmapTheme>("dark");

  const t = themes[theme];

  const filterByPeriod = useCallback((ops: Operation[], periodType: "current" | "previous", period: ComparisonPeriod): Operation[] => {
    if (period === "all") {
      const sorted = [...ops].sort((a, b) => a.operation_date.localeCompare(b.operation_date));
      const midpoint = Math.floor(sorted.length / 2);
      return periodType === "current" ? sorted.slice(midpoint) : sorted.slice(0, midpoint);
    }

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === "week") {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      if (periodType === "current") {
        startDate = new Date(now);
        startDate.setDate(now.getDate() + mondayOffset);
        endDate = now;
      } else {
        endDate = new Date(now);
        endDate.setDate(now.getDate() + mondayOffset - 1);
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 6);
      }
    } else if (period === "month") {
      if (periodType === "current") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      }
    } else {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      if (periodType === "current") {
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        endDate = now;
      } else {
        const prevQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
        const prevYear = currentQuarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
        startDate = new Date(prevYear, prevQuarter * 3, 1);
        endDate = new Date(prevYear, prevQuarter * 3 + 3, 0);
      }
    }

    return ops.filter(op => {
      const [year, month, day] = op.operation_date.split("-").map(Number);
      const opDate = new Date(year, month - 1, day);
      return opDate >= startDate && opDate <= endDate;
    });
  }, []);

  const processOperations = useCallback((ops: Operation[]): HeatmapData[] => {
    const heatmapMap = new Map<string, number[]>();
    const weekdayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    ops.forEach((op) => {
      const [year, month, day] = op.operation_date.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      const weekday = date.getDay();
      const hour = parseInt(op.operation_time.split(":")[0]);
      if (weekday === 0 || weekday === 6) return;
      const key = `${weekday}-${hour}`;
      if (!heatmapMap.has(key)) heatmapMap.set(key, []);
      heatmapMap.get(key)!.push(op.result);
    });

    const result: HeatmapData[] = [];
    for (let day = 1; day <= 5; day++) {
      for (let hour = 9; hour <= 17; hour++) {
        const key = `${day}-${hour}`;
        const results = heatmapMap.get(key) || [];
        const totalResult = results.reduce((sum, r) => sum + r, 0);
        result.push({
          weekday: weekdayNames[day],
          hour: `${hour}h`,
          result: results.length > 0 ? totalResult / results.length : 0,
          operations: results.length,
          totalResult,
        });
      }
    }
    return result;
  }, []);

  const heatmapData = useMemo(() => processOperations(operations), [operations, processOperations]);

  const comparisonData = useMemo((): ComparisonData[] => {
    const currentOps = filterByPeriod(operations, "current", comparisonPeriod);
    const previousOps = filterByPeriod(operations, "previous", comparisonPeriod);
    const currentData = processOperations(currentOps);
    const previousData = processOperations(previousOps);

    return currentData.map((current, index) => {
      const previous = previousData[index];
      const change = current.totalResult - previous.totalResult;
      const changePercent = previous.totalResult !== 0 
        ? ((current.totalResult - previous.totalResult) / Math.abs(previous.totalResult)) * 100 
        : current.totalResult !== 0 ? 100 : 0;
      return { ...current, previousOperations: previous.operations, previousTotalResult: previous.totalResult, change, changePercent };
    });
  }, [operations, comparisonPeriod, filterByPeriod, processOperations]);

  const { bestSlot, worstSlot, totalOps, totalResult } = useMemo(() => {
    const data = viewMode === "normal" ? heatmapData : comparisonData;
    const withOps = data.filter(d => d.operations > 0);
    if (withOps.length === 0) return { bestSlot: null, worstSlot: null, totalOps: 0, totalResult: 0 };
    return {
      bestSlot: withOps.reduce((max, d) => d.totalResult > max.totalResult ? d : max, withOps[0]),
      worstSlot: withOps.reduce((min, d) => d.totalResult < min.totalResult ? d : min, withOps[0]),
      totalOps: withOps.reduce((sum, d) => sum + d.operations, 0),
      totalResult: withOps.reduce((sum, d) => sum + d.totalResult, 0),
    };
  }, [heatmapData, comparisonData, viewMode]);

  const comparisonStats = useMemo(() => {
    if (viewMode !== "comparison") return null;
    const improved = comparisonData.filter(d => d.change > 0 && (d.operations > 0 || d.previousOperations > 0)).length;
    const declined = comparisonData.filter(d => d.change < 0 && (d.operations > 0 || d.previousOperations > 0)).length;
    const totalChange = comparisonData.reduce((sum, d) => sum + d.change, 0);
    return { improved, declined, totalChange };
  }, [comparisonData, viewMode]);

  const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const getPeriodLabel = (p: ComparisonPeriod) => p === "all" ? "Todo o período" : p === "week" ? "Semana" : p === "month" ? "Mês" : "Trimestre";

  const getColorIntensity = (result: number, ops: number) => {
    if (ops === 0) return t.emptyCell;
    const maxResult = Math.max(...heatmapData.map(d => Math.abs(d.result)), 1);
    const intensity = Math.abs(result) / maxResult;
    if (result > 0) {
      if (intensity > 0.7) return t.profit.high;
      if (intensity > 0.4) return t.profit.mid;
      return t.profit.low;
    }
    if (intensity > 0.7) return t.loss.high;
    if (intensity > 0.4) return t.loss.mid;
    return t.loss.low;
  };

  const getComparisonColor = (change: number, hasData: boolean) => {
    if (!hasData) return t.emptyCell;
    const maxChange = Math.max(...comparisonData.map(d => Math.abs(d.change)), 1);
    const intensity = Math.abs(change) / maxChange;
    if (change > 0) return intensity > 0.5 ? t.improved.high : t.improved.low;
    if (change < 0) return intensity > 0.5 ? t.declined.high : t.declined.low;
    return t.emptyCell;
  };

  const cellVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: (i: number) => ({
      scale: 1,
      opacity: 1,
      transition: { delay: i * 0.015, duration: 0.25, ease: [0, 0, 0.2, 1] as const }
    }),
    hover: { scale: 1.08, zIndex: 10 }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.6, ease: "easeOut" }}
      key={theme}
    >
      <Card className={`relative overflow-hidden border-2 transition-all duration-500 ${viewMode === "normal" ? t.card : t.cardComparison}`}>
        {/* Background effects */}
        <div className={`absolute inset-0 ${t.grid} bg-[size:20px_20px]`} />
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-20 transition-colors duration-500 ${viewMode === "normal" ? t.orb1 : t.orbComparison1}`} />
        <div className={`absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-10 transition-colors duration-500 ${viewMode === "normal" ? t.orb2 : t.orbComparison2}`} />
        
        <CardHeader className="relative pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <motion.div 
              className="flex items-center gap-4"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className={`relative p-3 rounded-2xl border-2 ${viewMode === "normal" ? "bg-gradient-to-br from-amber-500/30 to-amber-600/20 border-amber-500/40" : "bg-gradient-to-br from-violet-500/30 to-violet-600/20 border-violet-500/40"}`}>
                <div className={`absolute inset-0 rounded-2xl blur-xl opacity-50 ${viewMode === "normal" ? "bg-amber-500" : "bg-violet-500"}`} />
                {viewMode === "normal" ? <Activity className="w-6 h-6 text-amber-400 relative z-10" /> : <GitCompare className="w-6 h-6 text-violet-400 relative z-10" />}
              </div>
              <div>
                <CardTitle className={`text-xl font-bold flex items-center gap-2 ${t.header}`}>
                  {viewMode === "normal" ? "Heatmap de Performance" : "Comparação de Períodos"}
                  <Sparkles className={`w-4 h-4 ${viewMode === "normal" ? "text-amber-400" : "text-violet-400"}`} />
                </CardTitle>
                <CardDescription className={`text-sm mt-1 ${t.subHeader}`}>
                  {viewMode === "normal" ? "Descubra seus horários mais lucrativos" : `${getPeriodLabel(comparisonPeriod)} atual vs anterior`}
                </CardDescription>
              </div>
            </motion.div>
            
            <motion.div 
              className="flex flex-wrap items-center gap-3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {/* Theme Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={`h-9 px-3 rounded-xl transition-all duration-300 ${t.toggleBg}`}
              >
                <AnimatePresence mode="wait">
                  {theme === "dark" ? (
                    <motion.div
                      key="dark"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2"
                    >
                      <Moon className="w-4 h-4 text-violet-400" />
                      <span className="text-xs font-medium text-slate-300">Escuro</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="light"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2"
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-medium text-slate-600">Claro</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>

              {/* View Mode Toggle */}
              <div className={`flex items-center rounded-xl p-1.5 border ${t.toggleBg}`}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode("normal")} 
                  className={`px-4 h-9 rounded-lg transition-all duration-300 ${viewMode === "normal" ? "bg-gradient-to-r from-amber-500/30 to-amber-600/20 text-amber-500 shadow-lg shadow-amber-500/20" : `${t.subHeader} hover:text-amber-500`}`}
                >
                  <Activity className="w-4 h-4 mr-2" />Normal
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode("comparison")} 
                  className={`px-4 h-9 rounded-lg transition-all duration-300 ${viewMode === "comparison" ? "bg-gradient-to-r from-violet-500/30 to-violet-600/20 text-violet-500 shadow-lg shadow-violet-500/20" : `${t.subHeader} hover:text-violet-500`}`}
                >
                  <GitCompare className="w-4 h-4 mr-2" />Comparar
                </Button>
              </div>

              <AnimatePresence>
                {viewMode === "comparison" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Select value={comparisonPeriod} onValueChange={(v) => setComparisonPeriod(v as ComparisonPeriod)}>
                      <SelectTrigger className={`w-[160px] h-9 rounded-xl ${t.toggleBg}`}>
                        <Calendar className="w-4 h-4 mr-2 text-violet-400" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todo o período</SelectItem>
                        <SelectItem value="week">Semana</SelectItem>
                        <SelectItem value="month">Mês</SelectItem>
                        <SelectItem value="quarter">Trimestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}
              </AnimatePresence>

              {viewMode === "normal" && bestSlot && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Badge className="hidden lg:flex bg-gradient-to-r from-emerald-500/20 to-emerald-600/10 border-emerald-500/40 text-emerald-500 px-3 py-1.5 rounded-xl">
                    <Crown className="w-4 h-4 mr-2 text-amber-500" />
                    Melhor: {bestSlot.weekday} {bestSlot.hour}
                  </Badge>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Quick Stats Bar */}
          <motion.div 
            className={`flex flex-wrap gap-4 mt-4 pt-4 border-t ${theme === "dark" ? "border-slate-700/50" : "border-slate-200"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${t.statBg}`}>
              <Activity className={`w-4 h-4 ${t.statText}`} />
              <span className={`text-sm ${t.statText}`}>Operações:</span>
              <span className={`text-sm font-bold ${t.statValue}`}>{totalOps}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${t.statBg}`}>
              {totalResult >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-rose-500" />}
              <span className={`text-sm ${t.statText}`}>Resultado:</span>
              <span className={`text-sm font-bold ${totalResult >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {formatCurrency(totalResult)}
              </span>
            </div>
            {bestSlot && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Flame className="w-4 h-4 text-amber-500" />
                <span className="text-sm text-emerald-500">Melhor slot: <span className="font-bold">{formatCurrency(bestSlot.totalResult)}</span></span>
              </div>
            )}
          </motion.div>
        </CardHeader>
        
        <CardContent className="relative pt-2 pb-6">
          <TooltipProvider delayDuration={50}>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Weekday Headers */}
                <motion.div 
                  className="flex gap-2 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="w-16" />
                  {WEEKDAYS.map((day, i) => (
                    <motion.div 
                      key={day} 
                      className="flex-1 min-w-[80px] text-center"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                    >
                      <span className={`text-sm font-bold px-4 py-2 rounded-xl border inline-block ${t.weekdayBg}`}>
                        {day}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Heatmap Grid */}
                <div className="space-y-2">
                  {HOURS.map((hour, hourIndex) => (
                    <div key={hour} className="flex gap-2">
                      <motion.div 
                        className={`w-16 text-sm font-semibold flex items-center justify-end pr-3 ${t.hourText}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + hourIndex * 0.03 }}
                      >
                        {hour}
                      </motion.div>
                      {WEEKDAYS.map((day, dayIndex) => {
                        const cellKey = `${day}-${hour}`;
                        const cellIndex = hourIndex * 5 + dayIndex;
                        
                        if (viewMode === "normal") {
                          const cellData = heatmapData.find(d => d.weekday === day && d.hour === hour);
                          const colors = getColorIntensity(cellData?.result || 0, cellData?.operations || 0);
                          const isBest = bestSlot?.weekday === day && bestSlot?.hour === hour;
                          const isWorst = worstSlot?.weekday === day && worstSlot?.hour === hour && (worstSlot?.totalResult || 0) < 0;

                          return (
                            <Tooltip key={cellKey}>
                              <TooltipTrigger asChild>
                                <motion.div
                                  custom={cellIndex}
                                  variants={cellVariants}
                                  initial="initial"
                                  animate="animate"
                                  whileHover="hover"
                                  onMouseEnter={() => setHoveredCell(cellKey)}
                                  onMouseLeave={() => setHoveredCell(null)}
                                  className={`relative flex-1 min-w-[80px] h-16 rounded-xl flex items-center justify-center text-sm cursor-pointer border-2 transition-all duration-300 ${colors.bg} ${colors.border} ${colors.text} ${colors.glow} ${isBest ? `ring-2 ring-amber-400 ring-offset-2 ${t.ringOffset}` : ""} ${isWorst ? `ring-2 ring-rose-400 ring-offset-2 ${t.ringOffset}` : ""}`}
                                >
                                  {isBest && (
                                    <motion.div 
                                      className="absolute -top-2 -right-2 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full p-1.5 shadow-lg shadow-amber-500/50"
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ delay: 0.5, type: "spring" }}
                                    >
                                      <Crown className="w-3 h-3 text-amber-900" />
                                    </motion.div>
                                  )}
                                  {isWorst && (
                                    <motion.div 
                                      className="absolute -top-2 -right-2 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full p-1.5 shadow-lg shadow-rose-500/50"
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ delay: 0.5, type: "spring" }}
                                    >
                                      <AlertTriangle className="w-3 h-3 text-white" />
                                    </motion.div>
                                  )}
                                  {(cellData?.operations || 0) > 0 && (
                                    <span className="text-lg">{cellData?.operations}</span>
                                  )}
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent 
                                side="top" 
                                className={`backdrop-blur-xl border-2 p-4 rounded-2xl shadow-2xl min-w-[200px] ${t.tooltipBg}`}
                              >
                                <div className="flex items-center gap-2 mb-3">
                                  <div className={`p-1.5 rounded-lg ${(cellData?.totalResult || 0) >= 0 ? "bg-emerald-500/20" : "bg-rose-500/20"}`}>
                                    <Activity className={`w-4 h-4 ${(cellData?.totalResult || 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`} />
                                  </div>
                                  <p className={`font-bold ${t.header}`}>{day} às {hour}</p>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className={`text-sm ${t.subHeader}`}>Operações</span>
                                    <span className={`font-bold ${t.header}`}>{cellData?.operations || 0}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className={`text-sm ${t.subHeader}`}>Resultado</span>
                                    <span className={`font-bold ${(cellData?.totalResult || 0) > 0 ? "text-emerald-500" : (cellData?.totalResult || 0) < 0 ? "text-rose-500" : t.subHeader}`}>
                                      {formatCurrency(cellData?.totalResult || 0)}
                                    </span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        } else {
                          const cellData = comparisonData.find(d => d.weekday === day && d.hour === hour);
                          const hasData = (cellData?.operations || 0) > 0 || (cellData?.previousOperations || 0) > 0;
                          const colors = getComparisonColor(cellData?.change || 0, hasData);

                          return (
                            <Tooltip key={cellKey}>
                              <TooltipTrigger asChild>
                                <motion.div
                                  custom={cellIndex}
                                  variants={cellVariants}
                                  initial="initial"
                                  animate="animate"
                                  whileHover="hover"
                                  onMouseEnter={() => setHoveredCell(cellKey)}
                                  onMouseLeave={() => setHoveredCell(null)}
                                  className={`flex-1 min-w-[80px] h-16 rounded-xl flex flex-col items-center justify-center cursor-pointer border-2 transition-all duration-300 ${colors.bg} ${colors.border} ${colors.text} ${colors.glow}`}
                                >
                                  {hasData && cellData && (
                                    <>
                                      <div className="flex items-center gap-1">
                                        {cellData.change > 0 ? <ArrowUp className="w-3.5 h-3.5" /> : cellData.change < 0 ? <ArrowDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                        <span className="text-xs font-bold">{cellData.changePercent > 0 ? "+" : ""}{cellData.changePercent.toFixed(0)}%</span>
                                      </div>
                                      <span className="text-[10px] opacity-70 mt-0.5">{cellData.operations} ops</span>
                                    </>
                                  )}
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent 
                                side="top" 
                                className={`backdrop-blur-xl border-2 p-4 rounded-2xl shadow-2xl min-w-[240px] ${t.tooltipBg}`}
                              >
                                <div className="flex items-center gap-2 mb-3">
                                  <GitCompare className="w-4 h-4 text-violet-500" />
                                  <p className={`font-bold ${t.header}`}>{day} às {hour}</p>
                                </div>
                                <div className={`grid grid-cols-2 gap-4 mb-3`}>
                                  <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-slate-700/30" : "bg-slate-100"}`}>
                                    <p className={`text-[10px] uppercase tracking-wide ${t.subHeader}`}>Atual</p>
                                    <p className={`font-bold ${t.header}`}>{formatCurrency(cellData?.totalResult || 0)}</p>
                                  </div>
                                  <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-slate-700/30" : "bg-slate-100"}`}>
                                    <p className={`text-[10px] uppercase tracking-wide ${t.subHeader}`}>Anterior</p>
                                    <p className={`font-bold ${t.header}`}>{formatCurrency(cellData?.previousTotalResult || 0)}</p>
                                  </div>
                                </div>
                                <div className={`pt-3 border-t flex justify-between items-center ${theme === "dark" ? "border-slate-700/50" : "border-slate-200"}`}>
                                  <span className={`text-sm ${t.subHeader}`}>Variação</span>
                                  <span className={`font-bold ${(cellData?.change || 0) > 0 ? "text-cyan-500" : (cellData?.change || 0) < 0 ? "text-orange-500" : t.subHeader}`}>
                                    {(cellData?.change || 0) > 0 ? "+" : ""}{formatCurrency(cellData?.change || 0)}
                                  </span>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        }
                      })}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <motion.div 
                  className="mt-8 flex flex-wrap items-center justify-center gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  {viewMode === "normal" ? (
                    <>
                      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${t.legendProfit}`}>
                        <div className={`w-5 h-5 rounded-lg ${t.loss.high.bg}`} />
                        <span className="text-sm font-medium text-rose-500">Prejuízo</span>
                      </div>
                      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${t.legendEmpty}`}>
                        <div className={`w-5 h-5 rounded-lg ${t.emptyCell.bg}`} />
                        <span className={`text-sm font-medium ${t.subHeader}`}>Sem dados</span>
                      </div>
                      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${t.legendLoss}`}>
                        <div className={`w-5 h-5 rounded-lg ${t.profit.high.bg}`} />
                        <span className="text-sm font-medium text-emerald-500">Lucro</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30">
                        <ArrowDown className="w-5 h-5 text-orange-500" />
                        <span className="text-sm font-medium text-orange-500">Piorou</span>
                      </div>
                      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${t.legendEmpty}`}>
                        <Minus className={`w-5 h-5 ${t.subHeader}`} />
                        <span className={`text-sm font-medium ${t.subHeader}`}>Sem mudança</span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                        <ArrowUp className="w-5 h-5 text-cyan-500" />
                        <span className="text-sm font-medium text-cyan-500">Melhorou</span>
                      </div>
                    </>
                  )}
                </motion.div>

                {/* Comparison Stats */}
                <AnimatePresence>
                  {viewMode === "comparison" && comparisonStats && (
                    <motion.div 
                      className={`mt-6 p-5 rounded-2xl border-2 ${t.comparisonStatsBg}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="flex flex-wrap items-center justify-center gap-8">
                        <div className="text-center">
                          <p className={`text-xs uppercase tracking-wide mb-1 ${t.subHeader}`}>Variação Total</p>
                          <p className={`text-2xl font-bold ${comparisonStats.totalChange > 0 ? "text-cyan-500" : comparisonStats.totalChange < 0 ? "text-orange-500" : t.subHeader}`}>
                            {comparisonStats.totalChange > 0 ? "+" : ""}{formatCurrency(comparisonStats.totalChange)}
                          </p>
                        </div>
                        <div className={`h-12 w-px hidden md:block ${theme === "dark" ? "bg-slate-700/50" : "bg-slate-200"}`} />
                        <div className="text-center">
                          <p className={`text-xs uppercase tracking-wide mb-1 ${t.subHeader}`}>Melhoraram</p>
                          <p className="text-2xl font-bold text-cyan-500">{comparisonStats.improved}</p>
                        </div>
                        <div className={`h-12 w-px hidden md:block ${theme === "dark" ? "bg-slate-700/50" : "bg-slate-200"}`} />
                        <div className="text-center">
                          <p className={`text-xs uppercase tracking-wide mb-1 ${t.subHeader}`}>Pioraram</p>
                          <p className="text-2xl font-bold text-orange-500">{comparisonStats.declined}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PerformanceHeatmap;
