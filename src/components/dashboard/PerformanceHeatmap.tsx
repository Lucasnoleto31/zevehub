// Performance Heatmap - Ultra Premium Design
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Crown, AlertTriangle, GitCompare, Calendar, ArrowUp, ArrowDown, Minus, Sparkles, Flame, TrendingUp, TrendingDown, Sun, Moon, Zap, Target } from "lucide-react";
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
}

type ViewMode = "normal" | "comparison";
type ComparisonPeriod = "all" | "week" | "month" | "quarter";
type HeatmapTheme = "dark" | "light";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const HOURS = Array.from({ length: 9 }, (_, i) => `${i + 9}h`);

// Floating particles component
const FloatingParticles = ({ count = 20, color = "amber" }: { count?: number; color?: string }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        className={`absolute w-1 h-1 rounded-full ${color === "amber" ? "bg-amber-400/40" : "bg-violet-400/40"}`}
        initial={{
          x: Math.random() * 100 + "%",
          y: Math.random() * 100 + "%",
          scale: Math.random() * 0.5 + 0.5,
          opacity: 0
        }}
        animate={{
          y: [null, "-20%", "120%"],
          opacity: [0, 0.8, 0],
          scale: [0.5, 1, 0.5]
        }}
        transition={{
          duration: Math.random() * 10 + 15,
          repeat: Infinity,
          delay: Math.random() * 5,
          ease: "linear"
        }}
      />
    ))}
  </div>
);

