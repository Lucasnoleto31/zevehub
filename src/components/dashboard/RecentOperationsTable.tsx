import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    return `${d}/${m}/${y}`;
  };

  if (loading) {
    return (
      <Card className="animate-pulse mt-6">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (operations.length === 0) {
    return (
      <Card className="mt-6 border-2 border-dashed">
        <CardHeader>
          <CardTitle className="text-xl">Operações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-4xl">📊</span>
            </div>
            <p className="text-center text-muted-foreground font-medium">
              Nenhuma operação registrada ainda.
            </p>
            <p className="text-center text-sm text-muted-foreground mt-1">
              Comece a registrar suas operações para ver o histórico aqui
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 h-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Operações Recentes</CardTitle>
          <Badge variant="secondary" className="text-sm">
            {operations.length} operações
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {operations.map((operation, index) => {
            const isProfit = operation.result >= 0;
            return (
              <div
                key={operation.id}
                className="group flex items-center justify-between p-4 border-2 rounded-xl hover:border-primary/50 hover:shadow-md transition-all duration-300 animate-fade-in cursor-pointer bg-card"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                    isProfit 
                      ? "bg-green-500/10 text-green-600 dark:text-green-400 border-2 border-green-500/20" 
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border-2 border-red-500/20"
                  }`}>
                    {isProfit ? "W" : "L"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-foreground text-lg group-hover:text-primary transition-colors">
                        {operation.asset}
                      </p>
                      {operation.strategy && (
                        <Badge variant="outline" className="text-xs font-medium">
                          {operation.strategy}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      {formatDate(operation.operation_date)} às {operation.operation_time}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-2xl font-bold tracking-tight ${
                      isProfit 
                        ? "text-green-600 dark:text-green-400" 
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {isProfit ? "+" : ""}{formatCurrency(operation.result)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
