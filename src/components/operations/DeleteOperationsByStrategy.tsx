import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  useEffect(() => {
    if (open) {
      loadStrategies();
    }
  }, [open]);

  const loadStrategies = async () => {
    try {
      const { data, error } = await supabase
        .from("trading_operations")
        .select("strategy")
        .not("strategy", "is", null)
        .limit(10000)
        .order("strategy");

      if (error) throw error;

      // Obter estratégias únicas
      const uniqueStrategies = [...new Set(data?.map(op => op.strategy).filter(Boolean) as string[])];
      setStrategies(uniqueStrategies);
    } catch (error) {
      console.error("Erro ao carregar estratégias:", error);
    }
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

    try {
      const { error } = await supabase
        .from("trading_operations")
        .delete()
        .eq("strategy", selectedStrategy);

      if (error) throw error;

      toast.success(`Operações da estratégia "${selectedStrategy}" foram excluídas!`);
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
                <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder="Selecione uma estratégia" />
                  </SelectTrigger>
                  <SelectContent>
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
            {deleting ? "Excluindo..." : "Confirmar Exclusão"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteOperationsByStrategy;
