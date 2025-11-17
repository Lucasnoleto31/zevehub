import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Repeat, Trash2, Pause, Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";

const recurringSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(200),
  amount: z.number().positive("Valor deve ser positivo"),
  type: z.enum(["income", "expense"]),
  category: z.string().trim().min(1, "Categoria obrigatória").max(100),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  day_of_month: z.number().min(1).max(31).optional(),
});

interface RecurringTransaction {
  id: string;
  title: string;
  amount: number;
  type: string;
  category: string;
  frequency: string;
  next_execution_date: string;
  is_active: boolean;
  description?: string;
}

export const RecurringManager = () => {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [newRecurring, setNewRecurring] = useState({
    title: "",
    amount: "",
    type: "expense" as "income" | "expense",
    category: "",
    frequency: "monthly",
    start_date: new Date().toISOString().split("T")[0],
    day_of_month: "",
    description: "",
    tags: "",
  });

  useEffect(() => {
    loadRecurring();
    loadCategories();
  }, []);

  const loadRecurring = async () => {
    try {
      const { data, error } = await supabase
        .from("recurring_transactions")
        .select("*")
        .order("next_execution_date");

      if (error) throw error;
      setRecurring(data || []);
    } catch (error) {
      console.error("Erro ao carregar recorrentes:", error);
      toast.error("Erro ao carregar transações recorrentes");
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("finance_categories")
        .select("name, type")
        .order("name");

      if (error) throw error;
      setCategories(data?.map(c => c.name) || []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const validated = recurringSchema.parse({
        title: newRecurring.title,
        amount: parseFloat(newRecurring.amount),
        type: newRecurring.type,
        category: newRecurring.category,
        frequency: newRecurring.frequency,
        start_date: newRecurring.start_date,
        day_of_month: newRecurring.day_of_month ? parseInt(newRecurring.day_of_month) : undefined,
      });

      const tags = newRecurring.tags
        ? newRecurring.tags.split(",").map(t => t.trim()).filter(Boolean)
        : null;

      const { error } = await supabase.from("recurring_transactions").insert([{
        user_id: user.id,
        title: validated.title,
        amount: validated.amount,
        type: validated.type,
        category: validated.category,
        frequency: validated.frequency,
        start_date: validated.start_date,
        day_of_month: validated.day_of_month,
        description: newRecurring.description || null,
        tags,
        next_execution_date: newRecurring.start_date,
      }]);

      if (error) throw error;

      toast.success("Transação recorrente criada com sucesso!");
      setIsDialogOpen(false);
      setNewRecurring({
        title: "",
        amount: "",
        type: "expense",
        category: "",
        frequency: "monthly",
        start_date: new Date().toISOString().split("T")[0],
        day_of_month: "",
        description: "",
        tags: "",
      });
      loadRecurring();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Erro ao salvar transação recorrente");
      }
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("recurring_transactions")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(currentStatus ? "Recorrência pausada" : "Recorrência ativada");
      loadRecurring();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("recurring_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Transação recorrente excluída");
      loadRecurring();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir transação recorrente");
    }
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      daily: "Diária",
      weekly: "Semanal",
      monthly: "Mensal",
      yearly: "Anual",
    };
    return labels[freq] || freq;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Transações Recorrentes</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Recorrência
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Transação Recorrente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  placeholder="Ex: Aluguel"
                  value={newRecurring.title}
                  onChange={(e) => setNewRecurring({ ...newRecurring, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newRecurring.amount}
                    onChange={(e) => setNewRecurring({ ...newRecurring, amount: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={newRecurring.type}
                    onValueChange={(v: "income" | "expense") => setNewRecurring({ ...newRecurring, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Receita</SelectItem>
                      <SelectItem value="expense">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={newRecurring.category}
                  onValueChange={(v) => setNewRecurring({ ...newRecurring, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={newRecurring.frequency}
                    onValueChange={(v) => setNewRecurring({ ...newRecurring, frequency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diária</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newRecurring.frequency === "monthly" && (
                  <div className="space-y-2">
                    <Label>Dia do Mês</Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="5"
                      value={newRecurring.day_of_month}
                      onChange={(e) => setNewRecurring({ ...newRecurring, day_of_month: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={newRecurring.start_date}
                  onChange={(e) => setNewRecurring({ ...newRecurring, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  placeholder="Informações adicionais"
                  value={newRecurring.description}
                  onChange={(e) => setNewRecurring({ ...newRecurring, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags (opcional)</Label>
                <Input
                  placeholder="Ex: fixo, essencial (separadas por vírgula)"
                  value={newRecurring.tags}
                  onChange={(e) => setNewRecurring({ ...newRecurring, tags: e.target.value })}
                />
              </div>

              <Button onClick={handleSave} className="w-full">
                Criar Recorrência
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {recurring.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Repeat className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhuma transação recorrente configurada.
              <br />
              Crie recorrências para automatizar suas finanças!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {recurring.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Repeat className={`h-5 w-5 ${item.is_active ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={item.type === "income" ? "default" : "destructive"}>
                        {item.type === "income" ? "Receita" : "Despesa"}
                      </Badge>
                      <Badge variant="outline">{getFrequencyLabel(item.frequency)}</Badge>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Próxima execução:{" "}
                      {new Date(item.next_execution_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className={`text-lg font-bold ${item.type === "income" ? "text-primary" : "text-destructive"}`}>
                    R$ {item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(item.id, item.is_active)}
                    >
                      {item.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
