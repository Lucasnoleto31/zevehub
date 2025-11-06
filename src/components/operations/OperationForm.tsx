import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { z } from "zod";

const operationSchema = z.object({
  operation_date: z.string().min(1, "Data obrigatória"),
  operation_time: z.string().min(1, "Horário obrigatório"),
  asset: z.string().min(1, "Ativo obrigatório"),
  contracts: z.number().min(1, "Contratos deve ser maior que 0"),
  costs: z.number().min(0, "Custos deve ser 0 ou maior"),
  result: z.number(),
});

interface OperationFormProps {
  userId: string;
}

interface Strategy {
  id: string;
  name: string;
}

const OperationForm = ({ userId }: OperationFormProps) => {
  const [loading, setLoading] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [formData, setFormData] = useState({
    operation_date: new Date().toISOString().split("T")[0],
    operation_time: new Date().toTimeString().slice(0, 5),
    asset: "",
    contracts: "",
    costs: "",
    result: "",
    notes: "",
    strategy: "",
  });

  useEffect(() => {
    loadStrategies();
  }, [userId]);

  const loadStrategies = async () => {
    try {
      const { data, error } = await supabase
        .from('strategies')
        .select('id, name')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStrategies(data || []);
    } catch (error) {
      console.error('Erro ao carregar estratégias:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = operationSchema.parse({
        operation_date: formData.operation_date,
        operation_time: formData.operation_time,
        asset: formData.asset,
        contracts: parseInt(formData.contracts),
        costs: parseFloat(formData.costs) || 0,
        result: parseFloat(formData.result),
      });

      const { error } = await supabase.from("trading_operations").insert([{
        user_id: userId,
        operation_date: validatedData.operation_date,
        operation_time: validatedData.operation_time,
        asset: validatedData.asset,
        contracts: validatedData.contracts,
        costs: validatedData.costs,
        result: validatedData.result,
        notes: formData.notes,
        strategy: formData.strategy || null,
      }]);

      if (error) throw error;

      toast.success("Operação registrada com sucesso!");
      
      // Limpar formulário
      setFormData({
        operation_date: new Date().toISOString().split("T")[0],
        operation_time: new Date().toTimeString().slice(0, 5),
        asset: "",
        contracts: "",
        costs: "",
        result: "",
        notes: "",
        strategy: "",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Erro ao registrar operação:", error);
        toast.error(error.message || "Erro ao registrar operação");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="operation_date">Data</Label>
        <Input
          id="operation_date"
          type="date"
          value={formData.operation_date}
          onChange={(e) => setFormData({ ...formData, operation_date: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="operation_time">Horário</Label>
        <Input
          id="operation_time"
          type="time"
          value={formData.operation_time}
          onChange={(e) => setFormData({ ...formData, operation_time: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="asset">Ativo</Label>
        <Input
          id="asset"
          type="text"
          placeholder="Ex: WINZ24, WDOZ24"
          value={formData.asset}
          onChange={(e) => setFormData({ ...formData, asset: e.target.value.toUpperCase() })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="strategy">Estratégia/Robô</Label>
        <Select value={formData.strategy} onValueChange={(value) => setFormData({ ...formData, strategy: value === "none" ? "" : value })}>
          <SelectTrigger id="strategy">
            <SelectValue placeholder="Selecione uma estratégia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhuma</SelectItem>
            {strategies.map((strategy) => (
              <SelectItem key={strategy.id} value={strategy.name}>
                {strategy.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contracts">Contratos</Label>
        <Input
          id="contracts"
          type="number"
          min="1"
          placeholder="Quantidade de contratos"
          value={formData.contracts}
          onChange={(e) => setFormData({ ...formData, contracts: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="costs">Custos (R$)</Label>
        <Input
          id="costs"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={formData.costs}
          onChange={(e) => setFormData({ ...formData, costs: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="result">Resultado (R$)</Label>
        <Input
          id="result"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={formData.result}
          onChange={(e) => setFormData({ ...formData, result: e.target.value })}
          required
          className={
            formData.result
              ? parseFloat(formData.result) >= 0
                ? "border-success"
                : "border-destructive"
              : ""
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          placeholder="Anotações sobre a operação..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Registrar Operação
          </>
        )}
      </Button>
    </form>
  );
};

export default OperationForm;
