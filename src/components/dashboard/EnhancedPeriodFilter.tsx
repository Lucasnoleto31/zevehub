import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CalendarRange, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type PeriodOption = "today" | "7d" | "15d" | "30d" | "month" | "year" | "all";

interface EnhancedPeriodFilterProps {
  selectedPeriod: PeriodOption;
  onPeriodChange: (period: PeriodOption) => void;
  totalOperations: number;
}

const periodOptions: { value: PeriodOption; label: string; shortLabel: string }[] = [
  { value: "today", label: "Hoje", shortLabel: "Hoje" },
  { value: "7d", label: "Últimos 7 dias", shortLabel: "7D" },
  { value: "15d", label: "Últimos 15 dias", shortLabel: "15D" },
  { value: "30d", label: "Últimos 30 dias", shortLabel: "30D" },
  { value: "month", label: "Mês atual", shortLabel: "Mês" },
  { value: "year", label: "Ano atual", shortLabel: "Ano" },
  { value: "all", label: "Todo período", shortLabel: "Todos" },
];

export function EnhancedPeriodFilter({ selectedPeriod, onPeriodChange, totalOperations }: EnhancedPeriodFilterProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/40"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Performance Analytics</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-xs font-medium">
              {totalOperations.toLocaleString()} operações
            </Badge>
            <span className="text-xs text-muted-foreground">
              no período selecionado
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Desktop buttons */}
        <div className="hidden lg:flex items-center gap-1 p-1 bg-background/60 backdrop-blur-sm rounded-xl border border-border/40">
          {periodOptions.map((option, index) => (
            <motion.div
              key={option.value}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onPeriodChange(option.value)}
                className={cn(
                  "h-9 px-4 text-sm font-medium transition-all duration-300 rounded-lg",
                  selectedPeriod === option.value
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {option.shortLabel}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Mobile/Tablet select */}
        <div className="lg:hidden w-full sm:w-auto">
          <Select value={selectedPeriod} onValueChange={(v) => onPeriodChange(v as PeriodOption)}>
            <SelectTrigger className="w-full sm:w-[200px] bg-background/60 backdrop-blur-sm border-border/40 h-10">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-primary" />
                <SelectValue placeholder="Período" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  );
}

export function filterOperationsByPeriod<T extends { operation_date: string }>(
  operations: T[],
  period: PeriodOption
): T[] {
  if (period === "all") return operations;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let startDate: Date;

  switch (period) {
    case "today":
      startDate = today;
      break;
    case "7d":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      break;
    case "15d":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 14);
      break;
    case "30d":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 29);
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return operations;
  }

  return operations.filter((op) => {
    const [year, month, day] = op.operation_date.split("-").map(Number);
    const opDate = new Date(year, month - 1, day);
    return opDate >= startDate && opDate <= now;
  });
}

export default EnhancedPeriodFilter;
