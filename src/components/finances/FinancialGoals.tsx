import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, TrendingUp, Calendar } from "lucide-react";
import { GoalDialog } from "./GoalDialog";
import { toast } from "sonner";
import { FinancialGoal } from "@/types/finances";

export const FinancialGoals = () => {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [currentProgress, setCurrentProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("trading_goals")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const goalsData = (data || []) as FinancialGoal[];
      setGoals(goalsData);
      
      // Calcular progresso para cada meta
      for (const goal of goalsData) {
        await calculateProgress(goal);
      }
    } catch (error) {
      console.error("Erro ao carregar metas:", error);
      toast.error("Erro ao carregar metas");
    }
  };

  const calculateProgress = async (goal: FinancialGoal) => {
    try {
      const { data, error } = await supabase
        .from("personal_finances")
        .select("amount, type")
        .gte("transaction_date", goal.start_date)
        .lte("transaction_date", goal.end_date);

      if (error) throw error;

      let current = 0;
      if (goal.goal_type === 'savings') {
        const income = data?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const expense = data?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        current = income - expense;
      } else if (goal.goal_type === 'income') {
        current = data?.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      } else if (goal.goal_type === 'expense_limit') {
        current = data?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      }

      setCurrentProgress(prev => ({ ...prev, [goal.id]: current }));
    } catch (error) {
      console.error("Erro ao calcular progresso:", error);
    }
  };

  const handleEdit = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setIsDialogOpen(true);
  };


  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("trading_goals")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Meta arquivada com sucesso");
      loadGoals();
    } catch (error) {
      console.error("Erro ao arquivar meta:", error);
      toast.error("Erro ao arquivar meta");
    }
  };

  const getGoalTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      savings: 'Economia',
      income: 'Receita',
      expense_limit: 'Limite de Gastos'
    };
    return labels[type] || type;
  };

  const getPeriodLabel = (type: string) => {
    const labels: Record<string, string> = {
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      yearly: 'Anual'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Metas Financeiras</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Meta
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Você ainda não tem metas financeiras.
              <br />
              Crie sua primeira meta para começar!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map(goal => {
            const progress = currentProgress[goal.id] || 0;
            const percentage = (progress / goal.target_value) * 100;
            const isExpenseLimit = goal.goal_type === 'expense_limit';
            const progressColor = isExpenseLimit 
              ? percentage > 100 ? 'bg-destructive' : 'bg-primary'
              : 'bg-primary';

            return (
              <Card key={goal.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{getGoalTypeLabel(goal.goal_type)}</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        {getPeriodLabel(goal.period_type)}
                      </p>
                    </div>
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={Math.min(percentage, 100)} className={progressColor} />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold">
                        R$ {progress.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        de R$ {goal.target_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(goal)}>
                        Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(goal.id)}>
                        Arquivar
                      </Button>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {new Date(goal.start_date).toLocaleDateString('pt-BR')} - {new Date(goal.end_date).toLocaleDateString('pt-BR')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GoalDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingGoal(null);
        }}
        goal={editingGoal}
        onSave={loadGoals}
      />
    </div>
  );
};
