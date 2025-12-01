import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AIClassifierProps {
  operationId: string;
  asset: string;
  result: number;
  contracts: number;
  costs: number;
  notes?: string;
  onSuccess?: (strategy: string) => void;
}

export const AIClassifier = ({ 
  operationId, 
  asset, 
  result, 
  contracts, 
  costs, 
  notes,
  onSuccess 
}: AIClassifierProps) => {
  const [classifying, setClassifying] = useState(false);

  const handleClassify = async () => {
    setClassifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("classify-strategy", {
        body: {
          operationId,
          asset,
          result,
          contracts,
          costs,
          notes: notes || "",
        },
      });

      if (error) throw error;

      if (data.success && data.strategy) {
        toast.success(`Estratégia classificada: ${data.strategy}`);
        if (onSuccess) onSuccess(data.strategy);
      } else {
        toast.error("Não foi possível classificar a estratégia");
      }
    } catch (error: any) {
      console.error("Erro na classificação:", error);
      toast.error(error.message || "Erro ao classificar com IA");
    } finally {
      setClassifying(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClassify}
            disabled={classifying}
            className="h-8 w-8 p-0"
          >
            {classifying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Classificar estratégia com IA</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};