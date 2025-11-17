import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Plus, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
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

interface Budget {
  id: string;
  category: string;
  budget_amount: number;
  month: string;
  alert_threshold: number;
  spent_amount: number;
  percentage: number;
}

interface BudgetManagerProps {
  categories: string[];
}

export const BudgetManager = ({ categories }: BudgetManagerProps) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(
    new Date().toISOString().split("T")[0].substring(0, 7)
  );
  const [newBudget, setNewBudget] = useState({
    category: "",
    budget_amount: "",
    alert_threshold: "80",
  });

  useEffect(() => {
    loadBudgets();
    checkBudgetAlerts();
  }, [currentMonth]);

  const loadBudgets = async () => {
    try {
      const monthDate = `${currentMonth}-01`;
      
      const { data, error } = await supabase
        .from("category_budgets")
        .select("*")
        .eq("month", monthDate);

      if (error) throw error;

      // Calcular gastos para cada orçamento
      const budgetsWithSpent = await Promise.all(
        (data || []).map(async (budget) => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return { ...budget, spent_amount: 0, percentage: 0 };

          const { data: statusData } = await supabase.rpc("check_budget_status", {
            p_user_id: user.id,
            p_category: budget.category,
            p_month: monthDate,
          });

          const status = statusData?.[0];
          return {
            ...budget,
            spent_amount: status?.spent_amount || 0,
            percentage: status?.percentage || 0,
          };
        })
      );

      setBudgets(budgetsWithSpent);
    } catch (error) {
      console.error("Erro ao carregar orçamentos:", error);
      toast.error("Erro ao carregar orçamentos");
    }
  };

  const checkBudgetAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monthDate = `${currentMonth}-01`;
      const { data: budgetData } = await supabase
        .from("category_budgets")
        .select("*")
        .eq("month", monthDate);

      if (!budgetData) return;

      for (const budget of budgetData) {
        const { data: statusData } = await supabase.rpc("check_budget_status", {
          p_user_id: user.id,
          p_category: budget.category,
          p_month: monthDate,
        });

        const status = statusData?.[0];
        if (status?.should_alert) {
          // Verificar se já foi enviada notificação
          const { data: existingNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", user.id)
            .eq("type", "budget_alert")
            .eq("message", `Orçamento de ${budget.category} atingiu ${status.percentage.toFixed(0)}%`)
            .maybeSingle();

          if (!existingNotif) {
            await supabase.from("notifications").insert([{
              user_id: user.id,
              type: "budget_alert",
              title: "⚠️ Alerta de Orçamento",
              message: `Orçamento de ${budget.category} atingiu ${status.percentage.toFixed(0)}% do limite!`,
            }]);

            toast.warning(
              `Atenção: Orçamento de ${budget.category} em ${status.percentage.toFixed(0)}%`
            );
          }
        }
      }
    } catch (error) {
      console.error("Erro ao verificar alertas:", error);
    }
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const monthDate = `${currentMonth}-01`;

      const { error } = await supabase.from("category_budgets").upsert([
        {
          user_id: user.id,
          category: newBudget.category,
          budget_amount: parseFloat(newBudget.budget_amount),
          alert_threshold: parseFloat(newBudget.alert_threshold),
          month: monthDate,
        },
      ]);

      if (error) throw error;

      toast.success("Orçamento salvo com sucesso!");
      setIsDialogOpen(false);
      setNewBudget({ category: "", budget_amount: "", alert_threshold: "80" });
      loadBudgets();
    } catch (error: any) {
      console.error("Erro ao salvar orçamento:", error);
      toast.error(error.message || "Erro ao salvar orçamento");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("category_budgets")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Orçamento excluído!");
      loadBudgets();
    } catch (error) {
      console.error("Erro ao excluir orçamento:", error);
      toast.error("Erro ao excluir orçamento");
    }
  };

  const getStatusIcon = (percentage: number, threshold: number) => {
    if (percentage >= 100) return <AlertTriangle className="h-5 w-5 text-destructive" />;
    if (percentage >= threshold) return <AlertTriangle className="h-5 w-5 text-warning" />;
    return <CheckCircle2 className="h-5 w-5 text-primary" />;
  };

  const getProgressColor = (percentage: number, threshold: number) => {
    if (percentage >= 100) return "bg-destructive";
    if (percentage >= threshold) return "bg-warning";
    return "bg-primary";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Orçamentos Mensais</h3>
          <Input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="w-40"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Orçamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={newBudget.category}
                  onValueChange={(value) =>
                    setNewBudget({ ...newBudget, category: value })
                  }
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

              <div className="space-y-2">
                <Label>Valor do Orçamento</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newBudget.budget_amount}
                  onChange={(e) =>
                    setNewBudget({ ...newBudget, budget_amount: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Limite de Alerta (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={newBudget.alert_threshold}
                  onChange={(e) =>
                    setNewBudget({ ...newBudget, alert_threshold: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Você será alertado quando atingir este percentual
                </p>
              </div>

              <Button onClick={handleSave} className="w-full">
                Salvar Orçamento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingDown className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Nenhum orçamento definido para este mês.
              <br />
              Crie orçamentos para controlar seus gastos!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {budgets.map((budget) => (
            <Card key={budget.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(budget.percentage, budget.alert_threshold)}
                    {budget.category}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(budget.id)}
                  >
                    Excluir
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Gasto</span>
                    <span className="font-medium">
                      {budget.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(budget.percentage, 100)}
                    className={getProgressColor(budget.percentage, budget.alert_threshold)}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold">
                      R$ {budget.spent_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      de R$ {budget.budget_amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-muted-foreground">
                      R${" "}
                      {(budget.budget_amount - budget.spent_amount).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">disponível</p>
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
