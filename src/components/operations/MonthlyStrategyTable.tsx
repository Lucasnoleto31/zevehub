import { useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
  strategy: string | null;
  contracts: number;
}

interface MonthlyStrategyTableProps {
  filteredOperations: Operation[];
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface CellData {
  result: number;
  ops: number;
  wins: number;
}

const ResultCell = ({ data }: { data: CellData | undefined }) => {
  if (!data || data.ops === 0) {
    return (
      <TableCell className="text-center text-muted-foreground/40 text-xs px-2 py-2.5">
        —
      </TableCell>
    );
  }

  const isPositive = data.result >= 0;
  const winRate = data.ops > 0 ? ((data.wins / data.ops) * 100).toFixed(0) : "0";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <TableCell
            className={cn(
              "text-center text-xs font-bold tabular-nums px-2 py-2.5 cursor-default transition-colors",
              "hover:bg-muted/50 rounded",
              isPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}
          >
            {isPositive ? "+" : ""}
            {formatCurrency(data.result)}
          </TableCell>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-0.5">
            <p><span className="text-muted-foreground">Operações:</span> {data.ops}</p>
            <p><span className="text-muted-foreground">Win Rate:</span> {winRate}%</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const MonthlyStrategyTable = ({ filteredOperations }: MonthlyStrategyTableProps) => {
  const { rows, months, totals } = useMemo(() => {
    if (filteredOperations.length === 0) {
      return { rows: [], months: [], totals: {} as Record<string, CellData> };
    }

    // Aggregate: strategyData[strategy][YYYY-MM] = { result, ops, wins }
    const strategyData: Record<string, Record<string, CellData>> = {};
    const monthsSet = new Set<string>();

    for (const op of filteredOperations) {
      const strategy = op.strategy || "Sem Estratégia";
      const monthKey = op.operation_date.substring(0, 7); // "YYYY-MM"
      monthsSet.add(monthKey);

      if (!strategyData[strategy]) strategyData[strategy] = {};
      if (!strategyData[strategy][monthKey]) {
        strategyData[strategy][monthKey] = { result: 0, ops: 0, wins: 0 };
      }

      strategyData[strategy][monthKey].result += op.result;
      strategyData[strategy][monthKey].ops++;
      if (op.result > 0) strategyData[strategy][monthKey].wins++;
    }

    // Sort months chronologically
    const sortedMonths = Array.from(monthsSet).sort();

    // Build rows
    const strategies = Object.keys(strategyData).sort();
    const tableRows = strategies.map(strategy => {
      let total: CellData = { result: 0, ops: 0, wins: 0 };
      const cells: Record<string, CellData> = {};

      for (const month of sortedMonths) {
        const cell = strategyData[strategy][month];
        if (cell) {
          cells[month] = cell;
          total.result += cell.result;
          total.ops += cell.ops;
          total.wins += cell.wins;
        }
      }

      return { strategy, cells, total };
    });

    // Build totals row
    const totalRow: Record<string, CellData> = {};
    for (const month of sortedMonths) {
      totalRow[month] = { result: 0, ops: 0, wins: 0 };
      for (const strategy of strategies) {
        const cell = strategyData[strategy]?.[month];
        if (cell) {
          totalRow[month].result += cell.result;
          totalRow[month].ops += cell.ops;
          totalRow[month].wins += cell.wins;
        }
      }
    }

    return { rows: tableRows, months: sortedMonths, totals: totalRow };
  }, [filteredOperations]);

  if (rows.length === 0) return null;

  // Format month header: "YYYY-MM" -> "Mmm/AA"
  const formatMonthHeader = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const monthIndex = parseInt(month, 10) - 1;
    return `${MONTH_NAMES[monthIndex]}/${year.slice(2)}`;
  };

  // Grand total
  const grandTotal: CellData = { result: 0, ops: 0, wins: 0 };
  for (const row of rows) {
    grandTotal.result += row.total.result;
    grandTotal.ops += row.total.ops;
    grandTotal.wins += row.total.wins;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="border-violet-500/20 overflow-hidden bg-gradient-to-br from-card via-card to-accent/5">
        <CardHeader className="bg-gradient-to-r from-violet-500/5 via-transparent to-transparent">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500">
              <Calendar className="w-5 h-5" />
            </div>
            Resultado Mensal por Estratégia
          </CardTitle>
          <CardDescription>
            Matriz de performance: estratégia × mês com totais
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <ScrollArea className="w-full">
            <div className="min-w-[600px] px-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="text-xs font-bold text-foreground sticky left-0 bg-card z-10 min-w-[140px]">
                      Estratégia
                    </TableHead>
                    {months.map(month => (
                      <TableHead key={month} className="text-center text-xs font-semibold text-muted-foreground px-2 min-w-[90px]">
                        {formatMonthHeader(month)}
                      </TableHead>
                    ))}
                    <TableHead className="text-center text-xs font-bold text-foreground px-2 min-w-[100px] bg-muted/30">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow
                      key={row.strategy}
                      className={cn(
                        "hover:bg-muted/30 transition-colors border-b border-border/30",
                        index % 2 === 0 && "bg-muted/5"
                      )}
                    >
                      <TableCell className="font-semibold text-xs text-foreground sticky left-0 bg-card z-10 px-3 py-2.5">
                        {row.strategy}
                      </TableCell>
                      {months.map(month => (
                        <ResultCell key={month} data={row.cells[month]} />
                      ))}
                      <TableCell
                        className={cn(
                          "text-center text-xs font-black tabular-nums px-2 py-2.5 bg-muted/20",
                          row.total.result >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {row.total.result >= 0 ? "+" : ""}
                        {formatCurrency(row.total.result)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Total row */}
                  <TableRow className="bg-muted/30 hover:bg-muted/40 border-t-2 border-border font-bold">
                    <TableCell className="font-black text-xs text-foreground sticky left-0 bg-muted/30 z-10 px-3 py-3">
                      TOTAL
                    </TableCell>
                    {months.map(month => (
                      <ResultCell key={`total-${month}`} data={totals[month]} />
                    ))}
                    <TableCell
                      className={cn(
                        "text-center text-sm font-black tabular-nums px-2 py-3 bg-muted/40",
                        grandTotal.result >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      )}
                    >
                      {grandTotal.result >= 0 ? "+" : ""}
                      {formatCurrency(grandTotal.result)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MonthlyStrategyTable;
