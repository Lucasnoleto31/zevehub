// Performance Heatmap - Premium Clean Design
import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Crown, AlertTriangle, GitCompare, Calendar, ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
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
  wins: number;
  losses: number;
}

interface ComparisonData extends HeatmapData {
  previousOperations: number;
  previousTotalResult: number;
  change: number;
  changePercent: number;
}

interface PerformanceHeatmapProps {
  operations: Operation[];
  preAggregatedData?: HeatmapData[];
}

type ViewMode = "normal" | "comparison";
type ComparisonPeriod = "all" | "week" | "month" | "quarter";
type HeatmapTheme = "dark" | "light";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const HOURS = Array.from({ length: 9 }, (_, i) => `${i + 9}h`);

const PerformanceHeatmap = ({ operations, preAggregatedData }: PerformanceHeatmapProps) => {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>("all");
  const [theme, setTheme] = useState<HeatmapTheme>("dark");

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
        const wins = results.filter(r => r > 0).length;
        const losses = results.filter(r => r < 0).length;
        result.push({
          weekday: weekdayNames[day],
          hour: `${hour}h`,
          result: results.length > 0 ? totalResult / results.length : 0,
          operations: results.length,
          totalResult,
          wins,
          losses,
        });
      }
    }
    return result;
  }, []);

  const heatmapData = useMemo(() => preAggregatedData || processOperations(operations), [operations, processOperations, preAggregatedData]);

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

  const isDark = theme === "dark";

  const getCellStyle = (result: number, ops: number) => {
    if (ops === 0) {
      return isDark 
        ? "bg-slate-800/40 border-slate-700/30 text-slate-600" 
        : "bg-slate-100 border-slate-200 text-slate-400";
    }
    
    const maxResult = Math.max(...heatmapData.map(d => Math.abs(d.result)), 1);
    const intensity = Math.min(Math.abs(result) / maxResult, 1);
    
    if (result > 0) {
      if (intensity > 0.6) return isDark 
        ? "bg-emerald-500/90 border-emerald-400/50 text-white" 
        : "bg-emerald-500 border-emerald-400 text-white";
      if (intensity > 0.3) return isDark 
        ? "bg-emerald-500/50 border-emerald-400/30 text-emerald-100" 
        : "bg-emerald-400/70 border-emerald-300 text-white";
      return isDark 
        ? "bg-emerald-500/25 border-emerald-400/20 text-emerald-300" 
        : "bg-emerald-100 border-emerald-200 text-emerald-700";
    }
    
    if (intensity > 0.6) return isDark 
      ? "bg-rose-500/90 border-rose-400/50 text-white" 
      : "bg-rose-500 border-rose-400 text-white";
    if (intensity > 0.3) return isDark 
      ? "bg-rose-500/50 border-rose-400/30 text-rose-100" 
      : "bg-rose-400/70 border-rose-300 text-white";
    return isDark 
      ? "bg-rose-500/25 border-rose-400/20 text-rose-300" 
      : "bg-rose-100 border-rose-200 text-rose-700";
  };

  const getComparisonStyle = (change: number, hasData: boolean) => {
    if (!hasData) {
      return isDark 
        ? "bg-slate-800/40 border-slate-700/30 text-slate-600" 
        : "bg-slate-100 border-slate-200 text-slate-400";
    }
    
    const maxChange = Math.max(...comparisonData.map(d => Math.abs(d.change)), 1);
    const intensity = Math.min(Math.abs(change) / maxChange, 1);
    
    if (change > 0) {
      return intensity > 0.5 
        ? (isDark ? "bg-cyan-500/80 border-cyan-400/50 text-white" : "bg-cyan-500 border-cyan-400 text-white")
        : (isDark ? "bg-cyan-500/30 border-cyan-400/20 text-cyan-300" : "bg-cyan-100 border-cyan-200 text-cyan-700");
    }
    if (change < 0) {
      return intensity > 0.5 
        ? (isDark ? "bg-orange-500/80 border-orange-400/50 text-white" : "bg-orange-500 border-orange-400 text-white")
        : (isDark ? "bg-orange-500/30 border-orange-400/20 text-orange-300" : "bg-orange-100 border-orange-200 text-orange-700");
    }
    return isDark 
      ? "bg-slate-800/40 border-slate-700/30 text-slate-500" 
      : "bg-slate-100 border-slate-200 text-slate-400";
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      key={theme}
    >
      <Card className={`border transition-colors duration-300 ${
        isDark 
          ? "bg-slate-900/80 border-slate-700/50" 
          : "bg-white border-slate-200 shadow-sm"
      }`}>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                viewMode === "normal" 
                  ? isDark ? "bg-amber-500/15 text-amber-400" : "bg-amber-100 text-amber-600"
                  : isDark ? "bg-violet-500/15 text-violet-400" : "bg-violet-100 text-violet-600"
              }`}>
                {viewMode === "normal" ? <Activity className="w-5 h-5" /> : <GitCompare className="w-5 h-5" />}
              </div>
              <div>
                <CardTitle className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                  {viewMode === "normal" ? "Heatmap de Performance" : "Comparação de Períodos"}
                </CardTitle>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {viewMode === "normal" ? "Análise por horário e dia da semana" : `${getPeriodLabel(comparisonPeriod)} atual vs anterior`}
                </p>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={`h-9 w-9 p-0 rounded-lg ${
                  isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                }`}
              >
                {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>

              {/* View Mode Toggle */}
              <div className={`flex items-center rounded-lg p-1 ${
                isDark ? "bg-slate-800/60" : "bg-slate-100"
              }`}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode("normal")} 
                  className={`h-8 px-3 rounded-md text-xs font-medium transition-all ${
                    viewMode === "normal" 
                      ? isDark ? "bg-slate-700 text-amber-400" : "bg-white text-amber-600 shadow-sm"
                      : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Normal
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode("comparison")} 
                  className={`h-8 px-3 rounded-md text-xs font-medium transition-all ${
                    viewMode === "comparison" 
                      ? isDark ? "bg-slate-700 text-violet-400" : "bg-white text-violet-600 shadow-sm"
                      : isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Comparar
                </Button>
              </div>

              <AnimatePresence>
                {viewMode === "comparison" && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Select value={comparisonPeriod} onValueChange={(v) => setComparisonPeriod(v as ComparisonPeriod)}>
                      <SelectTrigger className={`w-[140px] h-9 text-xs ${
                        isDark 
                          ? "bg-slate-800/60 border-slate-700 text-slate-200" 
                          : "bg-white border-slate-200 text-slate-700"
                      }`}>
                        <Calendar className="w-3.5 h-3.5 mr-2 opacity-50" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={isDark ? "bg-slate-800 border-slate-700" : ""}>
                        <SelectItem value="all">Todo período</SelectItem>
                        <SelectItem value="week">Semana</SelectItem>
                        <SelectItem value="month">Mês</SelectItem>
                        <SelectItem value="quarter">Trimestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Stats Row */}
          <div className={`flex flex-wrap gap-6 mt-4 pt-4 border-t ${isDark ? "border-slate-700/50" : "border-slate-200"}`}>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>Total:</span>
              <span className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>{totalOps} operações</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>Resultado:</span>
              <span className={`text-sm font-semibold ${totalResult >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {formatCurrency(totalResult)}
              </span>
            </div>
            {bestSlot && (
              <div className="flex items-center gap-2">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                <span className={`text-sm ${isDark ? "text-slate-500" : "text-slate-400"}`}>Melhor:</span>
                <span className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  {bestSlot.weekday} {bestSlot.hour}
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 pb-6">
          <TooltipProvider delayDuration={100}>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Weekday Headers */}
                <div className="flex gap-1.5 mb-3">
                  <div className="w-12" />
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="flex-1 min-w-[70px] text-center">
                      <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {day}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Heatmap Grid */}
                <div className="space-y-1.5">
                  {HOURS.map((hour, hourIndex) => (
                    <div key={hour} className="flex gap-1.5">
                      <div className={`w-12 text-xs font-medium flex items-center justify-end pr-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                        {hour}
                      </div>
                      {WEEKDAYS.map((day, dayIndex) => {
                        const cellKey = `${day}-${hour}`;
                        const cellIndex = hourIndex * 5 + dayIndex;
                        
                        if (viewMode === "normal") {
                          const cellData = heatmapData.find(d => d.weekday === day && d.hour === hour);
                          const cellStyle = getCellStyle(cellData?.result || 0, cellData?.operations || 0);
                          const isBest = bestSlot?.weekday === day && bestSlot?.hour === hour;
                          const isWorst = worstSlot?.weekday === day && worstSlot?.hour === hour && (worstSlot?.totalResult || 0) < 0;

                          return (
                            <Tooltip key={cellKey}>
                              <TooltipTrigger asChild>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: cellIndex * 0.01, duration: 0.2 }}
                                  whileHover={{ scale: 1.03 }}
                                  onMouseEnter={() => setHoveredCell(cellKey)}
                                  onMouseLeave={() => setHoveredCell(null)}
                                  className={`relative flex-1 min-w-[70px] h-14 rounded-lg flex items-center justify-center text-sm font-semibold cursor-pointer border transition-all duration-200 ${cellStyle} ${
                                    isBest ? `ring-2 ring-amber-400 ${isDark ? "ring-offset-slate-900" : "ring-offset-white"} ring-offset-1` : ""
                                  } ${
                                    isWorst ? `ring-2 ring-rose-400 ${isDark ? "ring-offset-slate-900" : "ring-offset-white"} ring-offset-1` : ""
                                  }`}
                                >
                                  {isBest && (
                                    <div className="absolute -top-1.5 -right-1.5 bg-amber-500 rounded-full p-1">
                                      <Crown className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  )}
                                  {isWorst && (
                                    <div className="absolute -top-1.5 -right-1.5 bg-rose-500 rounded-full p-1">
                                      <AlertTriangle className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  )}
                                  {(cellData?.operations || 0) > 0 && (
                                    <span>{cellData?.operations}</span>
                                  )}
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent 
                                side="top" 
                                className={`p-4 rounded-xl border min-w-[200px] ${
                                  isDark 
                                    ? "bg-slate-800 border-slate-700" 
                                    : "bg-white border-slate-200 shadow-lg"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                                  <div className={`p-1.5 rounded-lg ${(cellData?.totalResult || 0) >= 0 ? "bg-emerald-500/15" : "bg-rose-500/15"}`}>
                                    <Activity className={`w-4 h-4 ${(cellData?.totalResult || 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`} />
                                  </div>
                                  <p className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>{day} às {hour}</p>
                                </div>
                                <div className="space-y-2.5">
                                  <div className="flex justify-between items-center">
                                    <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Operações</span>
                                    <span className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>{cellData?.operations || 0}</span>
                                  </div>
                                  <div className="flex justify-between items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                      <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Ganhos</span>
                                    </div>
                                    <span className="font-semibold text-emerald-500">{cellData?.wins || 0}</span>
                                  </div>
                                  <div className="flex justify-between items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                                      <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Perdas</span>
                                    </div>
                                    <span className="font-semibold text-rose-500">{cellData?.losses || 0}</span>
                                  </div>
                                  <div className={`flex justify-between items-center pt-2.5 mt-1 border-t ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                                    <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Resultado</span>
                                    <span className={`font-semibold ${(cellData?.totalResult || 0) > 0 ? "text-emerald-500" : (cellData?.totalResult || 0) < 0 ? "text-rose-500" : isDark ? "text-slate-400" : "text-slate-500"}`}>
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
                          const cellStyle = getComparisonStyle(cellData?.change || 0, hasData);

                          return (
                            <Tooltip key={cellKey}>
                              <TooltipTrigger asChild>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: cellIndex * 0.01, duration: 0.2 }}
                                  whileHover={{ scale: 1.03 }}
                                  onMouseEnter={() => setHoveredCell(cellKey)}
                                  onMouseLeave={() => setHoveredCell(null)}
                                  className={`flex-1 min-w-[70px] h-14 rounded-lg flex flex-col items-center justify-center cursor-pointer border transition-all duration-200 ${cellStyle}`}
                                >
                                  {hasData && cellData && (
                                    <>
                                      <div className="flex items-center gap-0.5">
                                        {cellData.change > 0 ? <ArrowUp className="w-3 h-3" /> : cellData.change < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                        <span className="text-xs font-semibold">{cellData.changePercent > 0 ? "+" : ""}{cellData.changePercent.toFixed(0)}%</span>
                                      </div>
                                      <span className="text-[10px] opacity-60">{cellData.operations} ops</span>
                                    </>
                                  )}
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent 
                                side="top" 
                                className={`p-4 rounded-xl border min-w-[220px] ${
                                  isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-lg"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                                  <div className="p-1.5 rounded-lg bg-violet-500/15">
                                    <GitCompare className="w-4 h-4 text-violet-500" />
                                  </div>
                                  <p className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>{day} às {hour}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                  <div className={`p-2.5 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-slate-100"}`}>
                                    <p className={`text-[10px] uppercase tracking-wide mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Atual</p>
                                    <p className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>{formatCurrency(cellData?.totalResult || 0)}</p>
                                  </div>
                                  <div className={`p-2.5 rounded-lg ${isDark ? "bg-slate-700/50" : "bg-slate-100"}`}>
                                    <p className={`text-[10px] uppercase tracking-wide mb-1 ${isDark ? "text-slate-500" : "text-slate-400"}`}>Anterior</p>
                                    <p className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>{formatCurrency(cellData?.previousTotalResult || 0)}</p>
                                  </div>
                                </div>
                                <div className={`flex justify-between items-center pt-3 border-t ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                                  <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Variação</span>
                                  <span className={`font-semibold ${(cellData?.change || 0) > 0 ? "text-cyan-500" : (cellData?.change || 0) < 0 ? "text-orange-500" : isDark ? "text-slate-400" : "text-slate-500"}`}>
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
                <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
                  {viewMode === "normal" ? (
                    <>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${isDark ? "bg-rose-500/90" : "bg-rose-500"}`} />
                        <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Prejuízo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${isDark ? "bg-slate-800/60" : "bg-slate-100"} border ${isDark ? "border-slate-700" : "border-slate-200"}`} />
                        <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Sem dados</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${isDark ? "bg-emerald-500/90" : "bg-emerald-500"}`} />
                        <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Lucro</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <ArrowDown className="w-4 h-4 text-orange-500" />
                        <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Piorou</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Minus className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                        <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Sem mudança</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowUp className="w-4 h-4 text-cyan-500" />
                        <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Melhorou</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Comparison Stats */}
                <AnimatePresence>
                  {viewMode === "comparison" && comparisonStats && (
                    <motion.div 
                      className={`mt-6 p-4 rounded-xl border ${
                        isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex flex-wrap justify-center gap-8">
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            <TrendingUp className="w-4 h-4 text-cyan-500" />
                            <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Melhoraram</span>
                          </div>
                          <p className="text-xl font-bold text-cyan-500">{comparisonStats.improved}</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            <TrendingDown className="w-4 h-4 text-orange-500" />
                            <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Pioraram</span>
                          </div>
                          <p className="text-xl font-bold text-orange-500">{comparisonStats.declined}</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-1.5 mb-1">
                            {comparisonStats.totalChange >= 0 ? <ArrowUp className="w-4 h-4 text-emerald-500" /> : <ArrowDown className="w-4 h-4 text-rose-500" />}
                            <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Variação Total</span>
                          </div>
                          <p className={`text-xl font-bold ${comparisonStats.totalChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                            {comparisonStats.totalChange >= 0 ? "+" : ""}{formatCurrency(comparisonStats.totalChange)}
                          </p>
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
