import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Transaction } from "@/pages/PersonalFinances";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  onSave: () => void;
}

const categories = {
  income: ["Salário", "Freelance", "Investimentos", "Outros"],
  expense: ["Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer", "Outros"],
};

export const TransactionDialog = ({
  open,
  onOpenChange,
  transaction,
  onSave,
}: TransactionDialogProps) => {
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      title: "",
      amount: "",
      type: "expense" as "income" | "expense",
      category: "",
      description: "",
      transaction_date: new Date().toISOString().split("T")[0],
    },
  });

  const selectedType = watch("type");

  useEffect(() => {
    if (transaction) {
      reset({
        title: transaction.title,
        amount: transaction.amount.toString(),
        type: transaction.type,
        category: transaction.category,
        description: transaction.description || "",
        transaction_date: transaction.transaction_date,
      });
    } else {
      reset({
        title: "",
        amount: "",
        type: "expense",
        category: "",
        description: "",
        transaction_date: new Date().toISOString().split("T")[0],
      });
    }
  }, [transaction, reset]);

  const onSubmit = async (data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const transactionData = {
        title: data.title,
        amount: parseFloat(data.amount),
        type: data.type,
        category: data.category,
        description: data.description,
        transaction_date: data.transaction_date,
        user_id: user.id,
      };

      if (transaction) {
        const { error } = await supabase
          .from("personal_finances")
          .update(transactionData)
          .eq("id", transaction.id);

        if (error) throw error;
        toast.success("Transação atualizada com sucesso");
      } else {
        const { error } = await supabase
          .from("personal_finances")
          .insert([transactionData]);

        if (error) throw error;
        toast.success("Transação criada com sucesso");
      }

      onSave();
    } catch (error) {
      console.error("Erro ao salvar transação:", error);
      toast.error("Erro ao salvar transação");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Editar Transação" : "Nova Transação"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              {...register("title", { required: true })}
              placeholder="Ex: Salário de Janeiro"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register("amount", { required: true })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction_date">Data</Label>
              <Input
                id="transaction_date"
                type="date"
                {...register("transaction_date", { required: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={selectedType}
              onValueChange={(value) => {
                setValue("type", value as "income" | "expense");
                setValue("category", "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover text-popover-foreground">
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={watch("category")}
              onValueChange={(value) => setValue("category", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-popover text-popover-foreground">
                {categories[selectedType].map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Adicione detalhes sobre esta transação"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {transaction ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
