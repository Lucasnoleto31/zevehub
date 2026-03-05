import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Check, X, AlertTriangle, Sun, Moon, Zap, Clock, TrendingUp, TrendingDown, Target, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
  strategy?: string;
}

interface CrossValidationHeatmapProps {
  operations: Operation[];
}

type DecisionBand = "RECOMENDADO" | "CAUTELA" | "NEUTRO" | "EVITAR";
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
  // Consolidated stats
  totalTrades: number;
  totalMonths: number;
  positiveMonths: number;
  negativeMonths: number;
  consistencia: number;
  recoveryMediano: number;
  recoveryPessP25: number;
  drawdownMediano: number;
  drawdownPessP75: number;
  retornoMedioMensal: number;
  retornoPessP25: number;
  // Subscores
  subscoreConsistencia: number;
  subscoreRecovery: number;
  subscoreRisco: number;
  subscoreRetorno: number;
  scoreSlot: number;
  fatorConfianca: number;
  scoreFinal: number;
  faixaDecisao: DecisionBand;
  loteRecomendadoPct: number;
  // Monthly breakdown
  months: MonthData[];
}

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const WEEKDAYS_FULL = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"];
const HOURS = Array.from({ length: 9 }, (_, i) => `${i + 9}h`);
const DD_FLOOR = 1.0;

// --- Utility functions ---

