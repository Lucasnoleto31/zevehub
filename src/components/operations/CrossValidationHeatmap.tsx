import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Check, X, AlertTriangle, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

interface CellData {
  weekday: string;
  hour: string;
  historicalResult: number;
  historicalOps: number;
  currentResult: number;
  currentOps: number;
  signal: Signal;
}

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const HOURS = Array.from({ length: 9 }, (_, i) => `${i + 9}h`);

const CrossValidationHeatmap = ({ operations }: CrossValidationHeatmapProps) => {
  const [theme, setTheme] = useState<HeatmapTheme>("dark");
  const isDark = theme === "dark";

  const { cells, summary } = useMemo(() => {
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const historical = operations.filter(op => !op.operation_date.startsWith(currentYM));
    const currentMonth = operations.filter(op => op.operation_date.startsWith(currentYM));

    const weekdayMap: Record<number, string> = { 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex" };

    const aggregate = (ops: Operation[]) => {
      const map = new Map<string, { result: number; ops: number }>();
      ops.forEach(op => {
        const [y, m, d] = op.operation_date.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        const wd = date.getDay();
        if (wd === 0 || wd === 6) return;
        const hour = parseInt(op.operation_time.split(":")[0]);
        if (hour < 9 || hour > 17) return;
        const key = `${wd}-${hour}`;
        const existing = map.get(key) || { result: 0, ops: 0 };
        existing.result += op.result;
        existing.ops++;
        map.set(key, existing);
      });
      return map;
    };

    const histMap = aggregate(historical);
    const currMap = aggregate(currentMonth);

    const cells: CellData[] = [];
    let ligar = 0, alerta = 0, naoLigar = 0, semDados = 0;

    for (let hour = 9; hour <= 17; hour++) {
      for (let day = 1; day <= 5; day++) {
        const key = `${day}-${hour}`;
        const hist = histMap.get(key) || { result: 0, ops: 0 };
        const curr = currMap.get(key) || { result: 0, ops: 0 };

        let signal: Signal;
        if (hist.ops === 0 || curr.ops === 0) {
          signal = "SEM_DADOS";
          semDados++;
        } else if (hist.result > 0 && curr.result > 0) {
          signal = "LIGAR";
          ligar++;
        } else if (hist.result <= 0 && curr.result <= 0) {
          signal = "NAO_LIGAR";
          naoLigar++;
        } else {
          signal = "ALERTA";
          alerta++;
        }

        cells.push({
          weekday: weekdayMap[day],
          hour: `${hour}h`,
          historicalResult: hist.result,
          historicalOps: hist.ops,
          currentResult: curr.result,
          currentOps: curr.ops,
          signal,
        });
      }
    }

    const totalWithData = ligar + alerta + naoLigar;
    const score = totalWithData > 0 ? Math.round((ligar / totalWithData) * 100) : 0;

    return { cells, summary: { ligar, alerta, naoLigar, semDados, score } };
  }, [operations]);

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getCellStyle = (signal: Signal) => {
    switch (signal) {
      case "LIGAR":
        return isDark
          ? "bg-emerald-500/80 border-emerald-400/50 text-white"
          : "bg-emerald-500 border-emerald-400 text-white";
      case "ALERTA":
        return isDark
          ? "bg-amber-500/70 border-amber-400/40 text-white"
          : "bg-amber-400 border-amber-300 text-white";
      case "NAO_LIGAR":
        return isDark
          ? "bg-rose-500/80 border-rose-400/50 text-white"
          : "bg-rose-500 border-rose-400 text-white";
      default:
        return isDark
          ? "bg-slate-800/40 border-slate-700/30 text-slate-600"
          : "bg-slate-100 border-slate-200 text-slate-400";
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
      case "ALERTA": return "DIVERGÊNCIA";
      case "NAO_LIGAR": return "NÃO LIGAR";
      default: return "SEM DADOS";
    }
  };

  const getDivergenceDetail = (cell: CellData) => {
    if (cell.signal !== "ALERTA") return null;
    if (cell.historicalResult <= 0) return "Histórico negativo";
    return "Mês atual negativo";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Card className={`border transition-colors duration-300 ${
        isDark
          ? "bg-slate-900/80 border-slate-700/50"
          : "bg-white border-slate-200 shadow-sm"
      }`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${
                isDark ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-100 text-emerald-600"
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className={`text-lg font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                  Validação Cruzada
                </CardTitle>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Histórico completo × Mês atual
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
              className={`h-9 w-9 p-0 rounded-lg ${
                isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"
              }`}
            >
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0 pb-6">
          <TooltipProvider delayDuration={100}>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                {/* Weekday Headers */}
                <div className="flex gap-1.5 mb-3">
                  <div className="w-12" />
                  {WEEKDAYS.map(day => (
                    <div key={day} className="flex-1 min-w-[70px] text-center">
                      <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                        {day}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Grid */}
                <div className="space-y-1.5">
                  {HOURS.map((hour, hourIndex) => (
                    <div key={hour} className="flex gap-1.5">
                      <div className={`w-12 text-xs font-medium flex items-center justify-end pr-2 ${
                        isDark ? "text-slate-500" : "text-slate-400"
                      }`}>
                        {hour}
                      </div>
                      {WEEKDAYS.map((_, dayIndex) => {
                        const cell = cells[hourIndex * 5 + dayIndex];
                        return (
                          <Tooltip key={`${hour}-${dayIndex}`}>
                            <TooltipTrigger asChild>
                              <motion.div
                                className={`flex-1 min-w-[70px] h-12 rounded-lg border flex items-center justify-center cursor-default transition-all ${getCellStyle(cell.signal)}`}
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              >
                                {getSignalIcon(cell.signal)}
                              </motion.div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className={`max-w-[260px] p-3 text-xs ${
                                isDark ? "bg-slate-800 border-slate-700 text-slate-200" : ""
                              }`}
                            >
                              <p className="font-semibold mb-2">{cell.weekday} {cell.hour}</p>
                              <div className="space-y-1.5">
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Histórico:</span>
                                  <span className={cell.historicalResult >= 0 ? "text-emerald-500" : "text-rose-500"}>
                                    {formatCurrency(cell.historicalResult)} ({cell.historicalOps} ops)
                                  </span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-muted-foreground">Mês Atual:</span>
                                  <span className={cell.currentResult >= 0 ? "text-emerald-500" : "text-rose-500"}>
                                    {formatCurrency(cell.currentResult)} ({cell.currentOps} ops)
                                  </span>
                                </div>
                                <div className={`pt-1.5 mt-1.5 border-t ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                                  <span className="font-semibold">Sinal: {getSignalLabel(cell.signal)}</span>
                                  {getDivergenceDetail(cell) && (
                                    <p className="text-amber-400 mt-0.5">⚠ {getDivergenceDetail(cell)}</p>
                                  )}
                                </div>
                              </div>
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
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-emerald-500" />
              <span>Ligar (ambos +)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-amber-500" />
              <span>Divergência</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-rose-500" />
              <span>Não Ligar (ambos −)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`h-3 w-3 rounded ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
              <span>Sem dados</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CrossValidationHeatmap;
