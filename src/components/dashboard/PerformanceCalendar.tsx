import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface Operation {
  id: string;
  operation_date: string;
  result: number;
  strategy?: string;
  contracts?: number;
}

interface PerformanceCalendarProps {
  operations: Operation[];
}

interface DayData {
  date: Date;
  result: number;
  operations: number;
  wins: number;
  losses: number;
  bestTrade: number;
  worstTrade: number;
}

const PerformanceCalendar = ({ operations }: PerformanceCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const { calendarDays, monthStats } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Process operations by date
    const operationsByDate: Record<string, Operation[]> = {};
    operations.forEach(op => {
      const dateKey = op.operation_date;
      if (!operationsByDate[dateKey]) {
        operationsByDate[dateKey] = [];
      }
      operationsByDate[dateKey].push(op);
    });

    // Calculate day data
    const calendarDays: DayData[] = days.map(date => {
      const dateKey = format(date, "yyyy-MM-dd");
      const dayOps = operationsByDate[dateKey] || [];
      const results = dayOps.map(op => op.result);
      
      return {
        date,
        result: results.reduce((sum, r) => sum + r, 0),
        operations: dayOps.length,
        wins: results.filter(r => r > 0).length,
        losses: results.filter(r => r < 0).length,
        bestTrade: results.length > 0 ? Math.max(...results) : 0,
        worstTrade: results.length > 0 ? Math.min(...results) : 0,
      };
    });

    // Month stats
    const monthDays = calendarDays.filter(d => isSameMonth(d.date, currentMonth) && d.operations > 0);
    const totalResult = monthDays.reduce((sum, d) => sum + d.result, 0);
    const winDays = monthDays.filter(d => d.result > 0).length;
    const lossDays = monthDays.filter(d => d.result < 0).length;
    const tradingDays = monthDays.length;

    return {
      calendarDays,
      monthStats: { totalResult, winDays, lossDays, tradingDays },
    };
  }, [operations, currentMonth]);

  const getColorIntensity = (result: number, operations: number) => {
    if (operations === 0) return "bg-muted/30";
    
    const absResult = Math.abs(result);
    const maxResult = Math.max(...calendarDays.filter(d => d.operations > 0).map(d => Math.abs(d.result)), 1);
    const intensity = Math.min(absResult / maxResult, 1);
    
    if (result > 0) {
      if (intensity > 0.7) return "bg-emerald-500/80 text-white";
      if (intensity > 0.4) return "bg-emerald-500/50 text-emerald-100";
      return "bg-emerald-500/25 text-emerald-200";
    } else {
      if (intensity > 0.7) return "bg-red-500/80 text-white";
      if (intensity > 0.4) return "bg-red-500/50 text-red-100";
      return "bg-red-500/25 text-red-200";
    }
  };

  const handleMouseEnter = (day: DayData, e: React.MouseEvent) => {
    if (day.operations > 0) {
      setHoveredDay(day);
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPosition({ 
        x: rect.left + rect.width / 2, 
        y: rect.top - 10 
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Main Calendar Card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Calendar className="h-5 w-5 text-primary" />
              Calendário de Performance
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[140px] text-center font-medium capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Month Summary */}
          <div className="mb-4 grid grid-cols-4 gap-3">
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <p className="text-xs text-muted-foreground">Resultado</p>
              <p className={`text-lg font-bold ${monthStats.totalResult >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatCurrency(monthStats.totalResult)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3 text-center">
              <p className="text-xs text-muted-foreground">Dias Operados</p>
              <p className="text-lg font-bold">{monthStats.tradingDays}</p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
              <p className="text-xs text-muted-foreground">Dias Positivos</p>
              <p className="text-lg font-bold text-emerald-500">{monthStats.winDays}</p>
            </div>
            <div className="rounded-lg bg-red-500/10 p-3 text-center">
              <p className="text-xs text-muted-foreground">Dias Negativos</p>
              <p className="text-lg font-bold text-red-500">{monthStats.lossDays}</p>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Week day headers */}
            {weekDays.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map((day, index) => {
              const isCurrentMonth = isSameMonth(day.date, currentMonth);
              const isTodayDate = isToday(day.date);
              
              return (
                <motion.div
                  key={index}
                  className={`
                    relative aspect-square rounded-md p-1 text-center text-sm transition-all cursor-default
                    ${!isCurrentMonth ? "opacity-30" : ""}
                    ${isTodayDate ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
                    ${day.operations > 0 ? getColorIntensity(day.result, day.operations) : "bg-muted/20"}
                    ${day.operations > 0 ? "hover:scale-105 cursor-pointer" : ""}
                  `}
                  onMouseEnter={(e) => handleMouseEnter(day, e)}
                  onMouseLeave={() => setHoveredDay(null)}
                  whileHover={day.operations > 0 ? { scale: 1.05 } : {}}
                >
                  <span className={`text-xs ${!isCurrentMonth ? "text-muted-foreground" : ""}`}>
                    {format(day.date, "d")}
                  </span>
                  {day.operations > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: Math.min(day.operations, 3) }).map((_, i) => (
                          <div key={i} className="h-1 w-1 rounded-full bg-current opacity-60" />
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-emerald-500/50" />
              <span>Lucro</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-red-500/50" />
              <span>Prejuízo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-muted/30" />
              <span>Sem operações</span>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Tooltip */}
      <AnimatePresence>
        {hoveredDay && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="fixed z-50 rounded-lg border border-border bg-popover p-3 shadow-lg"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="space-y-2">
              <p className="font-medium capitalize">
                {format(hoveredDay.date, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Resultado: </span>
                  <span className={`font-semibold ${hoveredDay.result >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {formatCurrency(hoveredDay.result)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Operações: </span>
                  <span className="font-semibold">{hoveredDay.operations}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-500">{hoveredDay.wins}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">{hoveredDay.losses}</span>
                </div>
              </div>
              {hoveredDay.operations > 0 && (
                <div className="border-t border-border pt-2 text-xs text-muted-foreground">
                  <p>Melhor: <span className="text-emerald-500">{formatCurrency(hoveredDay.bestTrade)}</span></p>
                  <p>Pior: <span className="text-red-500">{formatCurrency(hoveredDay.worstTrade)}</span></p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PerformanceCalendar;
