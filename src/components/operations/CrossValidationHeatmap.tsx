import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Check, X, AlertTriangle, Sun, Moon, Zap, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
}

interface CrossValidationHeatmapProps {
  operations: Operation[];
}

type Signal = "LIGAR" | "ALERTA" | "NAO_LIGAR" | "SEM_DADOS";
type HeatmapTheme = "dark" | "light";

interface MonthData {
  monthKey: string;
  trades: number;
  result: number;
  winrate: number;
  maxDrawdown: number;
  recovery: number;
}

interface SlotData {
  weekday: string;
  weekdayFull: string;
  hour: string;
  dayIndex: number;
  hourIndex: number;
  signal: Signal;
  totalTrades: number;
  totalMonths: number;
  positiveMonths: number;
  negativeMonths: number;
  pctPositive: number;
  medianRecovery: number;
  avgDrawdown: number;
  avgMonthlyResult: number;
  p10Result: number;
  months: MonthData[];
}

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const WEEKDAYS_FULL = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];
const HOURS = Array.from({ length: 9 }, (_, i) => `${i + 9}h`);

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(p * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function classifySlot(totalTrades: number, totalMonths: number, pctPositive: number, medRec: number, avgDd: number): Signal {
  if (totalMonths < 3 || totalTrades < 5) return "SEM_DADOS";
  if (pctPositive >= 60 && medRec > 1) return "LIGAR";
  if (pctPositive < 40) return "NAO_LIGAR";
  return "ALERTA";
}

const CrossValidationHeatmap = ({ operations }: CrossValidationHeatmapProps) => {
  const [theme, setTheme] = useState<HeatmapTheme>("dark");
  const [selectedSlot, setSelectedSlot] = useState<SlotData | null>(null);
  const isDark = theme === "dark";

  const { slots, summary, currentSlot } = useMemo(() => {
    // Step 1: Group trades by slot (weekday-hour) and month
    const slotMonthMap = new Map<string, Map<string, Operation[]>>();

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const [y, m, d] = op.operation_date.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      const wd = date.getDay();
      if (wd === 0 || wd === 6) continue;

      const hour = parseInt(op.operation_time.split(":")[0]);
      if (hour < 9 || hour > 17) continue;

      const slotKey = `${wd}-${hour}`;
      const monthKey = `${y}-${String(m).padStart(2, "0")}`;

      if (!slotMonthMap.has(slotKey)) slotMonthMap.set(slotKey, new Map());
      const monthMap = slotMonthMap.get(slotKey)!;
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, []);
      monthMap.get(monthKey)!.push(op);
    }

    // Step 2: Calculate metrics per month per slot, then consolidate
    const slotsGrid: SlotData[] = [];
    let ligar = 0, alerta = 0, naoLigar = 0, semDados = 0;

    for (let hourVal = 9; hourVal <= 17; hourVal++) {
      for (let dayVal = 1; dayVal <= 5; dayVal++) {
        const slotKey = `${dayVal}-${hourVal}`;
        const monthMap = slotMonthMap.get(slotKey);

        if (!monthMap || monthMap.size === 0) {
          slotsGrid.push({
            weekday: WEEKDAYS[dayVal - 1], weekdayFull: WEEKDAYS_FULL[dayVal - 1],
            hour: `${hourVal}h`, dayIndex: dayVal, hourIndex: hourVal,
            signal: "SEM_DADOS", totalTrades: 0, totalMonths: 0,
            positiveMonths: 0, negativeMonths: 0, pctPositive: 0,
            medianRecovery: 0, avgDrawdown: 0, avgMonthlyResult: 0, p10Result: 0, months: [],
          });
          semDados++;
          continue;
        }

        const monthsData: MonthData[] = [];
        let totalTrades = 0;

        const sortedMonthKeys = [...monthMap.keys()].sort();
        for (const mk of sortedMonthKeys) {
          const trades = monthMap.get(mk)!;
          // Sort trades chronologically within month
          trades.sort((a, b) => {
            const cmp = a.operation_date.localeCompare(b.operation_date);
            return cmp !== 0 ? cmp : a.operation_time.localeCompare(b.operation_time);
          });

          let result = 0;
          let wins = 0;
          let accumulated = 0;
          let peak = 0;
          let maxDd = 0;

          for (const t of trades) {
            result += t.result;
            accumulated += t.result;
            if (t.result > 0) wins++;
            if (accumulated > peak) peak = accumulated;
            const dd = peak - accumulated;
            if (dd > maxDd) maxDd = dd;
          }

          const winrate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
          const recovery = result > 0 && maxDd > 0 ? result / maxDd : 0;

          monthsData.push({
            monthKey: mk, trades: trades.length, result,
            winrate: Number(winrate.toFixed(1)), maxDrawdown: Number(maxDd.toFixed(2)),
            recovery: Number(recovery.toFixed(2)),
          });
          totalTrades += trades.length;
        }

        const totalMonths = monthsData.length;
        const positiveMonths = monthsData.filter(m => m.result > 0).length;
        const negativeMonths = totalMonths - positiveMonths;
        const pctPositive = totalMonths > 0 ? (positiveMonths / totalMonths) * 100 : 0;
        const medRec = median(monthsData.map(m => m.recovery));
        const avgDd = totalMonths > 0 ? monthsData.reduce((s, m) => s + m.maxDrawdown, 0) / totalMonths : 0;
        const avgResult = totalMonths > 0 ? monthsData.reduce((s, m) => s + m.result, 0) / totalMonths : 0;
        const p10 = percentile(monthsData.map(m => m.result), 0.1);

        const signal = classifySlot(totalTrades, totalMonths, pctPositive, medRec, avgDd);

        if (signal === "LIGAR") ligar++;
        else if (signal === "ALERTA") alerta++;
        else if (signal === "NAO_LIGAR") naoLigar++;
        else semDados++;

        slotsGrid.push({
          weekday: WEEKDAYS[dayVal - 1], weekdayFull: WEEKDAYS_FULL[dayVal - 1],
          hour: `${hourVal}h`, dayIndex: dayVal, hourIndex: hourVal,
          signal, totalTrades, totalMonths, positiveMonths, negativeMonths,
          pctPositive: Number(pctPositive.toFixed(1)), medianRecovery: Number(medRec.toFixed(2)),
          avgDrawdown: Number(avgDd.toFixed(2)), avgMonthlyResult: Number(avgResult.toFixed(2)),
          p10Result: Number(p10.toFixed(2)), months: monthsData,
        });
      }
    }

    const totalWithData = ligar + alerta + naoLigar;
    const score = totalWithData > 0 ? Math.round((ligar / totalWithData) * 100) : 0;

    // Current slot for "Can I turn on the bot?" card
    const now = new Date();
    const currentWd = now.getDay();
    const currentHour = now.getHours();
    let currentSlot: SlotData | null = null;
    if (currentWd >= 1 && currentWd <= 5 && currentHour >= 9 && currentHour <= 17) {
      currentSlot = slotsGrid.find(s => s.dayIndex === currentWd && s.hourIndex === currentHour) || null;
    }

    return { slots: slotsGrid, summary: { ligar, alerta, naoLigar, semDados, score }, currentSlot };
  }, [operations]);

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getCellStyle = (signal: Signal) => {
    switch (signal) {
      case "LIGAR": return isDark ? "bg-emerald-500/80 border-emerald-400/50 text-white" : "bg-emerald-500 border-emerald-400 text-white";
      case "ALERTA": return isDark ? "bg-amber-500/70 border-amber-400/40 text-white" : "bg-amber-400 border-amber-300 text-white";
      case "NAO_LIGAR": return isDark ? "bg-rose-500/80 border-rose-400/50 text-white" : "bg-rose-500 border-rose-400 text-white";
      default: return isDark ? "bg-slate-800/40 border-slate-700/30 text-slate-600" : "bg-slate-100 border-slate-200 text-slate-400";
    }
  };

  const getSignalIcon = (signal: Signal) => {
    switch (signal) {
      case "LIGAR": return <Check className="w-4 h-4" />;
      case "ALERTA": return <AlertTriangle className="w-3.5 h-3.5" />;
      case "NAO_LIGAR": return <X className="w-4 h-4" />;
      default: return <span className="text-[10px]">—</span>;
    }
  };

  const getSignalLabel = (signal: Signal) => {
    switch (signal) {
      case "LIGAR": return "LIGAR";
      case "ALERTA": return "ALERTA";
      case "NAO_LIGAR": return "NÃO LIGAR";
      default: return "SEM DADOS";
    }
  };

  const getSignalBadgeClass = (signal: Signal) => {
    switch (signal) {
      case "LIGAR": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "ALERTA": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "NAO_LIGAR": return "bg-rose-500/20 text-rose-400 border-rose-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getRecommendationText = (slot: SlotData | null) => {
    if (!slot) return { icon: <Clock className="w-8 h-8" />, text: "Mercado fechado", sub: "Fora do horário de operação (9h-17h, Seg-Sex)", color: "text-slate-400" };
    switch (slot.signal) {
      case "LIGAR": return { icon: <Check className="w-8 h-8" />, text: "Horário favorável", sub: `${slot.pctPositive}% dos meses positivos · Recovery ${slot.medianRecovery}`, color: "text-emerald-400" };
      case "ALERTA": return { icon: <AlertTriangle className="w-8 h-8" />, text: "Atenção — risco moderado", sub: `${slot.pctPositive}% dos meses positivos · Recovery ${slot.medianRecovery}`, color: "text-amber-400" };
      case "NAO_LIGAR": return { icon: <X className="w-8 h-8" />, text: "Evitar operar", sub: `Apenas ${slot.pctPositive}% dos meses positivos · DD médio ${formatCurrency(slot.avgDrawdown)}`, color: "text-rose-400" };
      default: return { icon: <AlertTriangle className="w-8 h-8" />, text: "Dados insuficientes", sub: `Apenas ${slot.totalMonths} meses e ${slot.totalTrades} trades`, color: "text-slate-400" };
    }
  };

  const formatMonth = (mk: string) => {
    const [y, m] = mk.split("-");
    const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${names[parseInt(m) - 1]}/${y}`;
  };

  const rec = getRecommendationText(currentSlot);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
      {/* Real-time assistant card */}
      <Card className={`border mb-4 transition-colors duration-300 ${isDark ? "bg-slate-900/80 border-slate-700/50" : "bg-white border-slate-200 shadow-sm"}`}>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
              <Zap className={`w-5 h-5 ${rec.color}`} />
            </div>
            <div className="flex-1">
              <p className={`text-xs font-medium mb-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Posso ligar o robô agora?</p>
              <div className="flex items-center gap-2">
                <span className={rec.color}>{rec.icon}</span>
                <div>
                  <p className={`font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>{rec.text}</p>
                  <p className={`text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>{rec.sub}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main heatmap card */}
      <Card className={`border transition-colors duration-300 ${isDark ? "bg-slate-900/80 border-slate-700/50" : "bg-white border-slate-200 shadow-sm"}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-100 text-emerald-600"}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>Validação Cruzada</CardTitle>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Análise estatística por slot de mercado (dia × hora)</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
              className={`h-9 w-9 p-0 rounded-lg ${isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"}`}>
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-6">
          <TooltipProvider delayDuration={100}>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="flex gap-1.5 mb-3">
                  <div className="w-12" />
                  {WEEKDAYS.map(day => (
                    <div key={day} className="flex-1 min-w-[70px] text-center">
                      <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>{day}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {HOURS.map((hour, hourIndex) => (
                    <div key={hour} className="flex gap-1.5">
                      <div className={`w-12 text-xs font-medium flex items-center justify-end pr-2 ${isDark ? "text-slate-500" : "text-slate-400"}`}>{hour}</div>
                      {WEEKDAYS.map((_, dayIndex) => {
                        const cell = slots[hourIndex * 5 + dayIndex];
                        return (
                          <Tooltip key={`${hour}-${dayIndex}`}>
                            <TooltipTrigger asChild>
                              <motion.div
                                className={`flex-1 min-w-[70px] h-12 rounded-lg border flex items-center justify-center cursor-pointer transition-all ${getCellStyle(cell.signal)}`}
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                onClick={() => cell.totalMonths > 0 && setSelectedSlot(cell)}
                              >
                                {getSignalIcon(cell.signal)}
                              </motion.div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className={`max-w-[280px] p-3 text-xs ${isDark ? "bg-slate-800 border-slate-700 text-slate-200" : ""}`}>
                              <p className="font-semibold mb-1.5">{cell.weekday} {cell.hour} — {getSignalLabel(cell.signal)}</p>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Trades:</span><span>{cell.totalTrades}</span></div>
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Meses analisados:</span><span>{cell.totalMonths}</span></div>
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Meses positivos:</span><span className={cell.pctPositive >= 50 ? "text-emerald-500" : "text-rose-500"}>{cell.pctPositive}%</span></div>
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Recovery mediano:</span><span>{cell.medianRecovery}</span></div>
                              </div>
                              {cell.totalMonths > 0 && <p className={`mt-2 text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>Clique para detalhes</p>}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TooltipProvider>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <div className={`rounded-xl p-3 text-center ${isDark ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-emerald-50 border border-emerald-200"}`}>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Slots para Ligar</p>
              <p className="text-2xl font-bold text-emerald-500">{summary.ligar}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${isDark ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200"}`}>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Slots em Alerta</p>
              <p className="text-2xl font-bold text-amber-500">{summary.alerta}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${isDark ? "bg-rose-500/10 border border-rose-500/20" : "bg-rose-50 border border-rose-200"}`}>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Não Ligar</p>
              <p className="text-2xl font-bold text-rose-500">{summary.naoLigar}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${isDark ? "bg-primary/10 border border-primary/20" : "bg-primary/5 border border-primary/20"}`}>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Score Geral</p>
              <p className={`text-2xl font-bold ${summary.score >= 50 ? "text-emerald-500" : "text-rose-500"}`}>{summary.score}%</p>
            </div>
          </div>

          {/* Legend */}
          <div className={`flex flex-wrap items-center justify-center gap-4 mt-4 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-emerald-500" /><span>Ligar (≥60% meses+, recovery &gt;1)</span></div>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-amber-500" /><span>Alerta (resultados mistos)</span></div>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-rose-500" /><span>Não Ligar (&lt;40% meses+)</span></div>
            <div className="flex items-center gap-1.5"><div className={`h-3 w-3 rounded ${isDark ? "bg-slate-700" : "bg-slate-200"}`} /><span>Sem dados (&lt;3 meses)</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSlot} onOpenChange={(open) => !open && setSelectedSlot(null)}>
        <DialogContent className={`max-w-lg max-h-[85vh] overflow-y-auto ${isDark ? "bg-slate-900 border-slate-700 text-slate-100" : ""}`}>
          {selectedSlot && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span>{selectedSlot.weekdayFull} {selectedSlot.hour}</span>
                  <Badge className={getSignalBadgeClass(selectedSlot.signal)}>{getSignalLabel(selectedSlot.signal)}</Badge>
                </DialogTitle>
              </DialogHeader>

              {/* Consolidated metrics */}
              <div className="grid grid-cols-3 gap-3 mt-2">
                {[
                  { label: "Meses analisados", value: selectedSlot.totalMonths },
                  { label: "Total de trades", value: selectedSlot.totalTrades },
                  { label: "Meses positivos", value: `${selectedSlot.pctPositive}%`, color: selectedSlot.pctPositive >= 50 ? "text-emerald-500" : "text-rose-500" },
                  { label: "Recovery mediano", value: selectedSlot.medianRecovery, color: selectedSlot.medianRecovery >= 1 ? "text-emerald-500" : "text-amber-500" },
                  { label: "Drawdown médio", value: formatCurrency(selectedSlot.avgDrawdown), color: "text-rose-400" },
                  { label: "Resultado médio/mês", value: formatCurrency(selectedSlot.avgMonthlyResult), color: selectedSlot.avgMonthlyResult >= 0 ? "text-emerald-500" : "text-rose-500" },
                ].map((m, i) => (
                  <div key={i} className={`rounded-lg p-2.5 text-center ${isDark ? "bg-slate-800/60" : "bg-slate-50"}`}>
                    <p className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{m.label}</p>
                    <p className={`text-sm font-bold ${m.color || (isDark ? "text-slate-200" : "text-slate-700")}`}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Monthly table */}
              <div className="mt-4">
                <p className={`text-xs font-semibold mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Distribuição por mês</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={isDark ? "text-slate-500" : "text-slate-400"}>
                        <th className="text-left py-1.5 pr-2">Mês</th>
                        <th className="text-right py-1.5 px-1">Trades</th>
                        <th className="text-right py-1.5 px-1">Resultado</th>
                        <th className="text-right py-1.5 px-1">WR%</th>
                        <th className="text-right py-1.5 px-1">DD</th>
                        <th className="text-right py-1.5 pl-1">Rec.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSlot.months.map((m) => (
                        <tr key={m.monthKey} className={`border-t ${isDark ? "border-slate-800" : "border-slate-100"}`}>
                          <td className="py-1.5 pr-2 font-medium">{formatMonth(m.monthKey)}</td>
                          <td className="text-right py-1.5 px-1">{m.trades}</td>
                          <td className={`text-right py-1.5 px-1 font-medium ${m.result >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{formatCurrency(m.result)}</td>
                          <td className="text-right py-1.5 px-1">{m.winrate}%</td>
                          <td className="text-right py-1.5 px-1 text-rose-400">{formatCurrency(m.maxDrawdown)}</td>
                          <td className={`text-right py-1.5 pl-1 ${m.recovery >= 1 ? "text-emerald-500" : "text-amber-500"}`}>{m.recovery}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default CrossValidationHeatmap;
