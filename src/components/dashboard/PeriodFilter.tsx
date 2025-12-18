import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CalendarDays, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

export type PeriodOption = "today" | "7d" | "15d" | "30d" | "month" | "year" | "all";

interface PeriodFilterProps {
  selectedPeriod: PeriodOption;
  onPeriodChange: (period: PeriodOption) => void;
}

const periodOptions: { value: PeriodOption; label: string; icon?: React.ReactNode }[] = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "15d", label: "15 dias" },
  { value: "30d", label: "30 dias" },
  { value: "month", label: "Mês atual" },
  { value: "year", label: "Ano atual" },
  { value: "all", label: "Todo período" },
];

export function PeriodFilter({ selectedPeriod, onPeriodChange }: PeriodFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Desktop buttons */}
      <div className="hidden md:flex items-center gap-1 p-1 bg-card/50 backdrop-blur-sm rounded-lg border border-border/50">
        {periodOptions.map((option) => (
          <Button
            key={option.value}
            variant="ghost"
            size="sm"
            onClick={() => onPeriodChange(option.value)}
            className={cn(
              "h-8 px-3 text-sm font-medium transition-all",
              selectedPeriod === option.value
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Mobile select */}
      <div className="md:hidden w-full">
        <Select value={selectedPeriod} onValueChange={(v) => onPeriodChange(v as PeriodOption)}>
          <SelectTrigger className="w-full bg-card/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-primary" />
              <SelectValue placeholder="Selecione o período" />
            </div>
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {periodOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
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
