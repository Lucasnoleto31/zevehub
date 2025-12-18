import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, Flame, Snowflake, Target, Crown, AlertTriangle, Sparkles, GitCompare, Calendar, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  bestTrade: number;
  worstTrade: number;
  totalResult: number;
}

interface ComparisonData extends HeatmapData {
  previousResult: number;
  previousOperations: number;
  previousTotalResult: number;
  change: number;
  changePercent: number;
}

interface PerformanceHeatmapProps {
  operations: Operation[];
}

type ViewMode = 'normal' | 'comparison';
type ComparisonPeriod = 'week' | 'month' | 'quarter';

const PerformanceHeatmap = ({ operations }: PerformanceHeatmapProps) => {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('month');

  const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex"];
  const hours = Array.from({ length: 9 }, (_, i) => `${i + 9}h`);

  // Filter operations by period
  const filterByPeriod = (ops: Operation[], periodType: 'current' | 'previous', period: ComparisonPeriod) => {
    const now = new Date();
    let startDate: Date, endDate: Date;

    if (period === 'week') {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      
      if (periodType === 'current') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() + mondayOffset);
        endDate = now;
      } else {
        endDate = new Date(now);
        endDate.setDate(now.getDate() + mondayOffset - 1);
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 6);
      }
    } else if (period === 'month') {
      if (periodType === 'current') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      }
    } else {
      // quarter
      const currentQuarter = Math.floor(now.getMonth() / 3);
      if (periodType === 'current') {
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
      const [year, month, day] = op.operation_date.split('-').map(Number);
      const opDate = new Date(year, month - 1, day);
      return opDate >= startDate && opDate <= endDate;
    });
  };

  // Process heatmap data for a set of operations
  const processOperations = (ops: Operation[]): HeatmapData[] => {
    const heatmapMap = new Map<string, { results: number[]; count: number }>();
    const weekdayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    ops.forEach((op) => {
      const [year, month, day] = op.operation_date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const weekday = date.getDay();
      const hour = parseInt(op.operation_time.split(":")[0]);

      if (weekday === 0 || weekday === 6) return;

      const key = `${weekday}-${hour}`;

      if (!heatmapMap.has(key)) {
        heatmapMap.set(key, { results: [], count: 0 });
      }

      const current = heatmapMap.get(key)!;
      current.results.push(op.result);
      current.count += 1;
    });

    const heatmapArray: HeatmapData[] = [];

    for (let day = 1; day <= 5; day++) {
      for (let hour = 9; hour <= 17; hour++) {
        const key = `${day}-${hour}`;
        const data = heatmapMap.get(key);

        if (data && data.results.length > 0) {
          const totalResult = data.results.reduce((sum, r) => sum + r, 0);
          const avgResult = totalResult / data.results.length;
          const bestTrade = Math.max(...data.results);
          const worstTrade = Math.min(...data.results);

          heatmapArray.push({
            weekday: weekdayNames[day],
            hour: `${hour}h`,
            result: avgResult,
            operations: data.count,
            bestTrade,
            worstTrade,
            totalResult,
          });
        } else {
          heatmapArray.push({
            weekday: weekdayNames[day],
            hour: `${hour}h`,
            result: 0,
            operations: 0,
            bestTrade: 0,
            worstTrade: 0,
            totalResult: 0,
          });
        }
      }
    }

    return heatmapArray;
  };

  // Normal mode data
  const heatmapData = useMemo(() => processOperations(operations), [operations]);

  // Comparison mode data
  const comparisonData = useMemo((): ComparisonData[] => {
    const currentOps = filterByPeriod(operations, 'current', comparisonPeriod);
    const previousOps = filterByPeriod(operations, 'previous', comparisonPeriod);

    const currentData = processOperations(currentOps);
    const previousData = processOperations(previousOps);

    return currentData.map((current, index) => {
      const previous = previousData[index];
      const change = current.totalResult - previous.totalResult;
      const changePercent = previous.totalResult !== 0 
        ? ((current.totalResult - previous.totalResult) / Math.abs(previous.totalResult)) * 100 
        : current.totalResult !== 0 ? 100 : 0;

      return {
        ...current,
        previousResult: previous.result,
        previousOperations: previous.operations,
        previousTotalResult: previous.totalResult,
        change,
        changePercent,
      };
    });
  }, [operations, comparisonPeriod]);

  // Calculate best and worst slots
  const { bestSlot, worstSlot, totalOperations } = useMemo(() => {
    const data = viewMode === 'normal' ? heatmapData : comparisonData;
    if (data.length === 0) return { bestSlot: null, worstSlot: null, totalOperations: 0 };
    
    const withOps = data.filter(d => d.operations > 0);
    if (withOps.length === 0) return { bestSlot: null, worstSlot: null, totalOperations: 0 };
    
    const best = withOps.reduce((max, d) => d.totalResult > max.totalResult ? d : max, withOps[0]);
    const worst = withOps.reduce((min, d) => d.totalResult < min.totalResult ? d : min, withOps[0]);
    const total = withOps.reduce((sum, d) => sum + d.operations, 0);
    
    return { bestSlot: best, worstSlot: worst, totalOperations: total };
  }, [heatmapData, comparisonData, viewMode]);

  // Comparison stats
  const comparisonStats = useMemo(() => {
    if (viewMode !== 'comparison') return null;
    
    const improved = comparisonData.filter(d => d.change > 0 && (d.operations > 0 || d.previousOperations > 0)).length;
    const declined = comparisonData.filter(d => d.change < 0 && (d.operations > 0 || d.previousOperations > 0)).length;
    const totalChange = comparisonData.reduce((sum, d) => sum + d.change, 0);

    return { improved, declined, totalChange };
  }, [comparisonData, viewMode]);

  const getColorIntensity = (result: number, operations: number, data: HeatmapData[]) => {
    if (operations === 0) return {
      bg: "bg-muted/30",
      border: "border-border/20",
      text: "text-muted-foreground/30",
      glow: ""
    };
    
    const maxResult = Math.max(...data.map(d => Math.abs(d.result)));
    const intensity = maxResult > 0 ? Math.abs(result) / maxResult : 0;
    
    if (result > 0) {
      if (intensity > 0.7) return {
        bg: "bg-emerald-500/90",
        border: "border-emerald-400/50",
        text: "text-white font-semibold",
        glow: "shadow-[0_0_20px_rgba(16,185,129,0.4)]"
      };
      if (intensity > 0.4) return {
        bg: "bg-emerald-500/60",
        border: "border-emerald-400/30",
        text: "text-white",
        glow: "shadow-[0_0_12px_rgba(16,185,129,0.25)]"
      };
      if (intensity > 0.1) return {
        bg: "bg-emerald-500/35",
        border: "border-emerald-400/20",
        text: "text-emerald-200",
        glow: ""
      };
      return {
        bg: "bg-emerald-500/20",
        border: "border-emerald-400/10",
        text: "text-emerald-300/80",
        glow: ""
      };
    } else if (result < 0) {
      if (intensity > 0.7) return {
        bg: "bg-rose-500/90",
        border: "border-rose-400/50",
        text: "text-white font-semibold",
        glow: "shadow-[0_0_20px_rgba(244,63,94,0.4)]"
      };
      if (intensity > 0.4) return {
        bg: "bg-rose-500/60",
        border: "border-rose-400/30",
        text: "text-white",
        glow: "shadow-[0_0_12px_rgba(244,63,94,0.25)]"
      };
      if (intensity > 0.1) return {
        bg: "bg-rose-500/35",
        border: "border-rose-400/20",
        text: "text-rose-200",
        glow: ""
      };
      return {
        bg: "bg-rose-500/20",
        border: "border-rose-400/10",
        text: "text-rose-300/80",
        glow: ""
      };
    }
    
    return {
      bg: "bg-muted/30",
      border: "border-border/20",
      text: "text-muted-foreground/50",
      glow: ""
    };
  };

  const getComparisonColor = (change: number, hasData: boolean) => {
    if (!hasData) return {
      bg: "bg-muted/30",
      border: "border-border/20",
      text: "text-muted-foreground/30",
      glow: ""
    };
    
    const absChange = Math.abs(change);
    const maxChange = Math.max(...comparisonData.map(d => Math.abs(d.change)));
    const intensity = maxChange > 0 ? absChange / maxChange : 0;
    
    if (change > 0) {
      if (intensity > 0.5) return {
        bg: "bg-cyan-500/80",
        border: "border-cyan-400/50",
        text: "text-white font-semibold",
        glow: "shadow-[0_0_20px_rgba(6,182,212,0.4)]"
      };
      return {
        bg: "bg-cyan-500/40",
        border: "border-cyan-400/30",
        text: "text-cyan-200",
        glow: ""
      };
    } else if (change < 0) {
      if (intensity > 0.5) return {
        bg: "bg-orange-500/80",
        border: "border-orange-400/50",
        text: "text-white font-semibold",
        glow: "shadow-[0_0_20px_rgba(249,115,22,0.4)]"
      };
      return {
        bg: "bg-orange-500/40",
        border: "border-orange-400/30",
        text: "text-orange-200",
        glow: ""
      };
    }
    
    return {
      bg: "bg-muted/50",
      border: "border-border/30",
      text: "text-muted-foreground",
      glow: ""
    };
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getPeriodLabel = (period: ComparisonPeriod) => {
    switch (period) {
      case 'week': return 'Semana';
      case 'month': return 'Mês';
      case 'quarter': return 'Trimestre';
    }
  };

  const renderCell = (day: string, hour: string, hourIndex: number, dayIndex: number) => {
    const cellKey = `${day}-${hour}`;
    const isHovered = hoveredCell === cellKey;

    if (viewMode === 'normal') {
      const cellData = heatmapData.find((d) => d.weekday === day && d.hour === hour);
      const colorStyles = getColorIntensity(cellData?.result || 0, cellData?.operations || 0, heatmapData);
      const isBestSlot = bestSlot && bestSlot.weekday === day && bestSlot.hour === hour;
      const isWorstSlot = worstSlot && worstSlot.weekday === day && worstSlot.hour === hour && worstSlot.totalResult < 0;

      return (
        <Tooltip key={cellKey}>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: (hourIndex * 5 + dayIndex) * 0.01 }}
              whileHover={{ scale: 1.08, zIndex: 10 }}
              onHoverStart={() => setHoveredCell(cellKey)}
              onHoverEnd={() => setHoveredCell(null)}
              className={`
                relative flex-1 min-w-[72px] h-14 rounded-lg 
                flex items-center justify-center 
                text-sm font-medium 
                transition-all duration-300 
                cursor-pointer border
                ${colorStyles.bg} ${colorStyles.border} ${colorStyles.text} ${colorStyles.glow}
                ${isHovered ? 'ring-2 ring-amber-400/50' : ''}
                ${isBestSlot ? 'ring-2 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.5)]' : ''}
                ${isWorstSlot ? 'ring-2 ring-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.5)]' : ''}
              `}
            >
              {isBestSlot && (
                <>
                  <motion.div
                    className="absolute -top-2 -right-2 z-20"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, delay: 0.5 }}
                  >
                    <div className="relative">
                      <motion.div
                        className="absolute inset-0 bg-amber-400 rounded-full blur-md"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <div className="relative bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full p-1.5 shadow-lg">
                        <Crown className="w-3 h-3 text-amber-900" />
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    className="absolute -top-1 -left-1"
                    animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                  </motion.div>
                </>
              )}
              
              {isWorstSlot && (
                <motion.div
                  className="absolute -top-2 -right-2 z-20"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.5 }}
                >
                  <div className="relative">
                    <motion.div
                      className="absolute inset-0 bg-rose-500 rounded-full blur-md"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <div className="relative bg-gradient-to-br from-rose-500 to-red-600 rounded-full p-1.5 shadow-lg">
                      <AlertTriangle className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </motion.div>
              )}

              {cellData && cellData.operations > 0 && (
                <span className="relative z-10">{cellData.operations}</span>
              )}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} className="bg-card/95 backdrop-blur-xl border border-border/50 p-0 shadow-2xl rounded-xl overflow-hidden min-w-[220px]">
            <div className="px-4 py-3 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-border/30">
              <p className="font-bold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {day} às {hour}
              </p>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Operações</span>
                <span className="font-semibold">{cellData?.operations || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resultado</span>
                <span className={`font-bold ${(cellData?.totalResult || 0) > 0 ? 'text-emerald-400' : (cellData?.totalResult || 0) < 0 ? 'text-rose-400' : ''}`}>
                  {formatCurrency(cellData?.totalResult || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Média</span>
                <span>{formatCurrency(cellData?.result || 0)}</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    } else {
      // Comparison mode
      const cellData = comparisonData.find((d) => d.weekday === day && d.hour === hour);
      const hasData = (cellData?.operations || 0) > 0 || (cellData?.previousOperations || 0) > 0;
      const colorStyles = getComparisonColor(cellData?.change || 0, hasData);

      return (
        <Tooltip key={cellKey}>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: (hourIndex * 5 + dayIndex) * 0.01 }}
              whileHover={{ scale: 1.08, zIndex: 10 }}
              onHoverStart={() => setHoveredCell(cellKey)}
              onHoverEnd={() => setHoveredCell(null)}
              className={`
                relative flex-1 min-w-[72px] h-14 rounded-lg 
                flex flex-col items-center justify-center gap-0.5
                text-xs font-medium 
                transition-all duration-300 
                cursor-pointer border
                ${colorStyles.bg} ${colorStyles.border} ${colorStyles.text} ${colorStyles.glow}
                ${isHovered ? 'ring-2 ring-violet-400/50' : ''}
              `}
            >
              {hasData && cellData && (
                <>
                  <div className="flex items-center gap-1">
                    {cellData.change > 0 ? (
                      <ArrowUp className="w-3 h-3 text-cyan-300" />
                    ) : cellData.change < 0 ? (
                      <ArrowDown className="w-3 h-3 text-orange-300" />
                    ) : (
                      <Minus className="w-3 h-3 text-muted-foreground" />
                    )}
                    <span className="text-[10px]">
                      {cellData.changePercent > 0 ? '+' : ''}{cellData.changePercent.toFixed(0)}%
                    </span>
                  </div>
                  <span className="text-[10px] opacity-70">
                    {cellData.operations} ops
                  </span>
                </>
              )}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8} className="bg-card/95 backdrop-blur-xl border border-border/50 p-0 shadow-2xl rounded-xl overflow-hidden min-w-[260px]">
            <div className="px-4 py-3 bg-gradient-to-r from-violet-500/20 to-transparent border-b border-border/30">
              <p className="font-bold text-foreground flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-violet-400" />
                {day} às {hour}
              </p>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{getPeriodLabel(comparisonPeriod)} Atual</p>
                  <p className="font-bold text-foreground">{formatCurrency(cellData?.totalResult || 0)}</p>
                  <p className="text-xs text-muted-foreground">{cellData?.operations || 0} ops</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{getPeriodLabel(comparisonPeriod)} Anterior</p>
                  <p className="font-bold text-foreground">{formatCurrency(cellData?.previousTotalResult || 0)}</p>
                  <p className="text-xs text-muted-foreground">{cellData?.previousOperations || 0} ops</p>
                </div>
              </div>
              <div className="pt-2 border-t border-border/30">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Variação</span>
                  <div className={`flex items-center gap-1 font-bold ${(cellData?.change || 0) > 0 ? 'text-cyan-400' : (cellData?.change || 0) < 0 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                    {(cellData?.change || 0) > 0 ? <TrendingUp className="w-4 h-4" /> : (cellData?.change || 0) < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                    {formatCurrency(cellData?.change || 0)}
                    <span className="text-xs ml-1">({cellData?.changePercent?.toFixed(1) || 0}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 ${
        viewMode === 'normal' 
          ? 'border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-950/10 hover:shadow-amber-500/5' 
          : 'border-violet-500/20 bg-gradient-to-br from-card via-card to-violet-950/10 hover:shadow-violet-500/5'
      }`}>
        {/* Background effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl -translate-y-48 translate-x-48 ${viewMode === 'normal' ? 'bg-amber-500/5' : 'bg-violet-500/5'}`} />
        
        {/* Corner accents */}
        <div className={`absolute top-0 left-0 w-24 h-24 border-l-2 border-t-2 rounded-tl-lg ${viewMode === 'normal' ? 'border-amber-500/20' : 'border-violet-500/20'}`} />
        <div className={`absolute bottom-0 right-0 w-24 h-24 border-r-2 border-b-2 rounded-br-lg ${viewMode === 'normal' ? 'border-amber-500/20' : 'border-violet-500/20'}`} />
        
        <CardHeader className="relative pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`absolute inset-0 rounded-xl blur-lg ${viewMode === 'normal' ? 'bg-amber-500/20' : 'bg-violet-500/20'}`} />
                <div className={`relative p-2.5 rounded-xl border ${viewMode === 'normal' ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30' : 'bg-gradient-to-br from-violet-500/20 to-violet-600/10 border-violet-500/30'}`}>
                  {viewMode === 'normal' ? <Activity className="w-5 h-5 text-amber-400" /> : <GitCompare className="w-5 h-5 text-violet-400" />}
                </div>
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-foreground">
                  {viewMode === 'normal' ? 'Heatmap de Performance' : 'Comparação de Períodos'}
                </CardTitle>
                <CardDescription className="text-muted-foreground/80">
                  {viewMode === 'normal' ? 'Horários e dias mais lucrativos' : `${getPeriodLabel(comparisonPeriod)} atual vs anterior`}
                </CardDescription>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('normal')}
                  className={`px-3 h-8 rounded-md transition-all ${viewMode === 'normal' ? 'bg-amber-500/20 text-amber-400 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Activity className="w-4 h-4 mr-1.5" />
                  Normal
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode('comparison')}
                  className={`px-3 h-8 rounded-md transition-all ${viewMode === 'comparison' ? 'bg-violet-500/20 text-violet-400 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <GitCompare className="w-4 h-4 mr-1.5" />
                  Comparar
                </Button>
              </div>

              {/* Period selector (only in comparison mode) */}
              <AnimatePresence>
                {viewMode === 'comparison' && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="overflow-hidden"
                  >
                    <Select value={comparisonPeriod} onValueChange={(v: ComparisonPeriod) => setComparisonPeriod(v)}>
                      <SelectTrigger className="w-[140px] h-8 bg-muted/50 border-border/50">
                        <Calendar className="w-3.5 h-3.5 mr-2 text-violet-400" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">Semana</SelectItem>
                        <SelectItem value="month">Mês</SelectItem>
                        <SelectItem value="quarter">Trimestre</SelectItem>
                      </SelectContent>
                    </Select>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stats badges */}
              <div className="hidden lg:flex items-center gap-2">
                {viewMode === 'normal' && bestSlot && (
                  <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                    <Crown className="w-3 h-3 mr-1" />
                    {bestSlot.weekday} {bestSlot.hour}
                  </Badge>
                )}
                {viewMode === 'comparison' && comparisonStats && (
                  <>
                    <Badge variant="outline" className="bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {comparisonStats.improved} melhoraram
                    </Badge>
                    <Badge variant="outline" className="bg-orange-500/10 border-orange-500/30 text-orange-400">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      {comparisonStats.declined} pioraram
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="relative pt-4">
          <TooltipProvider delayDuration={100}>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Header */}
                <div className="flex gap-2 mb-3">
                  <div className="w-14" />
                  {weekdays.map((day, i) => (
                    <motion.div
                      key={day}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex-1 min-w-[72px] text-center"
                    >
                      <span className="text-sm font-semibold text-foreground/80 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/30 inline-block">
                        {day}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Grid */}
                <div className="space-y-2">
                  {hours.map((hour, hourIndex) => (
                    <motion.div 
                      key={hour} 
                      className="flex gap-2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: hourIndex * 0.03 }}
                    >
                      <div className="w-14 text-sm font-medium text-muted-foreground/70 flex items-center justify-end pr-2">
                        {hour}
                      </div>
                      {weekdays.map((day, dayIndex) => renderCell(day, hour, hourIndex, dayIndex))}
                    </motion.div>
                  ))}
                </div>

                {/* Legend */}
                <motion.div 
                  className="mt-8 flex flex-wrap items-center justify-center gap-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  {viewMode === 'normal' ? (
                    <>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                        <div className="flex gap-1">
                          <div className="w-3 h-3 rounded bg-rose-500/30" />
                          <div className="w-3 h-3 rounded bg-rose-500/60" />
                          <div className="w-3 h-3 rounded bg-rose-500/90" />
                        </div>
                        <span className="text-xs font-medium text-rose-400">Prejuízo</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/30">
                        <div className="w-4 h-4 rounded bg-muted/50 border border-border/50" />
                        <span className="text-xs font-medium text-muted-foreground">Sem dados</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex gap-1">
                          <div className="w-3 h-3 rounded bg-emerald-500/30" />
                          <div className="w-3 h-3 rounded bg-emerald-500/60" />
                          <div className="w-3 h-3 rounded bg-emerald-500/90" />
                        </div>
                        <span className="text-xs font-medium text-emerald-400">Lucro</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                        <ArrowDown className="w-4 h-4 text-orange-400" />
                        <span className="text-xs font-medium text-orange-400">Piorou</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/30">
                        <Minus className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Sem mudança</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                        <ArrowUp className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-medium text-cyan-400">Melhorou</span>
                      </div>
                    </>
                  )}
                </motion.div>

                {/* Comparison Summary */}
                <AnimatePresence>
                  {viewMode === 'comparison' && comparisonStats && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 overflow-hidden"
                    >
                      <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 via-transparent to-violet-500/10 border border-violet-500/20">
                        <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="text-muted-foreground text-xs mb-1">Variação Total</p>
                            <p className={`text-xl font-bold ${comparisonStats.totalChange > 0 ? 'text-cyan-400' : comparisonStats.totalChange < 0 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                              {comparisonStats.totalChange > 0 ? '+' : ''}{formatCurrency(comparisonStats.totalChange)}
                            </p>
                          </div>
                          <div className="h-10 w-px bg-border/50 hidden md:block" />
                          <div className="text-center">
                            <p className="text-muted-foreground text-xs mb-1">Horários Melhores</p>
                            <p className="text-xl font-bold text-cyan-400">{comparisonStats.improved}</p>
                          </div>
                          <div className="h-10 w-px bg-border/50 hidden md:block" />
                          <div className="text-center">
                            <p className="text-muted-foreground text-xs mb-1">Horários Piores</p>
                            <p className="text-xl font-bold text-orange-400">{comparisonStats.declined}</p>
                          </div>
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
