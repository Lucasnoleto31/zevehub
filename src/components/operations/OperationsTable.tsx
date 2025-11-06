import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Operation {
  id: string;
  operation_date: string;
  operation_time: string;
  asset: string;
  contracts: number;
  costs: number;
  result: number;
  notes: string;
}

interface OperationsTableProps {
  userId: string;
}

const OperationsTable = ({ userId }: OperationsTableProps) => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);

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
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadOperations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadOperations = async () => {
    try {
      const { data, error } = await supabase
        .from("trading_operations")
        .select("*")
        .eq("user_id", userId)
        .order("operation_date", { ascending: false })
        .order("operation_time", { ascending: false })
        .limit(10);

      if (error) throw error;
      setOperations(data || []);
    } catch (error) {
      console.error("Erro ao carregar operações:", error);
    } finally {
      setLoading(false);
    }
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Horário</TableHead>
            <TableHead>Ativo</TableHead>
            <TableHead className="text-right">Contratos</TableHead>
            <TableHead className="text-right">Resultado</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {operations.map((operation) => (
            <TableRow key={operation.id}>
              <TableCell>
                {format(new Date(operation.operation_date), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell>{operation.operation_time}</TableCell>
              <TableCell>
                <Badge variant="outline">{operation.asset}</Badge>
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
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(operation.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default OperationsTable;