function medianCalc(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentileCalc(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// --- Score mapping functions ---

function mapRecoveryScore(recoveryPessP25: number): number {
  if (recoveryPessP25 <= 0) return 0;
  if (recoveryPessP25 < 0.5) return 35;
  if (recoveryPessP25 < 1.0) return 60;
  if (recoveryPessP25 < 1.5) return 80;
  return 95;
}

function mapRiskScore(drawdownPessP75: number, robotDdMediano: number): number {
  if (robotDdMediano <= 0) return 55;
  const ratio = drawdownPessP75 / robotDdMediano;
  if (ratio >= 2.0) return 10;
  if (ratio >= 1.5) return 30;
  if (ratio >= 1.0) return 55;
  if (ratio >= 0.7) return 75;
  return 92;
}

function mapReturnScore(retornoPessP25: number): number {
  if (retornoPessP25 <= 0) return 10;
  if (retornoPessP25 < 200) return 45;
  if (retornoPessP25 < 600) return 70;
  return 90;
}

function computeConfidence(meses: number, trades: number): number {
  if (meses < 3 || trades < 30) return 0.2;
  if (meses < 6 || trades < 100) return 0.5;
  return 0.85;
}

function classifyBand(score: number): DecisionBand {
  if (score >= 70) return "RECOMENDADO";
  if (score >= 60) return "CAUTELA";
  if (score >= 50) return "NEUTRO";
  return "EVITAR";
}

function bandLotePct(band: DecisionBand): number {
  switch (band) {
    case "RECOMENDADO": return 100;
    case "CAUTELA": return 60;
    case "NEUTRO": return 35;
    case "EVITAR": return 0;
  }
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

    // Step 2: Compute per-month metrics for each slot
    interface SlotMonthMetric {
      slotKey: string;
      monthKey: string;
      trades: number;
      result: number;
      winrate: number;
      maxDrawdown: number;
      recovery: number;
    }

    const allSlotMonthMetrics: SlotMonthMetric[] = [];
    const slotMonthMetricsBySlot = new Map<string, SlotMonthMetric[]>();

    for (const [slotKey, monthMap] of slotMonthMap) {
      const metrics: SlotMonthMetric[] = [];
      for (const [mk, trades] of monthMap) {
        trades.sort((a, b) => {
          const cmp = a.operation_date.localeCompare(b.operation_date);
          return cmp !== 0 ? cmp : a.operation_time.localeCompare(b.operation_time);
        });

        let result = 0, wins = 0, accumulated = 0, peak = 0, maxDd = 0;
        for (const t of trades) {
          result += t.result;
          accumulated += t.result;
          if (t.result > 0) wins++;
          if (accumulated > peak) peak = accumulated;
          const dd = peak - accumulated;
          if (dd > maxDd) maxDd = dd;
        }

        const winrate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
        const recovery = result / Math.max(maxDd, DD_FLOOR);

        const m: SlotMonthMetric = {
          slotKey, monthKey: mk, trades: trades.length,
          result: Number(result.toFixed(2)),
          winrate: Number(winrate.toFixed(1)),
          maxDrawdown: Number(maxDd.toFixed(2)),
          recovery: Number(recovery.toFixed(2)),
        };
        metrics.push(m);
        allSlotMonthMetrics.push(m);
      }
      slotMonthMetricsBySlot.set(slotKey, metrics);
    }

    // Step 3: Compute robot-level baseline (global median drawdown)
    const allDrawdowns = allSlotMonthMetrics.map(m => m.maxDrawdown);
    const robotDdMedianoGlobal = medianCalc(allDrawdowns);

    // Step 4: Consolidate each slot and compute scores
    const slotsGrid: SlotData[] = [];
    let recomendado = 0, cautela = 0, neutro = 0, evitar = 0;

    for (let hourVal = 9; hourVal <= 17; hourVal++) {
      for (let dayVal = 1; dayVal <= 5; dayVal++) {
        const slotKey = `${dayVal}-${hourVal}`;
        const metrics = slotMonthMetricsBySlot.get(slotKey);

        if (!metrics || metrics.length === 0) {
          slotsGrid.push(makeEmptySlot(dayVal, hourVal));
          evitar++;
          continue;
        }

        const totalTrades = metrics.reduce((s, m) => s + m.trades, 0);
        const totalMonths = metrics.length;
        const positiveMonths = metrics.filter(m => m.result > 0).length;
        const consistencia = totalMonths > 0 ? positiveMonths / totalMonths : 0;

        const recoveries = metrics.map(m => m.recovery);
        const drawdowns = metrics.map(m => m.maxDrawdown);
        const results = metrics.map(m => m.result);

        const recoveryMediano = medianCalc(recoveries);
        const recoveryPessP25 = percentileCalc(recoveries, 25);
        const drawdownMediano = medianCalc(drawdowns);
        const drawdownPessP75 = percentileCalc(drawdowns, 75);
        const retornoMedioMensal = totalMonths > 0 ? results.reduce((a, b) => a + b, 0) / totalMonths : 0;
        const retornoPessP25 = percentileCalc(results, 25);

        // Subscores
        const subscoreConsistencia = clamp(consistencia * 100, 0, 100);
        const subscoreRecovery = mapRecoveryScore(recoveryPessP25);
        const subscoreRisco = mapRiskScore(drawdownPessP75, robotDdMedianoGlobal);
        const subscoreRetorno = mapReturnScore(retornoPessP25);

        // Weighted score
        const scoreSlot = 0.35 * subscoreRecovery + 0.30 * subscoreConsistencia + 0.20 * subscoreRisco + 0.15 * subscoreRetorno;

        // Confidence factor
        const fatorConfianca = computeConfidence(totalMonths, totalTrades);
        const scoreFinal = Number(((fatorConfianca * scoreSlot) + ((1 - fatorConfianca) * 50)).toFixed(1));

        // Decision band
        const faixaDecisao = classifyBand(scoreFinal);
        const loteRecomendadoPct = bandLotePct(faixaDecisao);

        if (faixaDecisao === "RECOMENDADO") recomendado++;
        else if (faixaDecisao === "CAUTELA") cautela++;
        else if (faixaDecisao === "NEUTRO") neutro++;
        else evitar++;

        const monthsData: MonthData[] = metrics.sort((a, b) => a.monthKey.localeCompare(b.monthKey)).map(m => ({
          monthKey: m.monthKey, trades: m.trades, result: m.result,
          winrate: m.winrate, maxDrawdown: m.maxDrawdown, recovery: m.recovery,
        }));

        slotsGrid.push({
          weekday: WEEKDAYS[dayVal - 1], weekdayFull: WEEKDAYS_FULL[dayVal - 1],
          hour: `${hourVal}h`, dayIndex: dayVal, hourIndex: hourVal,
          totalTrades, totalMonths, positiveMonths, negativeMonths: totalMonths - positiveMonths,
          consistencia: Number((consistencia * 100).toFixed(1)),
          recoveryMediano: Number(recoveryMediano.toFixed(2)),
          recoveryPessP25: Number(recoveryPessP25.toFixed(2)),
          drawdownMediano: Number(drawdownMediano.toFixed(2)),
          drawdownPessP75: Number(drawdownPessP75.toFixed(2)),
          retornoMedioMensal: Number(retornoMedioMensal.toFixed(2)),
          retornoPessP25: Number(retornoPessP25.toFixed(2)),
          subscoreConsistencia: Number(subscoreConsistencia.toFixed(1)),
          subscoreRecovery, subscoreRisco, subscoreRetorno,
          scoreSlot: Number(scoreSlot.toFixed(1)),
          fatorConfianca, scoreFinal, faixaDecisao, loteRecomendadoPct,
          months: monthsData,
        });
      }
    }

    const total = recomendado + cautela + neutro + evitar;
    const avgScore = total > 0 ? Math.round(slotsGrid.reduce((s, sl) => s + sl.scoreFinal, 0) / total) : 0;

    // Current slot
    const now = new Date();
    const currentWd = now.getDay();
    const currentHour = now.getHours();
    let currentSlot: SlotData | null = null;
    if (currentWd >= 1 && currentWd <= 5 && currentHour >= 9 && currentHour <= 17) {
      currentSlot = slotsGrid.find(s => s.dayIndex === currentWd && s.hourIndex === currentHour) || null;
    }

    return { slots: slotsGrid, summary: { recomendado, cautela, neutro, evitar, avgScore }, currentSlot };
  }, [operations]);

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function makeEmptySlot(dayVal: number, hourVal: number): SlotData {
    return {
      weekday: WEEKDAYS[dayVal - 1], weekdayFull: WEEKDAYS_FULL[dayVal - 1],
      hour: `${hourVal}h`, dayIndex: dayVal, hourIndex: hourVal,
      totalTrades: 0, totalMonths: 0, positiveMonths: 0, negativeMonths: 0,
      consistencia: 0, recoveryMediano: 0, recoveryPessP25: 0,
      drawdownMediano: 0, drawdownPessP75: 0, retornoMedioMensal: 0, retornoPessP25: 0,
      subscoreConsistencia: 0, subscoreRecovery: 0, subscoreRisco: 0, subscoreRetorno: 0,
      scoreSlot: 0, fatorConfianca: 0, scoreFinal: 50, faixaDecisao: "EVITAR", loteRecomendadoPct: 0,
      months: [],
    };
  }

  const getScoreColor = (score: number): string => {
    if (score >= 70) return "text-emerald-500";
    if (score >= 60) return "text-amber-500";
    if (score >= 50) return "text-orange-400";
    return "text-rose-500";
  };

  const getCellBg = (score: number, band: DecisionBand): string => {
    switch (band) {
      case "RECOMENDADO": return isDark ? "bg-emerald-500/80 border-emerald-400/50" : "bg-emerald-500 border-emerald-400";
      case "CAUTELA": return isDark ? "bg-amber-500/70 border-amber-400/40" : "bg-amber-400 border-amber-300";
      case "NEUTRO": return isDark ? "bg-orange-500/50 border-orange-400/30" : "bg-orange-300 border-orange-200";
      case "EVITAR": return isDark ? "bg-rose-500/80 border-rose-400/50" : "bg-rose-500 border-rose-400";
    }
  };

  const getCellStyle = (slot: SlotData) => {
    if (slot.totalMonths === 0) return isDark ? "bg-slate-800/40 border-slate-700/30 text-slate-600" : "bg-slate-100 border-slate-200 text-slate-400";
    return `${getCellBg(slot.scoreFinal, slot.faixaDecisao)} text-white`;
  };

  const getBandLabel = (band: DecisionBand) => {
    switch (band) {
      case "RECOMENDADO": return "RECOMENDADO";
      case "CAUTELA": return "CAUTELA";
      case "NEUTRO": return "NEUTRO";
      case "EVITAR": return "EVITAR";
    }
  };

  const getBandBadgeClass = (band: DecisionBand) => {
    switch (band) {
      case "RECOMENDADO": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "CAUTELA": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "NEUTRO": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "EVITAR": return "bg-rose-500/20 text-rose-400 border-rose-500/30";
    }
  };

  const getBandIcon = (band: DecisionBand) => {
    switch (band) {
      case "RECOMENDADO": return <Check className="w-4 h-4" />;
      case "CAUTELA": return <AlertTriangle className="w-3.5 h-3.5" />;
      case "NEUTRO": return <span className="text-[10px] font-bold">~</span>;
      case "EVITAR": return <X className="w-4 h-4" />;
    }
  };

  const getRecommendationCard = (slot: SlotData | null) => {
    if (!slot) return { icon: <Clock className="w-8 h-8" />, text: "Mercado fechado", sub: "Fora do horário de operação (9h–17h, Seg–Sex)", color: "text-slate-400", score: null as number | null, band: null as DecisionBand | null, lote: null as number | null };
    return {
      icon: getBandIcon(slot.faixaDecisao),
      text: getBandLabel(slot.faixaDecisao),
      sub: `Score ${slot.scoreFinal} · Lote ${slot.loteRecomendadoPct}% · Confiança ${(slot.fatorConfianca * 100).toFixed(0)}%`,
      color: getScoreColor(slot.scoreFinal),
      score: slot.scoreFinal,
      band: slot.faixaDecisao,
      lote: slot.loteRecomendadoPct,
    };
  };

  const formatMonth = (mk: string) => {
    const [y, m] = mk.split("-");
    const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${names[parseInt(m) - 1]}/${y}`;
  };

  const rec = getRecommendationCard(currentSlot);

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
              {rec.score !== null && (
                <div className="mt-2 flex items-center gap-3">
                  <Progress value={rec.score} className="h-2 flex-1" />
                  <span className={`text-sm font-bold ${rec.color}`}>{rec.score}</span>
                </div>
              )}
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
                <CardTitle className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>Validação Cruzada — Score por Horário</CardTitle>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>Score 0–100 por slot (dia × hora) com penalidade por amostra</p>
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
                                className={`flex-1 min-w-[70px] h-14 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all ${getCellStyle(cell)}`}
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                onClick={() => cell.totalMonths > 0 && setSelectedSlot(cell)}
                              >
                                {cell.totalMonths > 0 ? (
                                  <>
                                    <span className="text-xs font-bold leading-none">{cell.scoreFinal}</span>
                                    <span className="text-[9px] opacity-80 leading-none mt-0.5">{cell.loteRecomendadoPct}%</span>
                                  </>
                                ) : (
                                  <span className="text-[10px]">—</span>
                                )}
                              </motion.div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className={`max-w-[300px] p-3 text-xs ${isDark ? "bg-slate-800 border-slate-700 text-slate-200" : ""}`}>
                              <p className="font-semibold mb-1.5">{cell.weekday} {cell.hour} — {getBandLabel(cell.faixaDecisao)}</p>
                              <div className="space-y-1">
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Score Final:</span><span className={`font-bold ${getScoreColor(cell.scoreFinal)}`}>{cell.scoreFinal}</span></div>
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Lote recomendado:</span><span>{cell.loteRecomendadoPct}%</span></div>
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Trades:</span><span>{cell.totalTrades}</span></div>
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Meses:</span><span>{cell.totalMonths}</span></div>
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Confiança:</span><span>{(cell.fatorConfianca * 100).toFixed(0)}%</span></div>
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Recovery P25:</span><span>{cell.recoveryPessP25}</span></div>
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">DD P75:</span><span>{formatCurrency(cell.drawdownPessP75)}</span></div>
                                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Retorno P25:</span><span className={cell.retornoPessP25 >= 0 ? "text-emerald-500" : "text-rose-500"}>{formatCurrency(cell.retornoPessP25)}</span></div>
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
            <div className={`rounded-xl p-3 text-center ${isDark ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-emerald-50 border border-emerald-200"}`}>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Recomendado</p>
              <p className="text-2xl font-bold text-emerald-500">{summary.recomendado}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${isDark ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200"}`}>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Cautela</p>
              <p className="text-2xl font-bold text-amber-500">{summary.cautela}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${isDark ? "bg-orange-500/10 border border-orange-500/20" : "bg-orange-50 border border-orange-200"}`}>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Neutro</p>
              <p className="text-2xl font-bold text-orange-400">{summary.neutro}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${isDark ? "bg-rose-500/10 border border-rose-500/20" : "bg-rose-50 border border-rose-200"}`}>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Evitar</p>
              <p className="text-2xl font-bold text-rose-500">{summary.evitar}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${isDark ? "bg-primary/10 border border-primary/20" : "bg-primary/5 border border-primary/20"}`}>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Score Médio</p>
              <p className={`text-2xl font-bold ${getScoreColor(summary.avgScore)}`}>{summary.avgScore}</p>
            </div>
          </div>

          {/* Legend */}
          <div className={`flex flex-wrap items-center justify-center gap-4 mt-4 text-xs ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-emerald-500" /><span>Recomendado (≥70)</span></div>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-amber-500" /><span>Cautela (60–69)</span></div>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-orange-400" /><span>Neutro (50–59)</span></div>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded bg-rose-500" /><span>Evitar (&lt;50)</span></div>
            <div className="flex items-center gap-1.5"><div className={`h-3 w-3 rounded ${isDark ? "bg-slate-700" : "bg-slate-200"}`} /><span>Sem dados</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSlot} onOpenChange={(open) => !open && setSelectedSlot(null)}>
        <DialogContent className={`max-w-xl max-h-[85vh] overflow-y-auto ${isDark ? "bg-slate-900 border-slate-700 text-slate-100" : ""}`}>
          {selectedSlot && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span>{selectedSlot.weekdayFull} {selectedSlot.hour}</span>
                  <Badge className={getBandBadgeClass(selectedSlot.faixaDecisao)}>{getBandLabel(selectedSlot.faixaDecisao)}</Badge>
                  <span className={`text-lg font-bold ${getScoreColor(selectedSlot.scoreFinal)}`}>{selectedSlot.scoreFinal}</span>
                </DialogTitle>
              </DialogHeader>

              {/* Score breakdown */}
              <div className="mt-2">
                <p className={`text-xs font-semibold mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Composição do Score</p>
                <div className="space-y-2">
                  {[
                    { label: "Recovery (35%)", value: selectedSlot.subscoreRecovery, icon: <TrendingUp className="w-3.5 h-3.5" /> },
                    { label: "Consistência (30%)", value: selectedSlot.subscoreConsistencia, icon: <Target className="w-3.5 h-3.5" /> },
                    { label: "Risco (20%)", value: selectedSlot.subscoreRisco, icon: <Shield className="w-3.5 h-3.5" /> },
                    { label: "Retorno (15%)", value: selectedSlot.subscoreRetorno, icon: <TrendingDown className="w-3.5 h-3.5" /> },
                  ].map((sub, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={isDark ? "text-slate-500" : "text-slate-400"}>{sub.icon}</span>
                      <span className={`text-xs w-32 ${isDark ? "text-slate-400" : "text-slate-500"}`}>{sub.label}</span>
                      <Progress value={sub.value} className="h-2 flex-1" />
                      <span className={`text-xs font-bold w-8 text-right ${getScoreColor(sub.value)}`}>{sub.value}</span>
                    </div>
                  ))}
                </div>
                <div className={`flex items-center justify-between mt-3 p-2 rounded-lg ${isDark ? "bg-slate-800/60" : "bg-slate-50"}`}>
                  <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Score Ponderado → Confiança {(selectedSlot.fatorConfianca * 100).toFixed(0)}% → <strong>Score Final</strong></span>
                  <span className={`text-sm font-bold ${getScoreColor(selectedSlot.scoreFinal)}`}>{selectedSlot.scoreFinal}</span>
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { label: "Lote recomendado", value: `${selectedSlot.loteRecomendadoPct}%`, color: getScoreColor(selectedSlot.scoreFinal) },
                  { label: "Meses analisados", value: selectedSlot.totalMonths },
                  { label: "Total trades", value: selectedSlot.totalTrades },
                  { label: "Consistência", value: `${selectedSlot.consistencia}%`, color: selectedSlot.consistencia >= 60 ? "text-emerald-500" : "text-rose-500" },
                  { label: "Recovery mediano", value: selectedSlot.recoveryMediano, color: selectedSlot.recoveryMediano >= 1 ? "text-emerald-500" : "text-amber-500" },
                  { label: "Recovery P25", value: selectedSlot.recoveryPessP25, color: selectedSlot.recoveryPessP25 >= 1 ? "text-emerald-500" : "text-amber-500" },
                  { label: "DD mediano", value: formatCurrency(selectedSlot.drawdownMediano), color: "text-rose-400" },
                  { label: "DD P75", value: formatCurrency(selectedSlot.drawdownPessP75), color: "text-rose-400" },
                  { label: "Retorno médio/mês", value: formatCurrency(selectedSlot.retornoMedioMensal), color: selectedSlot.retornoMedioMensal >= 0 ? "text-emerald-500" : "text-rose-500" },
                ].map((m, i) => (
                  <div key={i} className={`rounded-lg p-2 text-center ${isDark ? "bg-slate-800/60" : "bg-slate-50"}`}>
                    <p className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{m.label}</p>
                    <p className={`text-sm font-bold ${(m as any).color || (isDark ? "text-slate-200" : "text-slate-700")}`}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Monthly table */}
              <div className="mt-4">
                <p className={`text-xs font-semibold mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>Quebra Mensal</p>
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
