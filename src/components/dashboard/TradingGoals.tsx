import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Target, TrendingUp, CheckCircle2, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

interface Goal {
  id: string;
  period_type: string;
  goal_type: string;
  target_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface GoalProgress {
  goal: Goal;
  current_value: number;
  progress_percentage: number;
}

const TradingGoals = ({ userId }: { userId: string }) => {
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    period_type: "daily",
    goal_type: "profit",
    target_value: 0,
  });

  useEffect(() => {
    loadGoals();
  }, [userId]);

  const loadGoals = async () => {
    try {
      const { data: goalsData, error } = await supabase
        .from("trading_goals")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (goalsData) {
        const goalsWithProgress = await Promise.all(
          goalsData.map(async (goal) => {
            const progress = await calculateProgress(goal);
            return progress;
          })
        );
        setGoals(goalsWithProgress);
      }
    } catch (error) {
      console.error("Erro ao carregar metas:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = async (goal: Goal): Promise<GoalProgress> => {
    try {
      const { data: operations, error } = await supabase
        .from("trading_operations")
        .select("result, operation_date")
        .gte("operation_date", goal.start_date)
        .lte("operation_date", goal.end_date);

      if (error) throw error;

      let current_value = 0;

      if (goal.goal_type === "profit") {
        current_value = operations?.reduce((sum, op) => sum + (op.result || 0), 0) || 0;
      } else if (goal.goal_type === "operations") {
        current_value = operations?.length || 0;
      } else if (goal.goal_type === "win_rate") {
        const wins = operations?.filter((op) => op.result > 0).length || 0;
        const total = operations?.length || 0;
        current_value = total > 0 ? (wins / total) * 100 : 0;
      }

      const progress_percentage = (current_value / goal.target_value) * 100;

      return {
        goal,
        current_value,
        progress_percentage: Math.min(progress_percentage, 100),
      };
    } catch (error) {
      console.error("Erro ao calcular progresso:", error);
      return {
        goal,
        current_value: 0,
        progress_percentage: 0,
      };
    }
  };

  const createGoal = async () => {
    try {
      const now = new Date();
      let start_date, end_date;

      if (newGoal.period_type === "daily") {
        start_date = format(startOfDay(now), "yyyy-MM-dd");
        end_date = format(endOfDay(now), "yyyy-MM-dd");
      } else if (newGoal.period_type === "weekly") {
        start_date = format(startOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd");
        end_date = format(endOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd");
      } else {
        start_date = format(startOfMonth(now), "yyyy-MM-dd");
        end_date = format(endOfMonth(now), "yyyy-MM-dd");
      }

      const { error } = await supabase.from("trading_goals").insert({
        user_id: userId,
        ...newGoal,
        start_date,
        end_date,
      });

      if (error) throw error;

      toast.success("Meta criada com sucesso!");
      setShowForm(false);
      setNewGoal({ period_type: "daily", goal_type: "profit", target_value: 0 });
      loadGoals();
    } catch (error) {
      console.error("Erro ao criar meta:", error);
      toast.error("Erro ao criar meta");
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from("trading_goals")
        .update({ is_active: false })
        .eq("id", goalId);

      if (error) throw error;

      toast.success("Meta removida!");
      loadGoals();
    } catch (error) {
      console.error("Erro ao remover meta:", error);
      toast.error("Erro ao remover meta");
    }
  };

  const getGoalTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      profit: "Lucro",
      win_rate: "Win Rate",
      operations: "Operações",
    };
    return labels[type] || type;
  };

  const getPeriodTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      daily: "Diária",
      weekly: "Semanal",
      monthly: "Mensal",
    };
    return labels[type] || type;
  };

  const formatValue = (goal: Goal, value: number) => {
    if (goal.goal_type === "profit") {
      return `R$ ${value.toFixed(2)}`;
    } else if (goal.goal_type === "win_rate") {
      return `${value.toFixed(1)}%`;
    } else {
      return value.toString();
    }
  };

  if (loading) {
    return <Card className="animate-fade-in"><CardContent className="p-6">Carregando...</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Metas de Trading
              </CardTitle>
              <CardDescription>Defina e acompanhe suas metas diárias, semanais e mensais</CardDescription>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancelar" : "Nova Meta"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showForm && (
            <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select
                    value={newGoal.period_type}
                    onValueChange={(value) => setNewGoal({ ...newGoal, period_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diária</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Meta</Label>
                  <Select
                    value={newGoal.goal_type}
                    onValueChange={(value) => setNewGoal({ ...newGoal, goal_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="profit">Lucro (R$)</SelectItem>
                      <SelectItem value="win_rate">Win Rate (%)</SelectItem>
                      <SelectItem value="operations">Número de Operações</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor Alvo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newGoal.target_value}
                    onChange={(e) => setNewGoal({ ...newGoal, target_value: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <Button onClick={createGoal} className="w-full">Criar Meta</Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Nenhuma meta ativa. Crie uma meta para começar!
              </div>
            )}
            {goals.map((goalProgress) => (
              <Card key={goalProgress.goal.id} className="glass-card-strong">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {getPeriodTypeLabel(goalProgress.goal.period_type)}
                      </Badge>
                      <CardTitle className="text-lg">
                        {getGoalTypeLabel(goalProgress.goal.goal_type)}
                      </CardTitle>
                    </div>
                    {goalProgress.progress_percentage >= 100 && (
                      <CheckCircle2 className="w-6 h-6 text-success" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-bold">
                      {formatValue(goalProgress.goal, goalProgress.current_value)} /{" "}
                      {formatValue(goalProgress.goal, goalProgress.goal.target_value)}
                    </span>
                  </div>
                  <Progress value={goalProgress.progress_percentage} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(goalProgress.goal.start_date), "dd/MM")} -{" "}
                      {format(new Date(goalProgress.goal.end_date), "dd/MM")}
                    </div>
                    <span className="font-semibold">{goalProgress.progress_percentage.toFixed(0)}%</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => deleteGoal(goalProgress.goal.id)}
                  >
                    Remover Meta
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradingGoals;
