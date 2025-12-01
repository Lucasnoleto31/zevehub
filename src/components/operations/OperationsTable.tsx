import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { OperationEditDialog } from "./OperationEditDialog";
import type { FilterValues } from "./OperationsFilters";

interface Operation {
  id: string;
  operation_date: string;
  operation_time: string;
  asset: string;
  strategy: string | null;
  contracts: number;
  costs: number;
  result: number;
  notes: string;
}

interface OperationsTableProps {
  userId: string;
  isAdmin?: boolean;
  filters?: FilterValues;
}

const OperationsTable = ({ userId, isAdmin = false, filters }: OperationsTableProps) => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    loadOperations();

    // Configurar realtime
    const channel = supabase
      .channel("trading-operations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trading_operations",
        },
        () => {
          loadOperations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, filters]);

  const loadOperations = async () => {
    try {
      let query = supabase
        .from("trading_operations")
        .select("*")
        .eq("user_id", userId)
        .order("operation_date", { ascending: false })
        .order("operation_time", { ascending: false });

      if (filters) {
        // Filtros de data
        if (filters.dateFrom) {
          const fromStr = filters.dateFrom.toISOString().split('T')[0];
          query = query.gte("operation_date", fromStr);
        }
        if (filters.dateTo) {
          const toStr = filters.dateTo.toISOString().split('T')[0];
          query = query.lte("operation_date", toStr);
        }

        // Filtro de ativo
        if (filters.asset) {
          query = query.ilike("asset", `%${filters.asset}%`);
        }

        // Filtros de contratos
        if (filters.contractsMin) {
          query = query.gte("contracts", parseInt(filters.contractsMin));
        }
        if (filters.contractsMax) {
          query = query.lte("contracts", parseInt(filters.contractsMax));
        }

        // Filtros de horário
        if (filters.timeFrom) {
          query = query.gte("operation_time", filters.timeFrom);
        }
        if (filters.timeTo) {
          query = query.lte("operation_time", filters.timeTo);
        }
      }

      // Limitar a 100 resultados quando houver filtro, senão 10
      const hasFilters = filters && (
        filters.dateFrom || filters.dateTo || filters.asset || 
        filters.contractsMin || filters.contractsMax || 
        filters.timeFrom || filters.timeTo || 
        filters.strategies.length > 0 || filters.resultType !== "all"
      );
      query = query.limit(hasFilters ? 100 : 10);

      const { data, error } = await query;

      if (error) throw error;
      
      let filteredData = data || [];

      // Filtros client-side (estratégias e resultado)
      if (filters) {
        if (filters.strategies.length > 0) {
          filteredData = filteredData.filter((op) => 
            op.strategy && filters.strategies.includes(op.strategy)
          );
        }

        if (filters.resultType === "positive") {
          filteredData = filteredData.filter((op) => op.result >= 0);
        } else if (filters.resultType === "negative") {
          filteredData = filteredData.filter((op) => op.result < 0);
        }
      }

      setOperations(filteredData);
    } catch (error) {
      console.error("Erro ao carregar operações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (operation: Operation) => {
    setEditingOperation(operation);
    setEditDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta operação?")) return;

    try {
      const { error } = await supabase
        .from("trading_operations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Operação excluída com sucesso!");
    } catch (error: any) {
      console.error("Erro ao excluir operação:", error);
      toast.error(error.message || "Erro ao excluir operação");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  if (operations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhuma operação registrada ainda</p>
      </div>
    );
  }

  return (
    <>
      <OperationEditDialog
        operation={editingOperation}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        userId={userId}
      />
      <div className="rounded-md border">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Horário</TableHead>
            <TableHead>Ativo</TableHead>
            <TableHead>Estratégia</TableHead>
            <TableHead className="text-right">Contratos</TableHead>
            <TableHead className="text-right">Resultado</TableHead>
            {isAdmin && <TableHead className="text-right">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {operations.map((operation) => (
            <TableRow key={operation.id}>
              <TableCell>
                {(() => { const [y,m,d] = operation.operation_date.split('-'); return `${d}/${m}/${y}`; })()}
              </TableCell>
              <TableCell>{operation.operation_time}</TableCell>
              <TableCell>
                <Badge variant="outline">{operation.asset}</Badge>
              </TableCell>
              <TableCell>
                {operation.strategy ? (
                  <Badge variant="secondary">{operation.strategy}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">{operation.contracts}</TableCell>
              <TableCell className="text-right">
                <span
                  className={`font-semibold ${
                    operation.result >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {operation.result >= 0 ? "+" : ""}
                  {operation.result.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </TableCell>
              {isAdmin && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(operation)}
                    >
                      <Pencil className="w-4 h-4 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(operation.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    </>
  );
};

export default OperationsTable;
