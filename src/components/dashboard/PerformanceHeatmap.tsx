// Performance Heatmap with export and alerts
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, Flame, Target, Crown, AlertTriangle, GitCompare, Calendar, ArrowUp, ArrowDown, Minus, Download, FileImage, FileText, Bell, BellRing, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

interface PerformanceAlert {
  id: string;
  weekday: string;
  hour: string;
  type: string;
  change: number;
  changePercent: number;
  message: string;
}

interface PerformanceHeatmapProps {
  operations: Operation[];
}

type ViewMode = "normal" | "comparison";
type ComparisonPeriod = "week" | "month" | "quarter";

const ALERT_THRESHOLD = 30;
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const HOURS = Array.from({ length: 9 }, (_, i) => `${i + 9}h`);

const PerformanceHeatmap = ({ operations }: PerformanceHeatmapProps) => {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>("month");
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const heatmapRef = useRef<HTMLDivElement>(null);

  const filterByPeriod = useCallback((ops: Operation[], periodType: "current" | "previous", period: ComparisonPeriod): Operation[] => {
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

  useEffect(() => {
    const newAlerts: PerformanceAlert[] = comparisonData
      .filter(d => (d.operations > 0 || d.previousOperations > 0) && Math.abs(d.changePercent) >= ALERT_THRESHOLD)
      .map(d => ({
        id: `${d.weekday}-${d.hour}`,
        weekday: d.weekday,
        hour: d.hour,
        type: d.changePercent > 0 ? "improvement" : "decline",
        change: d.change,
        changePercent: d.changePercent,
        message: `${d.weekday} às ${d.hour}: ${d.changePercent > 0 ? "Melhoria" : "Queda"} de ${Math.abs(d.changePercent).toFixed(0)}%`,
      }))
      .slice(0, 10);
    setAlerts(newAlerts);
  }, [comparisonData]);

  const { bestSlot, worstSlot, totalOperations } = useMemo(() => {
    const data = viewMode === "normal" ? heatmapData : comparisonData;
    const withOps = data.filter(d => d.operations > 0);
    if (withOps.length === 0) return { bestSlot: null, worstSlot: null, totalOperations: 0 };
    return {
      bestSlot: withOps.reduce((max, d) => d.totalResult > max.totalResult ? d : max, withOps[0]),
      worstSlot: withOps.reduce((min, d) => d.totalResult < min.totalResult ? d : min, withOps[0]),
      totalOperations: withOps.reduce((sum, d) => sum + d.operations, 0),
    };
  }, [heatmapData, comparisonData, viewMode]);

  const comparisonStats = useMemo(() => {
    if (viewMode !== "comparison") return null;
    const improved = comparisonData.filter(d => d.change > 0 && (d.operations > 0 || d.previousOperations > 0)).length;
    const declined = comparisonData.filter(d => d.change < 0 && (d.operations > 0 || d.previousOperations > 0)).length;
    const totalChange = comparisonData.reduce((sum, d) => sum + d.change, 0);
    return { improved, declined, totalChange };
  }, [comparisonData, viewMode]);

  const exportAsPNG = useCallback(async () => {
    if (!heatmapRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(heatmapRef.current, { backgroundColor: "#0a0a0a", scale: 2 });
      const link = document.createElement("a");
      link.download = `heatmap-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Heatmap exportado como PNG!");
    } catch { toast.error("Erro ao exportar PNG"); }
    finally { setIsExporting(false); }
  }, []);

  const exportAsPDF = useCallback(async () => {
    if (!heatmapRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(heatmapRef.current, { backgroundColor: "#0a0a0a", scale: 2 });
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
      pdf.setFillColor(10, 10, 10);
      pdf.rect(0, 0, pdfWidth, pdfHeight, "F");
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 15, canvas.width * ratio * 0.9, canvas.height * ratio * 0.9);
      pdf.save(`heatmap-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Heatmap exportado como PDF!");
    } catch { toast.error("Erro ao exportar PDF"); }
    finally { setIsExporting(false); }
  }, []);

  const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const getPeriodLabel = (p: ComparisonPeriod) => p === "week" ? "Semana" : p === "month" ? "Mês" : "Trimestre";

  const getColorIntensity = (result: number, ops: number) => {
    if (ops === 0) return { bg: "bg-muted/30", border: "border-border/20", text: "text-muted-foreground/30" };
    const maxResult = Math.max(...heatmapData.map(d => Math.abs(d.result)), 1);
    const intensity = Math.abs(result) / maxResult;
    if (result > 0) {
      if (intensity > 0.7) return { bg: "bg-emerald-500/90", border: "border-emerald-400/50", text: "text-white font-semibold" };
      if (intensity > 0.4) return { bg: "bg-emerald-500/60", border: "border-emerald-400/30", text: "text-white" };
      return { bg: "bg-emerald-500/30", border: "border-emerald-400/20", text: "text-emerald-200" };
    }
    if (intensity > 0.7) return { bg: "bg-rose-500/90", border: "border-rose-400/50", text: "text-white font-semibold" };
    if (intensity > 0.4) return { bg: "bg-rose-500/60", border: "border-rose-400/30", text: "text-white" };
    return { bg: "bg-rose-500/30", border: "border-rose-400/20", text: "text-rose-200" };
  };

  const getComparisonColor = (change: number, hasData: boolean) => {
    if (!hasData) return { bg: "bg-muted/30", border: "border-border/20", text: "text-muted-foreground/30" };
    const maxChange = Math.max(...comparisonData.map(d => Math.abs(d.change)), 1);
    const intensity = Math.abs(change) / maxChange;
    if (change > 0) return intensity > 0.5 ? { bg: "bg-cyan-500/80", border: "border-cyan-400/50", text: "text-white font-semibold" } : { bg: "bg-cyan-500/40", border: "border-cyan-400/30", text: "text-cyan-200" };
    if (change < 0) return intensity > 0.5 ? { bg: "bg-orange-500/80", border: "border-orange-400/50", text: "text-white font-semibold" } : { bg: "bg-orange-500/40", border: "border-orange-400/30", text: "text-orange-200" };
    return { bg: "bg-muted/50", border: "border-border/30", text: "text-muted-foreground" };
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className={`relative overflow-hidden shadow-xl ${viewMode === "normal" ? "border-amber-500/20 bg-gradient-to-br from-card to-amber-950/10" : "border-violet-500/20 bg-gradient-to-br from-card to-violet-950/10"}`}>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <CardHeader className="relative pb-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${viewMode === "normal" ? "bg-amber-500/20 border-amber-500/30" : "bg-violet-500/20 border-violet-500/30"}`}>
                {viewMode === "normal" ? <Activity className="w-5 h-5 text-amber-400" /> : <GitCompare className="w-5 h-5 text-violet-400" />}
              </div>
              <div>
                <CardTitle className="text-lg font-bold">{viewMode === "normal" ? "Heatmap de Performance" : "Comparação de Períodos"}</CardTitle>
                <CardDescription>{viewMode === "normal" ? "Horários e dias mais lucrativos" : `${getPeriodLabel(comparisonPeriod)} atual vs anterior`}</CardDescription>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/50">
                <Button variant="ghost" size="sm" onClick={() => setViewMode("normal")} className={`px-3 h-8 ${viewMode === "normal" ? "bg-amber-500/20 text-amber-400" : "text-muted-foreground"}`}>
                  <Activity className="w-4 h-4 mr-1.5" />Normal
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setViewMode("comparison")} className={`px-3 h-8 ${viewMode === "comparison" ? "bg-violet-500/20 text-violet-400" : "text-muted-foreground"}`}>
                  <GitCompare className="w-4 h-4 mr-1.5" />Comparar
                </Button>
              </div>

              {viewMode === "comparison" && (
                <Select value={comparisonPeriod} onValueChange={(v) => setComparisonPeriod(v as ComparisonPeriod)}>
                  <SelectTrigger className="w-[130px] h-8 bg-muted/50"><Calendar className="w-3.5 h-3.5 mr-2 text-violet-400" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Semana</SelectItem>
                    <SelectItem value="month">Mês</SelectItem>
                    <SelectItem value="quarter">Trimestre</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Popover open={showAlerts} onOpenChange={setShowAlerts}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={`h-8 relative ${alerts.length > 0 ? "border-amber-500/50 text-amber-400" : ""}`}>
                    {alerts.length > 0 ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    {alerts.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[10px] font-bold text-amber-950 flex items-center justify-center">{alerts.length}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-3 border-b border-border/50 bg-amber-500/10"><h4 className="font-semibold flex items-center gap-2"><BellRing className="w-4 h-4 text-amber-400" />Alertas ({ALERT_THRESHOLD}%+)</h4></div>
                  <div className="max-h-[250px] overflow-y-auto">
                    {alerts.length === 0 ? <div className="p-4 text-center text-muted-foreground text-sm">Nenhum alerta</div> : (
                      <div className="divide-y divide-border/30">
                        {alerts.map(a => (
                          <div key={a.id} className="p-3 flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${a.type === "improvement" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                              {a.type === "improvement" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            </div>
                            <div className="flex-1"><p className="text-sm">{a.message}</p><p className={`text-xs ${a.change > 0 ? "text-emerald-400" : "text-rose-400"}`}>{formatCurrency(a.change)}</p></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8" disabled={isExporting}>
                    <Download className="w-4 h-4" /><ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportAsPNG}><FileImage className="w-4 h-4 mr-2 text-emerald-400" />PNG</DropdownMenuItem>
                  <DropdownMenuItem onClick={exportAsPDF}><FileText className="w-4 h-4 mr-2 text-rose-400" />PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {viewMode === "normal" && bestSlot && <Badge variant="outline" className="hidden lg:flex bg-emerald-500/10 border-emerald-500/30 text-emerald-400"><Crown className="w-3 h-3 mr-1" />{bestSlot.weekday} {bestSlot.hour}</Badge>}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="relative pt-4" ref={heatmapRef}>
          <TooltipProvider delayDuration={100}>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="flex gap-2 mb-3">
                  <div className="w-14" />
                  {WEEKDAYS.map(day => <div key={day} className="flex-1 min-w-[72px] text-center"><span className="text-sm font-semibold text-foreground/80 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/30 inline-block">{day}</span></div>)}
                </div>

                <div className="space-y-2">
                  {HOURS.map((hour, hi) => (
                    <div key={hour} className="flex gap-2">
                      <div className="w-14 text-sm font-medium text-muted-foreground/70 flex items-center justify-end pr-2">{hour}</div>
                      {WEEKDAYS.map((day, di) => {
                        const cellKey = `${day}-${hour}`;
                        const isHovered = hoveredCell === cellKey;
                        
                        if (viewMode === "normal") {
                          const cellData = heatmapData.find(d => d.weekday === day && d.hour === hour);
                          const colors = getColorIntensity(cellData?.result || 0, cellData?.operations || 0);
                          const isBest = bestSlot?.weekday === day && bestSlot?.hour === hour;
                          const isWorst = worstSlot?.weekday === day && worstSlot?.hour === hour && (worstSlot?.totalResult || 0) < 0;

                          return (
                            <Tooltip key={cellKey}>
                              <TooltipTrigger asChild>
                                <div
                                  onMouseEnter={() => setHoveredCell(cellKey)}
                                  onMouseLeave={() => setHoveredCell(null)}
                                  className={`relative flex-1 min-w-[72px] h-14 rounded-lg flex items-center justify-center text-sm font-medium cursor-pointer border transition-transform hover:scale-105 ${colors.bg} ${colors.border} ${colors.text} ${isBest ? "ring-2 ring-amber-400" : ""} ${isWorst ? "ring-2 ring-rose-400" : ""}`}
                                >
                                  {isBest && <div className="absolute -top-2 -right-2 bg-amber-400 rounded-full p-1"><Crown className="w-3 h-3 text-amber-900" /></div>}
                                  {isWorst && <div className="absolute -top-2 -right-2 bg-rose-500 rounded-full p-1"><AlertTriangle className="w-3 h-3 text-white" /></div>}
                                  {(cellData?.operations || 0) > 0 && <span>{cellData?.operations}</span>}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-card/95 backdrop-blur border p-3 rounded-xl min-w-[180px]">
                                <p className="font-bold mb-2">{day} às {hour}</p>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between"><span className="text-muted-foreground">Ops</span><span>{cellData?.operations || 0}</span></div>
                                  <div className="flex justify-between"><span className="text-muted-foreground">Resultado</span><span className={(cellData?.totalResult || 0) > 0 ? "text-emerald-400" : (cellData?.totalResult || 0) < 0 ? "text-rose-400" : ""}>{formatCurrency(cellData?.totalResult || 0)}</span></div>
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
                                <div
                                  onMouseEnter={() => setHoveredCell(cellKey)}
                                  onMouseLeave={() => setHoveredCell(null)}
                                  className={`flex-1 min-w-[72px] h-14 rounded-lg flex flex-col items-center justify-center text-xs font-medium cursor-pointer border transition-transform hover:scale-105 ${colors.bg} ${colors.border} ${colors.text}`}
                                >
                                  {hasData && cellData && (
                                    <>
                                      <div className="flex items-center gap-1">
                                        {cellData.change > 0 ? <ArrowUp className="w-3 h-3" /> : cellData.change < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                        <span className="text-[10px]">{cellData.changePercent > 0 ? "+" : ""}{cellData.changePercent.toFixed(0)}%</span>
                                      </div>
                                      <span className="text-[10px] opacity-70">{cellData.operations} ops</span>
                                    </>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-card/95 backdrop-blur border p-3 rounded-xl min-w-[220px]">
                                <p className="font-bold mb-2 flex items-center gap-2"><GitCompare className="w-4 h-4 text-violet-400" />{day} às {hour}</p>
                                <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                                  <div><p className="text-xs text-muted-foreground">Atual</p><p className="font-bold">{formatCurrency(cellData?.totalResult || 0)}</p></div>
                                  <div><p className="text-xs text-muted-foreground">Anterior</p><p className="font-bold">{formatCurrency(cellData?.previousTotalResult || 0)}</p></div>
                                </div>
                                <div className="pt-2 border-t border-border/30 flex justify-between">
                                  <span className="text-muted-foreground">Variação</span>
                                  <span className={`font-bold ${(cellData?.change || 0) > 0 ? "text-cyan-400" : (cellData?.change || 0) < 0 ? "text-orange-400" : ""}`}>{formatCurrency(cellData?.change || 0)}</span>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        }
                      })}
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                  {viewMode === "normal" ? (
                    <>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20"><div className="w-4 h-4 rounded bg-rose-500/70" /><span className="text-xs text-rose-400">Prejuízo</span></div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/30"><div className="w-4 h-4 rounded bg-muted/50" /><span className="text-xs text-muted-foreground">Sem dados</span></div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20"><div className="w-4 h-4 rounded bg-emerald-500/70" /><span className="text-xs text-emerald-400">Lucro</span></div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20"><ArrowDown className="w-4 h-4 text-orange-400" /><span className="text-xs text-orange-400">Piorou</span></div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/30"><Minus className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Sem mudança</span></div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20"><ArrowUp className="w-4 h-4 text-cyan-400" /><span className="text-xs text-cyan-400">Melhorou</span></div>
                    </>
                  )}
                </div>

                {viewMode === "comparison" && comparisonStats && (
                  <div className="mt-6 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                      <div className="text-center"><p className="text-xs text-muted-foreground mb-1">Variação Total</p><p className={`text-xl font-bold ${comparisonStats.totalChange > 0 ? "text-cyan-400" : comparisonStats.totalChange < 0 ? "text-orange-400" : ""}`}>{comparisonStats.totalChange > 0 ? "+" : ""}{formatCurrency(comparisonStats.totalChange)}</p></div>
                      <div className="h-10 w-px bg-border/50 hidden md:block" />
                      <div className="text-center"><p className="text-xs text-muted-foreground mb-1">Melhoraram</p><p className="text-xl font-bold text-cyan-400">{comparisonStats.improved}</p></div>
                      <div className="h-10 w-px bg-border/50 hidden md:block" />
                      <div className="text-center"><p className="text-xs text-muted-foreground mb-1">Pioraram</p><p className="text-xl font-bold text-orange-400">{comparisonStats.declined}</p></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PerformanceHeatmap;
