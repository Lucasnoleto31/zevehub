import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (operations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Operações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Nenhuma operação registrada ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operações Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {operations.map((operation) => (
            <div
              key={operation.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-foreground">{operation.asset}</p>
                  {operation.strategy && (
                    <Badge variant="outline" className="text-xs">
                      {operation.strategy}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {format(new Date(operation.operation_date), "dd/MM/yyyy", { locale: ptBR })} às{" "}
                  {operation.operation_time}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-lg font-bold ${
                    operation.result >= 0 ? "text-success" : "text-error"
                  }`}
                >
                  {operation.result >= 0 ? "+" : ""}R$ {operation.result.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
