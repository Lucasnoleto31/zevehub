import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Operation {
  operation_date: string;
  result: number;
}

interface MonthlyPerformanceTableProps {
  filteredOperations: Operation[];
  capitalBase?: number;
}

const MONTH_LABELS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

const MonthlyPerformanceTable = ({ filteredOperations, capitalBase = 10000 }: MonthlyPerformanceTableProps) => {
  const tableData = useMemo(() => {
    if (filteredOperations.length === 0) return [];

    // Group results by year-month
    const monthlyResults: Record<string, Record<number, number>> = {};
    filteredOperations.forEach(op => {
      const [yearStr, monthStr] = op.operation_date.split("-");
      const year = yearStr;
      const month = parseInt(monthStr, 10) - 1; // 0-indexed
      if (!monthlyResults[year]) monthlyResults[year] = {};
      monthlyResults[year][month] = (monthlyResults[year][month] || 0) + op.result;
    });

    const years = Object.keys(monthlyResults).sort((a, b) => b.localeCompare(a));

    return years.map(year => {
      const months = monthlyResults[year];
      let capital = capitalBase;
      const monthlyPct: (number | null)[] = [];
      let yearAccumulated = 1;

      for (let m = 0; m < 12; m++) {
        const result = months[m] || 0;
        if (result === 0 && !(m in months)) {
          monthlyPct.push(null);
        } else {
          const pct = capital > 0 ? (result / capital) * 100 : 0;
          monthlyPct.push(pct);
          yearAccumulated *= (1 + pct / 100);
          capital += result;
        }
      }

      const accumulated = (yearAccumulated - 1) * 100;

      return { year, monthlyPct, accumulated };
    });
  }, [filteredOperations, capitalBase]);

  if (tableData.length === 0) return null;

  const formatPct = (value: number | null) => {
    if (value === null) return "-";
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-2 overflow-hidden backdrop-blur-xl bg-gradient-to-br from-card via-card to-primary/5 border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <motion.div
              className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <TrendingUp className="w-6 h-6 text-primary" />
            </motion.div>
            <div>
              <CardTitle className="text-xl font-bold">Desempenho Mensal por Ano (%)</CardTitle>
              <CardDescription className="text-sm">Retorno percentual mensal baseado em capital fictício de R$ {capitalBase.toLocaleString("pt-BR")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-x-auto rounded-xl border border-border/30">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-primary/90 text-primary-foreground">
                  <th className="px-3 py-3 text-left font-bold text-xs uppercase tracking-wider rounded-tl-xl">Ano</th>
                  {MONTH_LABELS.map(m => (
                    <th key={m} className="px-2 py-3 text-center font-bold text-xs uppercase tracking-wider">{m}</th>
                  ))}
                  <th className="px-3 py-3 text-center font-bold text-xs uppercase tracking-wider rounded-tr-xl bg-primary">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, idx) => (
                  <tr
                    key={row.year}
                    className={cn(
                      "transition-colors hover:bg-muted/50 border-b border-border/20",
                      idx % 2 === 0 ? "bg-card/80" : "bg-muted/20"
                    )}
                  >
                    <td className="px-3 py-2.5 font-bold text-foreground">{row.year}</td>
                    {row.monthlyPct.map((pct, m) => (
                      <td key={m} className="px-2 py-2.5 text-center font-medium text-xs">
                        <span className={cn(
                          pct === null ? "text-muted-foreground/40" :
                          pct > 0 ? "text-emerald-500 dark:text-emerald-400" :
                          pct < 0 ? "text-rose-500 dark:text-rose-400" :
                          "text-muted-foreground"
                        )}>
                          {formatPct(pct)}
                        </span>
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center font-bold text-xs bg-primary/5">
                      <span className={cn(
                        row.accumulated > 0 ? "text-emerald-500 dark:text-emerald-400" :
                        row.accumulated < 0 ? "text-rose-500 dark:text-rose-400" :
                        "text-muted-foreground"
                      )}>
                        {formatPct(row.accumulated)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MonthlyPerformanceTable;
