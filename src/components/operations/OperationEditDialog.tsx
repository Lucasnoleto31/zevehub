import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface Strategy {
  id: string;
  name: string;
}

interface OperationEditDialogProps {
  operation: Operation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export const OperationEditDialog = ({ operation, open, onOpenChange, userId }: OperationEditDialogProps) => {
  const [formData, setFormData] = useState({
    operation_date: "",
    operation_time: "",
    asset: "",
    strategy: "",
    contracts: "",
    costs: "",
    result: "",
    notes: "",
  });
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (operation) {
      setFormData({
        operation_date: operation.operation_date,
        operation_time: operation.operation_time,
        asset: operation.asset,
        strategy: operation.strategy || "",
        contracts: operation.contracts.toString(),
        costs: operation.costs.toString(),
        result: operation.result.toString(),
        notes: operation.notes || "",
      });
    }
  }, [operation]);

  useEffect(() => {
    loadStrategies();
  }, [userId]);

  const loadStrategies = async () => {
    try {
      const { data, error } = await supabase
        .from("strategies")
        .select("id, name")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (error) throw error;
      setStrategies(data || []);
    } catch (error) {
      console.error("Erro ao carregar estratégias:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!operation) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("trading_operations")
        .update({
          operation_date: formData.operation_date,
          operation_time: formData.operation_time,
          asset: formData.asset,
          strategy: formData.strategy || null,
          contracts: parseInt(formData.contracts),
          costs: parseFloat(formData.costs),
          result: parseFloat(formData.result),
          notes: formData.notes,
        })
        .eq("id", operation.id);

      if (error) throw error;

      toast.success("Operação atualizada com sucesso!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao atualizar operação:", error);
      toast.error(error.message || "Erro ao atualizar operação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Operação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-date">Data</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.operation_date}
                onChange={(e) => setFormData({ ...formData, operation_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-time">Horário</Label>
              <Input
                id="edit-time"
                type="time"
                value={formData.operation_time}
                onChange={(e) => setFormData({ ...formData, operation_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-asset">Ativo</Label>
            <Input
              id="edit-asset"
              value={formData.asset}
              onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
              placeholder="Ex: WINJ25, WDOJ25"
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-strategy">Estratégia</Label>
            <Select
              value={formData.strategy}
              onValueChange={(value) => setFormData({ ...formData, strategy: value })}
            >
              <SelectTrigger id="edit-strategy">
                <SelectValue placeholder="Selecione uma estratégia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem estratégia</SelectItem>
                {strategies.map((strategy) => (
                  <SelectItem key={strategy.id} value={strategy.name}>
                    {strategy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="edit-contracts">Contratos</Label>
              <Input
                id="edit-contracts"
                type="number"
                value={formData.contracts}
                onChange={(e) => setFormData({ ...formData, contracts: e.target.value })}
                min="1"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-costs">Custos (R$)</Label>
              <Input
                id="edit-costs"
                type="number"
                step="0.01"
                value={formData.costs}
                onChange={(e) => setFormData({ ...formData, costs: e.target.value })}
                min="0"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-result">Resultado (R$)</Label>
              <Input
                id="edit-result"
                type="number"
                step="0.01"
                value={formData.result}
                onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                className={parseFloat(formData.result) >= 0 ? "text-success" : "text-destructive"}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-notes">Observações</Label>
            <Textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações sobre a operação..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
