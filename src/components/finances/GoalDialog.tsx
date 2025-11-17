import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FinancialGoal } from "@/types/finances";

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: FinancialGoal | null;
  onSave: () => void;
}

interface GoalFormData {
  goal_type: string;
  target_value: number;
  period_type: string;
  start_date: string;
  end_date: string;
}

export const GoalDialog = ({ open, onOpenChange, goal, onSave }: GoalDialogProps) => {
  const { register, handleSubmit, reset, setValue, watch } = useForm<GoalFormData>();
  const periodType = watch("period_type");

  useEffect(() => {
    if (goal) {
      reset({
        goal_type: goal.goal_type,
        target_value: goal.target_value,
        period_type: goal.period_type,
        start_date: goal.start_date,
        end_date: goal.end_date,
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      reset({
        goal_type: 'savings',
        target_value: 0,
        period_type: 'monthly',
        start_date: today,
        end_date: today,
      });
    }
  }, [goal, reset]);

  useEffect(() => {
    const startDate = watch("start_date");
    if (startDate && periodType) {
      const start = new Date(startDate);
      let end = new Date(start);

      switch (periodType) {
        case 'monthly':
          end.setMonth(end.getMonth() + 1);
          break;
        case 'quarterly':
          end.setMonth(end.getMonth() + 3);
          break;
        case 'yearly':
          end.setFullYear(end.getFullYear() + 1);
          break;
      }

      setValue("end_date", end.toISOString().split('T')[0]);
    }
  }, [periodType, watch("start_date")]);

  const onSubmit = async (data: GoalFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (goal) {
        const { error } = await supabase
          .from("trading_goals")
          .update(data)
          .eq("id", goal.id);

        if (error) throw error;
        toast.success("Meta atualizada com sucesso");
      } else {
        const { error } = await supabase
          .from("trading_goals")
          .insert([{ ...data, user_id: user.id }]);

        if (error) throw error;
        toast.success("Meta criada com sucesso");
      }

      onSave();
    } catch (error) {
      console.error("Erro ao salvar meta:", error);
      toast.error("Erro ao salvar meta");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{goal ? "Editar Meta" : "Nova Meta Financeira"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal_type">Tipo de Meta</Label>
            <Select
              defaultValue={goal?.goal_type || 'savings'}
              onValueChange={(value) => setValue("goal_type", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="savings">Economia</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense_limit">Limite de Gastos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_value">Valor Meta (R$)</Label>
            <Input
              id="target_value"
              type="number"
              step="0.01"
              {...register("target_value", { required: true, valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="period_type">Período</Label>
            <Select
              defaultValue={goal?.period_type || 'monthly'}
              onValueChange={(value) => setValue("period_type", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data Início</Label>
              <Input
                id="start_date"
                type="date"
                {...register("start_date", { required: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Data Fim</Label>
              <Input
                id="end_date"
                type="date"
                {...register("end_date", { required: true })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {goal ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