// Animated border component
const AnimatedBorder = ({ color = "amber" }: { color?: string }) => (
  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
    <motion.div
      className={`absolute inset-0 rounded-2xl`}
      style={{
        background: `conic-gradient(from 0deg, transparent, ${color === "amber" ? "rgb(251 191 36 / 0.5)" : "rgb(167 139 250 / 0.5)"}, transparent, ${color === "amber" ? "rgb(251 191 36 / 0.3)" : "rgb(167 139 250 / 0.3)"}, transparent)`,
        padding: "2px"
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
    />
  </div>
);

const PerformanceHeatmap = ({ operations }: PerformanceHeatmapProps) => {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>("all");
  const [theme, setTheme] = useState<HeatmapTheme>("dark");
  const [pulseIndex, setPulseIndex] = useState(0);

  // Animate pulse through cells
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseIndex(prev => (prev + 1) % 45);
    }, 200);
    return () => clearInterval(interval);
  }, []);

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

  const getColorIntensity = (result: number, ops: number, cellIndex: number) => {
    const isPulsing = cellIndex === pulseIndex;
    const baseGlow = isPulsing ? "animate-pulse" : "";
    
    if (ops === 0) return {
      bg: theme === "dark" ? "bg-slate-800/30" : "bg-slate-100/50",
      border: theme === "dark" ? "border-slate-700/20" : "border-slate-200/50",
      text: theme === "dark" ? "text-slate-600" : "text-slate-400",
      glow: baseGlow,
      inner: ""
    };
    
    const maxResult = Math.max(...heatmapData.map(d => Math.abs(d.result)), 1);
    const intensity = Math.abs(result) / maxResult;
    
    if (result > 0) {
      if (intensity > 0.7) return {
        bg: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600",
        border: "border-emerald-300/80",
        text: "text-white font-black",
        glow: `shadow-[0_0_30px_rgba(16,185,129,0.6),inset_0_0_20px_rgba(255,255,255,0.1)] ${baseGlow}`,
        inner: "before:absolute before:inset-0 before:bg-gradient-to-t before:from-transparent before:to-white/20 before:rounded-xl"
      };
      if (intensity > 0.4) return {
        bg: "bg-gradient-to-br from-emerald-400/80 to-emerald-600/80",
        border: "border-emerald-400/50",
        text: "text-white font-bold",
        glow: `shadow-[0_0_20px_rgba(16,185,129,0.4)] ${baseGlow}`,
        inner: ""
      };
      return {
        bg: theme === "dark" ? "bg-emerald-500/25" : "bg-emerald-100",
        border: theme === "dark" ? "border-emerald-400/30" : "border-emerald-300",
        text: theme === "dark" ? "text-emerald-300" : "text-emerald-700",
        glow: baseGlow,
        inner: ""
      };
    }
    
    if (intensity > 0.7) return {
      bg: "bg-gradient-to-br from-rose-400 via-rose-500 to-pink-600",
      border: "border-rose-300/80",
      text: "text-white font-black",
      glow: `shadow-[0_0_30px_rgba(244,63,94,0.6),inset_0_0_20px_rgba(255,255,255,0.1)] ${baseGlow}`,
      inner: "before:absolute before:inset-0 before:bg-gradient-to-t before:from-transparent before:to-white/20 before:rounded-xl"
    };
    if (intensity > 0.4) return {
      bg: "bg-gradient-to-br from-rose-400/80 to-rose-600/80",
      border: "border-rose-400/50",
      text: "text-white font-bold",
      glow: `shadow-[0_0_20px_rgba(244,63,94,0.4)] ${baseGlow}`,
      inner: ""
    };
    return {
      bg: theme === "dark" ? "bg-rose-500/25" : "bg-rose-100",
      border: theme === "dark" ? "border-rose-400/30" : "border-rose-300",
      text: theme === "dark" ? "text-rose-300" : "text-rose-700",
      glow: baseGlow,
      inner: ""
    };
  };

  const getComparisonColor = (change: number, hasData: boolean) => {
    if (!hasData) return {
      bg: theme === "dark" ? "bg-slate-800/30" : "bg-slate-100/50",
      border: theme === "dark" ? "border-slate-700/20" : "border-slate-200/50",
      text: theme === "dark" ? "text-slate-600" : "text-slate-400",
      glow: ""
    };
    
    const maxChange = Math.max(...comparisonData.map(d => Math.abs(d.change)), 1);
    const intensity = Math.abs(change) / maxChange;
    
    if (change > 0) {
      return intensity > 0.5 ? {
        bg: "bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600",
        border: "border-cyan-300/80",
        text: "text-white font-black",
        glow: "shadow-[0_0_30px_rgba(6,182,212,0.6),inset_0_0_20px_rgba(255,255,255,0.1)]"
      } : {
        bg: theme === "dark" ? "bg-cyan-500/30" : "bg-cyan-100",
        border: theme === "dark" ? "border-cyan-400/40" : "border-cyan-300",
        text: theme === "dark" ? "text-cyan-300" : "text-cyan-700",
        glow: ""
      };
    }
    if (change < 0) {
      return intensity > 0.5 ? {
        bg: "bg-gradient-to-br from-orange-400 via-orange-500 to-red-600",
        border: "border-orange-300/80",
        text: "text-white font-black",
        glow: "shadow-[0_0_30px_rgba(249,115,22,0.6),inset_0_0_20px_rgba(255,255,255,0.1)]"
      } : {
        bg: theme === "dark" ? "bg-orange-500/30" : "bg-orange-100",
        border: theme === "dark" ? "border-orange-400/40" : "border-orange-300",
        text: theme === "dark" ? "text-orange-300" : "text-orange-700",
        glow: ""
      };
    }
    return {
      bg: theme === "dark" ? "bg-slate-800/30" : "bg-slate-100/50",
      border: theme === "dark" ? "border-slate-700/20" : "border-slate-200/50",
      text: theme === "dark" ? "text-slate-500" : "text-slate-400",
      glow: ""
    };
  };

  const cellVariants = {
    initial: { scale: 0, opacity: 0, rotateX: -30 },
    animate: (i: number) => ({
      scale: 1,
      opacity: 1,
      rotateX: 0,
      transition: { 
        delay: i * 0.02, 
        duration: 0.4, 
        type: "spring" as const,
        stiffness: 200,
        damping: 15
      }
    }),
    hover: { 
      scale: 1.12, 
      zIndex: 20,
      rotateY: 5,
      transition: { duration: 0.2 }
    }
  };

  const cardColor = viewMode === "normal" ? "amber" : "violet";
  const isDark = theme === "dark";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 40, scale: 0.95 }} 
      animate={{ opacity: 1, y: 0, scale: 1 }} 
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      key={`${theme}-${viewMode}`}
      className="perspective-1000"
    >
      <Card className={`relative overflow-hidden border-2 backdrop-blur-xl transition-all duration-700 ${
        isDark 
          ? viewMode === "normal" 
            ? "border-amber-500/40 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-amber-950/30" 
            : "border-violet-500/40 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-violet-950/30"
          : viewMode === "normal"
            ? "border-amber-300/60 bg-gradient-to-br from-amber-50/95 via-white/90 to-orange-50/80"
            : "border-violet-300/60 bg-gradient-to-br from-violet-50/95 via-white/90 to-purple-50/80"
      }`}>
        {/* Animated rotating border */}
        <AnimatedBorder color={cardColor} />
        
        {/* Floating particles */}
        <FloatingParticles count={15} color={cardColor} />
        
        {/* Animated gradient orbs */}
        <motion.div 
          className={`absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl ${
            viewMode === "normal" 
              ? isDark ? "bg-amber-500/20" : "bg-amber-300/30"
              : isDark ? "bg-violet-500/20" : "bg-violet-300/30"
          }`}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.35, 0.2],
            x: [0, 30, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className={`absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl ${
            viewMode === "normal" 
              ? isDark ? "bg-emerald-500/15" : "bg-emerald-300/25"
              : isDark ? "bg-cyan-500/15" : "bg-cyan-300/25"
          }`}
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.3, 0.15]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        
        {/* Grid pattern overlay */}
        <div className={`absolute inset-0 ${
          isDark 
            ? "bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)]"
            : "bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)]"
        } bg-[size:24px_24px]`} />
        
        <CardHeader className="relative pb-4 z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Header with icon */}
            <motion.div 
              className="flex items-center gap-4"
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <motion.div 
                className={`relative p-4 rounded-2xl border-2 overflow-hidden ${
                  viewMode === "normal" 
                    ? "bg-gradient-to-br from-amber-500/40 to-orange-600/30 border-amber-400/50" 
                    : "bg-gradient-to-br from-violet-500/40 to-purple-600/30 border-violet-400/50"
                }`}
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <motion.div 
                  className={`absolute inset-0 ${viewMode === "normal" ? "bg-amber-400" : "bg-violet-400"}`}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                {viewMode === "normal" 
                  ? <Activity className="w-7 h-7 text-amber-300 relative z-10 drop-shadow-lg" /> 
                  : <GitCompare className="w-7 h-7 text-violet-300 relative z-10 drop-shadow-lg" />
                }
              </motion.div>
              <div>
                <CardTitle className={`text-2xl font-black flex items-center gap-2 ${isDark ? "text-white" : "text-slate-800"}`}>
                  {viewMode === "normal" ? "Heatmap de Performance" : "Comparação de Períodos"}
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    <Sparkles className={`w-5 h-5 ${viewMode === "normal" ? "text-amber-400" : "text-violet-400"}`} />
                  </motion.div>
                </CardTitle>
                <CardDescription className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {viewMode === "normal" ? "Descubra seus horários mais lucrativos" : `${getPeriodLabel(comparisonPeriod)} atual vs anterior`}
                </CardDescription>
              </div>
            </motion.div>
            
            {/* Controls */}
            <motion.div 
              className="flex flex-wrap items-center gap-3"
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              {/* Theme Toggle */}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className={`h-10 px-4 rounded-xl border-2 transition-all duration-500 ${
                    isDark 
                      ? "bg-slate-800/60 border-slate-600/50 hover:border-violet-500/50 hover:bg-slate-700/60" 
                      : "bg-white/80 border-slate-200 hover:border-amber-400/50 hover:bg-amber-50/50 shadow-sm"
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {theme === "dark" ? (
                      <motion.div
                        key="dark"
                        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                        animate={{ rotate: 0, opacity: 1, scale: 1 }}
                        exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.3, type: "spring" }}
                        className="flex items-center gap-2"
                      >
                        <Moon className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-bold text-slate-300">Escuro</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="light"
                        initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                        animate={{ rotate: 0, opacity: 1, scale: 1 }}
                        exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.3, type: "spring" }}
                        className="flex items-center gap-2"
                      >
                        <Sun className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-slate-600">Claro</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>

              {/* View Mode Toggle */}
              <div className={`flex items-center rounded-xl p-1.5 border-2 backdrop-blur-sm ${
                isDark ? "bg-slate-800/50 border-slate-600/40" : "bg-white/70 border-slate-200 shadow-sm"
              }`}>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setViewMode("normal")} 
                    className={`px-4 h-9 rounded-lg transition-all duration-300 ${
                      viewMode === "normal" 
                        ? "bg-gradient-to-r from-amber-500/40 to-orange-500/30 text-amber-500 shadow-lg shadow-amber-500/25 border border-amber-400/30" 
                        : `${isDark ? "text-slate-400 hover:text-amber-400" : "text-slate-500 hover:text-amber-600"}`
                    }`}
                  >
                    <Zap className="w-4 h-4 mr-2" />Normal
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setViewMode("comparison")} 
                    className={`px-4 h-9 rounded-lg transition-all duration-300 ${
                      viewMode === "comparison" 
                        ? "bg-gradient-to-r from-violet-500/40 to-purple-500/30 text-violet-500 shadow-lg shadow-violet-500/25 border border-violet-400/30" 
                        : `${isDark ? "text-slate-400 hover:text-violet-400" : "text-slate-500 hover:text-violet-600"}`
                    }`}
                  >
                    <Target className="w-4 h-4 mr-2" />Comparar
                  </Button>
                </motion.div>
              </div>

              <AnimatePresence>
                {viewMode === "comparison" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: -20 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Select value={comparisonPeriod} onValueChange={(v) => setComparisonPeriod(v as ComparisonPeriod)}>
                      <SelectTrigger className={`w-[160px] h-10 rounded-xl border-2 ${
                        isDark 
                          ? "bg-slate-800/60 border-violet-500/30 text-slate-200" 
                          : "bg-white/80 border-violet-300 text-slate-700 shadow-sm"
                      }`}>
                        <Calendar className="w-4 h-4 mr-2 text-violet-400" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={isDark ? "bg-slate-800 border-slate-700" : ""}>
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
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, type: "spring" }}
                >
                  <Badge className={`hidden lg:flex px-4 py-2 rounded-xl border-2 font-bold ${
                    isDark 
                      ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border-emerald-400/40 text-emerald-400" 
                      : "bg-gradient-to-r from-emerald-100 to-teal-50 border-emerald-300 text-emerald-700 shadow-sm"
                  }`}>
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                    >
                      <Crown className="w-4 h-4 mr-2 text-amber-500" />
                    </motion.div>
                    Melhor: {bestSlot.weekday} {bestSlot.hour}
                  </Badge>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Quick Stats Bar */}
          <motion.div 
            className={`flex flex-wrap gap-3 mt-5 pt-5 border-t ${isDark ? "border-slate-700/40" : "border-slate-200/60"}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {[
              { icon: Activity, label: "Operações", value: totalOps.toString(), color: viewMode === "normal" ? "amber" : "violet" },
              { icon: totalResult >= 0 ? TrendingUp : TrendingDown, label: "Resultado", value: formatCurrency(totalResult), color: totalResult >= 0 ? "emerald" : "rose" },
              ...(bestSlot ? [{ icon: Flame, label: "Melhor slot", value: formatCurrency(bestSlot.totalResult), color: "amber" }] : [])
            ].map((stat, i) => (
              <motion.div 
                key={stat.label}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 backdrop-blur-sm ${
                  isDark 
                    ? `bg-slate-800/40 border-${stat.color}-500/30` 
                    : `bg-white/60 border-${stat.color}-300/50 shadow-sm`
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                whileHover={{ scale: 1.03, y: -2 }}
              >
                <div className={`p-1.5 rounded-lg ${
                  stat.color === "emerald" ? "bg-emerald-500/20" :
                  stat.color === "rose" ? "bg-rose-500/20" :
                  stat.color === "amber" ? "bg-amber-500/20" :
                  "bg-violet-500/20"
                }`}>
                  <stat.icon className={`w-4 h-4 ${
                    stat.color === "emerald" ? "text-emerald-500" :
                    stat.color === "rose" ? "text-rose-500" :
                    stat.color === "amber" ? "text-amber-500" :
                    "text-violet-500"
                  }`} />
                </div>
                <div>
                  <span className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>{stat.label}</span>
                  <p className={`text-sm font-black ${
                    stat.color === "emerald" ? "text-emerald-500" :
                    stat.color === "rose" ? "text-rose-500" :
                    stat.color === "amber" ? (isDark ? "text-amber-400" : "text-amber-600") :
                    "text-violet-500"
                  }`}>{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </CardHeader>
        
        <CardContent className="relative pt-2 pb-8 z-10">
          <TooltipProvider delayDuration={50}>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Weekday Headers */}
                <motion.div 
                  className="flex gap-2 mb-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="w-16" />
                  {WEEKDAYS.map((day, i) => (
                    <motion.div 
                      key={day} 
                      className="flex-1 min-w-[85px] text-center"
                      initial={{ opacity: 0, y: -20, rotateX: -45 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{ delay: 0.4 + i * 0.08, type: "spring", stiffness: 200 }}
                    >
                      <motion.span 
                        className={`text-sm font-black px-5 py-2.5 rounded-xl border-2 inline-block backdrop-blur-sm ${
                          isDark 
                            ? "bg-slate-800/60 border-slate-600/40 text-slate-200 shadow-lg shadow-black/20" 
                            : "bg-white/80 border-slate-200 text-slate-700 shadow-md"
                        }`}
                        whileHover={{ scale: 1.05, y: -2 }}
                      >
                        {day}
                      </motion.span>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Heatmap Grid */}
                <div className="space-y-2.5">
                  {HOURS.map((hour, hourIndex) => (
                    <div key={hour} className="flex gap-2">
                      <motion.div 
                        className={`w-16 text-sm font-black flex items-center justify-end pr-3 ${isDark ? "text-slate-400" : "text-slate-500"}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + hourIndex * 0.04 }}
                      >
                        {hour}
                      </motion.div>
                      {WEEKDAYS.map((day, dayIndex) => {
                        const cellKey = `${day}-${hour}`;
                        const cellIndex = hourIndex * 5 + dayIndex;
                        
                        if (viewMode === "normal") {
                          const cellData = heatmapData.find(d => d.weekday === day && d.hour === hour);
                          const colors = getColorIntensity(cellData?.result || 0, cellData?.operations || 0, cellIndex);
                          const isBest = bestSlot?.weekday === day && bestSlot?.hour === hour;
                          const isWorst = worstSlot?.weekday === day && worstSlot?.hour === hour && (worstSlot?.totalResult || 0) < 0;
                          const isHovered = hoveredCell === cellKey;

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
                                  className={`relative flex-1 min-w-[85px] h-[70px] rounded-xl flex items-center justify-center text-sm cursor-pointer border-2 transition-all duration-300 overflow-hidden ${colors.bg} ${colors.border} ${colors.text} ${colors.glow} ${colors.inner} ${
                                    isBest ? `ring-2 ring-amber-400/80 ring-offset-2 ${isDark ? "ring-offset-slate-900" : "ring-offset-white"}` : ""
                                  } ${
                                    isWorst ? `ring-2 ring-rose-400/80 ring-offset-2 ${isDark ? "ring-offset-slate-900" : "ring-offset-white"}` : ""
                                  }`}
                                  style={{
                                    transformStyle: "preserve-3d"
                                  }}
                                >
                                  {/* Inner glow effect on hover */}
                                  <AnimatePresence>
                                    {isHovered && (cellData?.operations || 0) > 0 && (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1.5 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className={`absolute inset-0 rounded-xl ${
                                          (cellData?.result || 0) >= 0 
                                            ? "bg-gradient-radial from-emerald-400/30 to-transparent" 
                                            : "bg-gradient-radial from-rose-400/30 to-transparent"
                                        }`}
                                      />
                                    )}
                                  </AnimatePresence>
                                  
                                  {isBest && (
                                    <motion.div 
                                      className="absolute -top-2 -right-2 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-full p-2 shadow-xl shadow-amber-500/50 border-2 border-amber-300/50"
                                      initial={{ scale: 0, rotate: -180 }}
                                      animate={{ scale: 1, rotate: 0 }}
                                      transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                                    >
                                      <Crown className="w-3.5 h-3.5 text-amber-900" />
                                    </motion.div>
                                  )}
                                  {isWorst && (
                                    <motion.div 
                                      className="absolute -top-2 -right-2 bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 rounded-full p-2 shadow-xl shadow-rose-500/50 border-2 border-rose-300/50"
                                      initial={{ scale: 0, rotate: 180 }}
                                      animate={{ scale: 1, rotate: 0 }}
                                      transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5 text-white" />
                                    </motion.div>
                                  )}
                                  {(cellData?.operations || 0) > 0 && (
                                    <motion.span 
                                      className="text-xl relative z-10 drop-shadow-lg"
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      transition={{ delay: cellIndex * 0.02 + 0.3, type: "spring" }}
                                    >
                                      {cellData?.operations}
                                    </motion.span>
                                  )}
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent 
                                side="top" 
                                className={`backdrop-blur-2xl border-2 p-5 rounded-2xl shadow-2xl min-w-[220px] ${
                                  isDark 
                                    ? "bg-slate-800/95 border-slate-600/50" 
                                    : "bg-white/95 border-slate-200 shadow-xl"
                                }`}
                              >
                                <div className="flex items-center gap-3 mb-4">
                                  <div className={`p-2 rounded-xl ${(cellData?.totalResult || 0) >= 0 ? "bg-emerald-500/20" : "bg-rose-500/20"}`}>
                                    <Activity className={`w-5 h-5 ${(cellData?.totalResult || 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`} />
                                  </div>
                                  <p className={`font-black text-lg ${isDark ? "text-white" : "text-slate-800"}`}>{day} às {hour}</p>
                                </div>
                                <div className="space-y-3">
                                  <div className={`flex justify-between items-center p-2 rounded-lg ${isDark ? "bg-slate-700/30" : "bg-slate-100"}`}>
                                    <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Operações</span>
                                    <span className={`font-black text-lg ${isDark ? "text-white" : "text-slate-800"}`}>{cellData?.operations || 0}</span>
                                  </div>
                                  <div className={`grid grid-cols-2 gap-2`}>
                                    <div className={`flex flex-col items-center p-2 rounded-lg ${isDark ? "bg-emerald-500/10" : "bg-emerald-50"}`}>
                                      <span className={`text-xs ${isDark ? "text-emerald-400/70" : "text-emerald-600/70"}`}>Ganhos</span>
                                      <span className={`font-black text-lg text-emerald-500`}>{cellData?.wins || 0}</span>
                                    </div>
                                    <div className={`flex flex-col items-center p-2 rounded-lg ${isDark ? "bg-rose-500/10" : "bg-rose-50"}`}>
                                      <span className={`text-xs ${isDark ? "text-rose-400/70" : "text-rose-600/70"}`}>Perdas</span>
                                      <span className={`font-black text-lg text-rose-500`}>{cellData?.losses || 0}</span>
                                    </div>
                                  </div>
                                  <div className={`flex justify-between items-center p-2 rounded-lg ${isDark ? "bg-slate-700/30" : "bg-slate-100"}`}>
                                    <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Resultado</span>
                                    <span className={`font-black text-lg ${(cellData?.totalResult || 0) > 0 ? "text-emerald-500" : (cellData?.totalResult || 0) < 0 ? "text-rose-500" : isDark ? "text-slate-400" : "text-slate-500"}`}>
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
                                  className={`flex-1 min-w-[85px] h-[70px] rounded-xl flex flex-col items-center justify-center cursor-pointer border-2 transition-all duration-300 ${colors.bg} ${colors.border} ${colors.text} ${colors.glow}`}
                                >
                                  {hasData && cellData && (
                                    <>
                                      <div className="flex items-center gap-1">
                                        {cellData.change > 0 ? <ArrowUp className="w-4 h-4" /> : cellData.change < 0 ? <ArrowDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                                        <span className="text-sm font-black">{cellData.changePercent > 0 ? "+" : ""}{cellData.changePercent.toFixed(0)}%</span>
                                      </div>
                                      <span className="text-[11px] opacity-70 mt-1 font-medium">{cellData.operations} ops</span>
                                    </>
                                  )}
                                </motion.div>
                              </TooltipTrigger>
                              <TooltipContent 
                                side="top" 
                                className={`backdrop-blur-2xl border-2 p-5 rounded-2xl shadow-2xl min-w-[260px] ${
                                  isDark ? "bg-slate-800/95 border-slate-600/50" : "bg-white/95 border-slate-200 shadow-xl"
                                }`}
                              >
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="p-2 rounded-xl bg-violet-500/20">
                                    <GitCompare className="w-5 h-5 text-violet-500" />
                                  </div>
                                  <p className={`font-black text-lg ${isDark ? "text-white" : "text-slate-800"}`}>{day} às {hour}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                  <div className={`p-3 rounded-xl ${isDark ? "bg-slate-700/40" : "bg-slate-100"}`}>
                                    <p className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? "text-slate-500" : "text-slate-400"}`}>Atual</p>
                                    <p className={`font-black text-lg ${isDark ? "text-white" : "text-slate-800"}`}>{formatCurrency(cellData?.totalResult || 0)}</p>
                                  </div>
                                  <div className={`p-3 rounded-xl ${isDark ? "bg-slate-700/40" : "bg-slate-100"}`}>
                                    <p className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? "text-slate-500" : "text-slate-400"}`}>Anterior</p>
                                    <p className={`font-black text-lg ${isDark ? "text-white" : "text-slate-800"}`}>{formatCurrency(cellData?.previousTotalResult || 0)}</p>
                                  </div>
                                </div>
                                <div className={`pt-4 border-t flex justify-between items-center ${isDark ? "border-slate-700/50" : "border-slate-200"}`}>
                                  <span className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Variação</span>
                                  <span className={`font-black text-lg ${(cellData?.change || 0) > 0 ? "text-cyan-500" : (cellData?.change || 0) < 0 ? "text-orange-500" : isDark ? "text-slate-400" : "text-slate-500"}`}>
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
                  className="mt-10 flex flex-wrap items-center justify-center gap-4"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  {viewMode === "normal" ? (
                    <>
                      <motion.div 
                        className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 backdrop-blur-sm ${
                          isDark ? "bg-rose-500/10 border-rose-500/30" : "bg-rose-50 border-rose-200 shadow-sm"
                        }`}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg shadow-rose-500/30" />
                        <span className="text-sm font-bold text-rose-500">Prejuízo</span>
                      </motion.div>
                      <motion.div 
                        className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 backdrop-blur-sm ${
                          isDark ? "bg-slate-700/30 border-slate-600/30" : "bg-slate-100 border-slate-200 shadow-sm"
                        }`}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className={`w-6 h-6 rounded-lg ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
                        <span className={`text-sm font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Sem dados</span>
                      </motion.div>
                      <motion.div 
                        className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 backdrop-blur-sm ${
                          isDark ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200 shadow-sm"
                        }`}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30" />
                        <span className="text-sm font-bold text-emerald-500">Lucro</span>
                      </motion.div>
                    </>
                  ) : (
                    <>
                      <motion.div 
                        className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 ${
                          isDark ? "bg-orange-500/10 border-orange-500/30" : "bg-orange-50 border-orange-200 shadow-sm"
                        }`}
                        whileHover={{ scale: 1.05 }}
                      >
                        <ArrowDown className="w-5 h-5 text-orange-500" />
                        <span className="text-sm font-bold text-orange-500">Piorou</span>
                      </motion.div>
                      <motion.div 
                        className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 ${
                          isDark ? "bg-slate-700/30 border-slate-600/30" : "bg-slate-100 border-slate-200 shadow-sm"
                        }`}
                        whileHover={{ scale: 1.05 }}
                      >
                        <Minus className={`w-5 h-5 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
                        <span className={`text-sm font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Sem mudança</span>
                      </motion.div>
                      <motion.div 
                        className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 ${
                          isDark ? "bg-cyan-500/10 border-cyan-500/30" : "bg-cyan-50 border-cyan-200 shadow-sm"
                        }`}
                        whileHover={{ scale: 1.05 }}
                      >
                        <ArrowUp className="w-5 h-5 text-cyan-500" />
                        <span className="text-sm font-bold text-cyan-500">Melhorou</span>
                      </motion.div>
                    </>
                  )}
                </motion.div>

                {/* Comparison Stats */}
                <AnimatePresence>
                  {viewMode === "comparison" && comparisonStats && (
                    <motion.div 
                      className={`mt-8 p-6 rounded-2xl border-2 backdrop-blur-xl ${
                        isDark 
                          ? "bg-gradient-to-r from-violet-500/10 via-slate-800/50 to-violet-500/10 border-violet-500/30" 
                          : "bg-gradient-to-r from-violet-100/50 via-white to-violet-100/50 border-violet-200 shadow-lg"
                      }`}
                      initial={{ opacity: 0, y: 30, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 30, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 200 }}
                    >
                      <div className="flex flex-wrap justify-center gap-8">
                        <motion.div 
                          className="text-center"
                          whileHover={{ scale: 1.05 }}
                        >
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <TrendingUp className="w-5 h-5 text-cyan-500" />
                            <span className={`text-sm font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Melhoraram</span>
                          </div>
                          <p className="text-3xl font-black text-cyan-500">{comparisonStats.improved}</p>
                        </motion.div>
                        <motion.div 
                          className="text-center"
                          whileHover={{ scale: 1.05 }}
                        >
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <TrendingDown className="w-5 h-5 text-orange-500" />
                            <span className={`text-sm font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Pioraram</span>
                          </div>
                          <p className="text-3xl font-black text-orange-500">{comparisonStats.declined}</p>
                        </motion.div>
                        <motion.div 
                          className="text-center"
                          whileHover={{ scale: 1.05 }}
                        >
                          <div className="flex items-center justify-center gap-2 mb-2">
                            {comparisonStats.totalChange >= 0 ? <ArrowUp className="w-5 h-5 text-emerald-500" /> : <ArrowDown className="w-5 h-5 text-rose-500" />}
                            <span className={`text-sm font-bold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Variação Total</span>
                          </div>
                          <p className={`text-3xl font-black ${comparisonStats.totalChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                            {comparisonStats.totalChange >= 0 ? "+" : ""}{formatCurrency(comparisonStats.totalChange)}
                          </p>
                        </motion.div>
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
