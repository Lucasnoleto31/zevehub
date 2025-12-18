import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Clock, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface Operation {
  id: string;
  asset: string;
  result: number;
  operation_date: string;
  operation_time: string;
  strategy: string | null;
}

interface RecentOperationsTableProps {
  operations: Operation[];
  loading?: boolean;
}

export const RecentOperationsTable = ({ operations, loading }: RecentOperationsTableProps) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  };

  if (loading) {
    return (
      <Card className="border border-border/40 bg-card/50 backdrop-blur-sm animate-pulse h-full">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/50 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (operations.length === 0) {
    return (
      <Card className={cn(
        "border border-border/40 h-full",
        "bg-gradient-to-br from-card/90 via-card/70 to-card/50",
        "backdrop-blur-xl"
      )}>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Activity className="w-5 h-5" />
            </div>
            <span className="font-bold">Operações Recentes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-center text-muted-foreground font-medium">
              Nenhuma operação no período
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="h-full"
    >
      <Card className={cn(
        "border border-primary/20 hover:border-primary/40 transition-all duration-500 h-full overflow-hidden",
        "bg-gradient-to-br from-card/90 via-card/70 to-card/50",
        "backdrop-blur-xl hover:shadow-2xl"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="p-2.5 rounded-xl bg-primary/15 text-primary">
                <Activity className="w-5 h-5" />
              </div>
              <span className="font-bold">Operações Recentes</span>
            </CardTitle>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs font-medium">
              {operations.length} ops
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {operations.map((operation, index) => {
              const isProfit = operation.result >= 0;
              return (
                <motion.div
                  key={operation.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-xl",
                    "border border-border/30 hover:border-primary/30",
                    "bg-background/30 hover:bg-background/50",
                    "transition-all duration-300 cursor-pointer"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                      "transition-all duration-300 group-hover:scale-105",
                      isProfit 
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" 
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                    )}>
                      {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
                          {operation.asset}
                        </p>
                        {operation.strategy && (
                          <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 h-4 truncate max-w-[80px]">
                            {operation.strategy}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(operation.operation_date)} • {operation.operation_time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn(
                      "text-lg font-black tracking-tight",
                      isProfit ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {isProfit ? "+" : ""}{formatCurrency(operation.result)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
