import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteOperationsByStrategyProps {
  userId: string;
}

const DeleteOperationsByStrategy = ({ userId }: DeleteOperationsByStrategyProps) => {
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [strategies, setStrategies] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deletedCount, setDeletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (open) {
      loadStrategies();
      setProgress(0);
      setDeletedCount(0);
      setTotalCount(0);
    }
  }, [open]);

  const loadStrategies = async () => {
    try {
      const { data, error } = await supabase.rpc('distinct_strategies');

      if (error) throw error;

      const values = (data || []).map((row: any) => (typeof row === 'string' ? row : row?.strategy)).filter(Boolean) as string[];
      const uniqueStrategies = [...new Set(values)].sort();
      setStrategies(uniqueStrategies);

      if (uniqueStrategies.length === 0) {
        toast.info("Nenhuma estratégia encontrada");
      } else {
        console.info(`${uniqueStrategies.length} estratégia(s) encontrada(s):`, uniqueStrategies);
      }
    } catch (error) {
      console.error("Erro ao carregar estratégias:", error);
      toast.error("Erro ao carregar estratégias");
    }
  };

  const deleteBatch = async (strategy: string): Promise<number> => {
    const BATCH_SIZE = 1; // Ultra pequeno - 1 registro por vez
    const MAX_RETRIES = 5;
    let totalDeleted = 0;
    let consecutiveFailures = 0;

    // Loop até não haver mais operações
    while (true) {
      // Buscar apenas 1 ID por vez
      const { data: operations, error: fetchError } = await supabase
        .from("trading_operations")
        .select("id")
        .eq("strategy", strategy)
        .limit(BATCH_SIZE);

      if (fetchError) {
        console.error("Erro no SELECT:", fetchError);
        throw fetchError;
      }
      
      // Se não há mais operações, terminar
      if (!operations || operations.length === 0) break;

      const id = operations[0].id;
      let retries = 0;
      let success = false;

      // Loop de retry para lidar com timeouts
      while (retries < MAX_RETRIES && !success) {
        const { error } = await supabase
          .from("trading_operations")
          .delete()
          .eq("id", id);

        if (!error) {
          success = true;
          consecutiveFailures = 0;
        } else if (error.message.includes("timeout") || error.message.includes("canceling")) {
          retries++;
          console.log(`Timeout/Cancel no registro ${id}, tentativa ${retries}/${MAX_RETRIES}...`);
          // Esperar mais tempo a cada retry
          await new Promise(r => setTimeout(r, 2000 * retries));
        } else {
          console.error("Erro ao deletar:", error);
          throw error;
        }
      }

      if (!success) {
        consecutiveFailures++;
        console.log(`Falha no registro ${id}, pulando... (${consecutiveFailures} falhas consecutivas)`);
        
        // Se muitas falhas consecutivas, parar
        if (consecutiveFailures >= 10) {
          throw new Error(`Muitas falhas consecutivas (${consecutiveFailures}). Tente novamente mais tarde.`);
        }
        
        // Esperar mais e continuar com próximo registro
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }

      totalDeleted += 1;
      setDeletedCount(totalDeleted);
      
      // Atualizar progresso
      if (totalCount > 0) {
        setProgress(Math.min(Math.round((totalDeleted / totalCount) * 100), 99));
      }

      // Delay entre exclusões para não sobrecarregar
      await new Promise(r => setTimeout(r, 300));
    }

    setProgress(100);
    return totalDeleted;
  };

  const handleDelete = async () => {
    if (confirmText !== "EXCLUIR") {
      toast.error("Digite 'EXCLUIR' para confirmar");
      return;
    }

    if (!selectedStrategy) {
      toast.error("Selecione uma estratégia");
      return;
    }

    setDeleting(true);
    setProgress(0);
    setDeletedCount(0);

    try {
      // Buscar contagem total primeiro (para barra de progresso)
      const { count, error: countError } = await supabase
        .from("trading_operations")
        .select("*", { count: "exact", head: true })
        .eq("strategy", selectedStrategy);

      if (countError) throw countError;
      setTotalCount(count || 0);

      const deleted = await deleteBatch(selectedStrategy);

      toast.success(`${deleted} operações da estratégia "${selectedStrategy}" foram excluídas!`);
      setConfirmText("");
      setSelectedStrategy("");
      setOpen(false);
      
      // Recarregar a página após 1 segundo
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error("Erro ao excluir operações:", error);
      toast.error(error.message || "Erro ao excluir operações");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Trash2 className="w-4 h-4" />
          Excluir por Estratégia
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Excluir Operações por Estratégia</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p className="font-semibold text-destructive">
              Esta ação irá excluir TODAS as operações da estratégia selecionada.
            </p>
            <p>
              Não será possível recuperar os dados após a exclusão.
            </p>
            <div className="pt-2 space-y-3">
              <div>
                <label className="text-sm font-medium">
                  Selecione a estratégia:
                </label>
                <Select 
                  value={selectedStrategy} 
                  onValueChange={setSelectedStrategy}
                  disabled={deleting}
                >
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="Selecione uma estratégia" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover text-popover-foreground">
                    {strategies.map((strategy) => (
                      <SelectItem key={strategy} value={strategy}>
                        {strategy}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  Digite "EXCLUIR" para confirmar:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                  className="w-full mt-2 px-3 py-2 border rounded-md"
                  disabled={deleting}
                />
              </div>
              
              {deleting && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-sm">
                    <span>Excluindo operações...</span>
                    <span>{deletedCount} / {totalCount}</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    {progress}% concluído
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting || confirmText !== "EXCLUIR" || !selectedStrategy}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleting ? `Excluindo... ${progress}%` : "Confirmar Exclusão"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteOperationsByStrategy;
