import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, Flame, Snowflake, Target, Crown, AlertTriangle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface PerformanceHeatmapProps {
  operations: Operation[];
}

const PerformanceHeatmap = ({ operations }: PerformanceHeatmapProps) => {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  useEffect(() => {
    processHeatmapData();
  }, [operations]);

  const processHeatmapData = () => {
    const heatmapMap = new Map<string, { results: number[]; count: number }>();

    operations.forEach((op) => {
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
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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
            weekday: weekdays[day],
            hour: `${hour}h`,
            result: avgResult,
            operations: data.count,
            bestTrade,
            worstTrade,
            totalResult,
          });
        } else {
          heatmapArray.push({
            weekday: weekdays[day],
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

    setHeatmapData(heatmapArray);
  };

  // Calculate best and worst slots
  const { bestSlot, worstSlot, totalOperations } = useMemo(() => {
    if (heatmapData.length === 0) return { bestSlot: null, worstSlot: null, totalOperations: 0 };
    
    const withOps = heatmapData.filter(d => d.operations > 0);
    if (withOps.length === 0) return { bestSlot: null, worstSlot: null, totalOperations: 0 };
    
    const best = withOps.reduce((max, d) => d.totalResult > max.totalResult ? d : max, withOps[0]);
    const worst = withOps.reduce((min, d) => d.totalResult < min.totalResult ? d : min, withOps[0]);
    const total = withOps.reduce((sum, d) => sum + d.operations, 0);
    
    return { bestSlot: best, worstSlot: worst, totalOperations: total };
  }, [heatmapData]);

  const getColorIntensity = (result: number, operations: number) => {
    if (operations === 0) return {
      bg: "bg-muted/30",
      border: "border-border/20",
      text: "text-muted-foreground/30",
      glow: ""
    };
    
    const maxResult = Math.max(...heatmapData.map(d => Math.abs(d.result)));
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

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex"];
  const hours = Array.from({ length: 9 }, (_, i) => `${i + 9}h`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-950/10 shadow-xl hover:shadow-2xl hover:shadow-amber-500/5 transition-all duration-500">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -translate-y-48 translate-x-48" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/3 rounded-full blur-2xl translate-y-32 -translate-x-32" />
        
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-24 h-24 border-l-2 border-t-2 border-amber-500/20 rounded-tl-lg" />
        <div className="absolute bottom-0 right-0 w-24 h-24 border-r-2 border-b-2 border-amber-500/20 rounded-br-lg" />
        
        <CardHeader className="relative pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/20 rounded-xl blur-lg" />
                <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30">
                  <Activity className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  Heatmap de Performance
                </CardTitle>
                <CardDescription className="text-muted-foreground/80">
                  Horários e dias da semana mais lucrativos
                </CardDescription>
              </div>
            </div>
            
            {/* Stats badges */}
            <div className="hidden md:flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 text-xs font-medium text-muted-foreground">
                <Target className="w-3 h-3 inline mr-1.5" />
                {totalOperations} operações
              </div>
              {bestSlot && (
                <div className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-400">
                  <Flame className="w-3 h-3 inline mr-1.5" />
                  Melhor: {bestSlot.weekday} {bestSlot.hour}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="relative pt-4">
          <TooltipProvider delayDuration={100}>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Header com dias da semana */}
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

                {/* Grid do heatmap */}
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
                      {weekdays.map((day, dayIndex) => {
                        const cellData = heatmapData.find(
                          (d) => d.weekday === day && d.hour === hour
                        );
                        const colorStyles = getColorIntensity(
                          cellData?.result || 0,
                          cellData?.operations || 0
                        );
                        const cellKey = `${day}-${hour}`;
                        const isHovered = hoveredCell === cellKey;
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
                                  cursor-pointer 
                                  border
                                  ${colorStyles.bg} 
                                  ${colorStyles.border} 
                                  ${colorStyles.text}
                                  ${colorStyles.glow}
                                  ${isHovered ? 'ring-2 ring-amber-400/50' : ''}
                                  ${isBestSlot ? 'ring-2 ring-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.5)]' : ''}
                                  ${isWorstSlot ? 'ring-2 ring-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.5)]' : ''}
                                `}
                              >
                                {/* Best slot indicator */}
                                {isBestSlot && (
                                  <>
                                    <motion.div
                                      className="absolute -top-2 -right-2 z-20"
                                      initial={{ scale: 0, rotate: -20 }}
                                      animate={{ scale: 1, rotate: 0 }}
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
                                      className="absolute inset-0 rounded-lg border-2 border-amber-400/50"
                                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                    />
                                    {/* Sparkle effects */}
                                    <motion.div
                                      className="absolute -top-1 -left-1"
                                      animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                                      transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                                    >
                                      <Sparkles className="w-3 h-3 text-amber-300" />
                                    </motion.div>
                                    <motion.div
                                      className="absolute -bottom-1 left-1/2"
                                      animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                                      transition={{ duration: 2, repeat: Infinity, delay: 0.8 }}
                                    >
                                      <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                                    </motion.div>
                                  </>
                                )}
                                
                                {/* Worst slot indicator */}
                                {isWorstSlot && (
                                  <>
                                    <motion.div
                                      className="absolute -top-2 -right-2 z-20"
                                      initial={{ scale: 0, rotate: 20 }}
                                      animate={{ scale: 1, rotate: 0 }}
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
                                    <motion.div
                                      className="absolute inset-0 rounded-lg border-2 border-rose-400/50"
                                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                                      transition={{ duration: 1.5, repeat: Infinity }}
                                    />
                                  </>
                                )}

                                {cellData && cellData.operations > 0 && (
                                  <span className="relative z-10">
                                    {cellData.operations}
                                    {isHovered && (
                                      <motion.div
                                        layoutId="cell-indicator"
                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                      />
                                    )}
                                  </span>
                                )}
                              </motion.div>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="top" 
                              sideOffset={8}
                              className="bg-card/95 backdrop-blur-xl border border-border/50 p-0 shadow-2xl rounded-xl overflow-hidden min-w-[220px]"
                            >
                              {/* Tooltip header */}
                              <div className={`px-4 py-3 border-b border-border/30 ${
                                isBestSlot 
                                  ? 'bg-gradient-to-r from-amber-500/20 to-transparent' 
                                  : isWorstSlot 
                                    ? 'bg-gradient-to-r from-rose-500/20 to-transparent'
                                    : 'bg-gradient-to-r from-amber-500/10 to-transparent'
                              }`}>
                                <p className="font-bold text-foreground flex items-center gap-2">
                                  {isBestSlot && <Crown className="w-4 h-4 text-amber-400" />}
                                  {isWorstSlot && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                                  {!isBestSlot && !isWorstSlot && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                                  {day} às {hour}
                                  {isBestSlot && (
                                    <span className="ml-auto text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                                      Melhor horário
                                    </span>
                                  )}
                                  {isWorstSlot && (
                                    <span className="ml-auto text-xs font-medium text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-full">
                                      Evitar
                                    </span>
                                  )}
                                </p>
                              </div>
                              
                              {/* Tooltip content */}
                              <div className="p-4 space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Operações</span>
                                  <span className="font-semibold text-foreground bg-muted/50 px-2 py-0.5 rounded">
                                    {cellData?.operations || 0}
                                  </span>
                                </div>
                                
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Resultado Total</span>
                                  <span className={`font-bold ${
                                    cellData && cellData.totalResult > 0 
                                      ? "text-emerald-400" 
                                      : cellData && cellData.totalResult < 0 
                                        ? "text-rose-400" 
                                        : "text-muted-foreground"
                                  }`}>
                                    {cellData && cellData.totalResult > 0 && (
                                      <TrendingUp className="w-3 h-3 inline mr-1" />
                                    )}
                                    {cellData && cellData.totalResult < 0 && (
                                      <TrendingDown className="w-3 h-3 inline mr-1" />
                                    )}
                                    {formatCurrency(cellData?.totalResult || 0)}
                                  </span>
                                </div>
                                
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Média</span>
                                  <span className={`font-medium ${
                                    cellData && cellData.result > 0 
                                      ? "text-emerald-400" 
                                      : cellData && cellData.result < 0 
                                        ? "text-rose-400" 
                                        : "text-muted-foreground"
                                  }`}>
                                    {formatCurrency(cellData?.result || 0)}
                                  </span>
                                </div>
                                
                                {cellData && cellData.operations > 0 && (
                                  <div className="pt-2 border-t border-border/30 space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-muted-foreground flex items-center gap-1">
                                        <Flame className="w-3 h-3 text-emerald-400" />
                                        Melhor
                                      </span>
                                      <span className="text-emerald-400 font-medium">
                                        {formatCurrency(cellData.bestTrade)}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-muted-foreground flex items-center gap-1">
                                        <Snowflake className="w-3 h-3 text-rose-400" />
                                        Pior
                                      </span>
                                      <span className="text-rose-400 font-medium">
                                        {formatCurrency(cellData.worstTrade)}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </motion.div>
                  ))}
                </div>

                {/* Legenda premium */}
                <motion.div 
                  className="mt-8 flex flex-wrap items-center justify-center gap-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
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
                </motion.div>
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PerformanceHeatmap;
