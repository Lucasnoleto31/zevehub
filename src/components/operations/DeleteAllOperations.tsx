import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeleteAllOperationsProps {
  userId: string;
}

const DeleteAllOperations = ({ userId }: DeleteAllOperationsProps) => {
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleDeleteAll = async () => {
    if (confirmText !== "EXCLUIR TUDO") {
      toast.error("Digite 'EXCLUIR TUDO' para confirmar");
      return;
    }

    setDeleting(true);

    try {
      const { error } = await supabase
        .from("trading_operations")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Todas as operações foram excluídas!");
      setConfirmText("");
      
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
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="w-4 h-4" />
          Excluir Todas as Operações
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Atenção - Ação Irreversível!</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p className="font-semibold text-destructive">
              Esta ação irá excluir TODAS as suas operações permanentemente.
            </p>
            <p>
              Não será possível recuperar os dados após a exclusão.
            </p>
            <div className="pt-2">
              <label className="text-sm font-medium">
                Digite "EXCLUIR TUDO" para confirmar:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="EXCLUIR TUDO"
                className="w-full mt-2 px-3 py-2 border rounded-md"
                disabled={deleting}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAll}
            disabled={deleting || confirmText !== "EXCLUIR TUDO"}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleting ? "Excluindo..." : "Confirmar Exclusão"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAllOperations;
