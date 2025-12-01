import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface BulkAIClassifierProps {
  userId: string;
  onSuccess?: () => void;
}

export const BulkAIClassifier = ({ userId, onSuccess }: BulkAIClassifierProps) => {
  const [classifying, setClassifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [processed, setProcessed] = useState(0);

  const handleBulkClassify = async () => {
    setClassifying(true);
    setProgress(0);
    setProcessed(0);

    try {
      // Buscar operações sem estratégia
      const { data: operations, error } = await supabase
        .from("trading_operations")
        .select("*")
        .eq("user_id", userId)
        .or("strategy.is.null,strategy.eq.''")
        .limit(50); // Limitar para não sobrecarregar

      if (error) throw error;

      if (!operations || operations.length === 0) {
        toast.info("Todas as operações já estão classificadas!");
        setClassifying(false);
        return;
      }

      setTotal(operations.length);
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        
        try {
          const { data, error: classifyError } = await supabase.functions.invoke("classify-strategy", {
            body: {
              operationId: op.id,
              asset: op.asset,
              result: op.result,
              contracts: op.contracts,
              costs: op.costs,
              notes: op.notes || "",
            },
          });

          if (classifyError) throw classifyError;

          if (data.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error(`Erro ao classificar operação ${op.id}:`, err);
          failCount++;
        }

        setProcessed(i + 1);
        setProgress(((i + 1) / operations.length) * 100);

        // Pequeno delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast.success(`Classificação concluída! ${successCount} sucesso, ${failCount} falhas`);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Erro na classificação em massa:", error);
      toast.error(error.message || "Erro ao classificar operações");
    } finally {
      setClassifying(false);
      setTimeout(() => {
        setProgress(0);
        setProcessed(0);
        setTotal(0);
      }, 2000);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleBulkClassify}
        disabled={classifying}
        className="w-full gap-2"
      >
        {classifying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Classificando...
          </>
        ) : (
          <>
            <Brain className="w-4 h-4" />
            Classificar Todas com IA
          </>
        )}
      </Button>

      {classifying && total > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">
            Processando {processed} de {total} operações...
          </div>
          <Progress value={progress} />
        </div>
      )}
    </div>
  );
};