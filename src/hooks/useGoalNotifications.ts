import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useGoalNotifications = () => {
  useEffect(() => {
    const checkGoalsProgress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Buscar metas ativas
        const { data: goals, error: goalsError } = await supabase
          .from("trading_goals")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true);

        if (goalsError) throw goalsError;

        // Buscar transações do período
        const { data: transactions, error: txError } = await supabase
          .from("personal_finances")
          .select("*")
          .eq("user_id", user.id);

        if (txError) throw txError;

        goals?.forEach(async (goal) => {
          const relevantTransactions = transactions?.filter((t) => {
            const txDate = new Date(t.transaction_date);
            const startDate = new Date(goal.start_date);
            const endDate = new Date(goal.end_date);
            return txDate >= startDate && txDate <= endDate;
          });

          const total = relevantTransactions?.reduce((sum, t) => {
            if (goal.goal_type === "profit") {
              return sum + (t.type === "income" ? Number(t.amount) : -Number(t.amount));
            } else {
              return sum + (t.type === "income" ? Number(t.amount) : 0);
            }
          }, 0) || 0;

          const progress = (total / goal.target_value) * 100;

          // Notificar quando atingir 100%
          if (progress >= 100) {
            const { data: existingNotif } = await supabase
              .from("notifications")
              .select("id")
              .eq("user_id", user.id)
              .eq("type", "goal_achieved")
              .eq("message", `Meta de ${goal.goal_type === 'profit' ? 'lucro' : 'economia'} atingida!`)
              .single();

            if (!existingNotif) {
              await supabase.from("notifications").insert([{
                user_id: user.id,
                type: "goal_achieved",
                title: "🎉 Meta Atingida!",
                message: `Parabéns! Você atingiu sua meta de ${goal.goal_type === 'profit' ? 'lucro' : 'economia'} de R$ ${goal.target_value.toFixed(2)}!`,
              }]);

              toast.success(`🎉 Meta atingida! R$ ${goal.target_value.toFixed(2)}`);
            }
          }
          // Notificar quando ultrapassar 100%
          else if (progress > 100) {
            const { data: existingNotif } = await supabase
              .from("notifications")
              .select("id")
              .eq("user_id", user.id)
              .eq("type", "goal_exceeded")
              .eq("message", `Meta de ${goal.goal_type === 'profit' ? 'lucro' : 'economia'} ultrapassada!`)
              .single();

            if (!existingNotif) {
              await supabase.from("notifications").insert([{
                user_id: user.id,
                type: "goal_exceeded",
                title: "🚀 Meta Ultrapassada!",
                message: `Incrível! Você ultrapassou sua meta de ${goal.goal_type === 'profit' ? 'lucro' : 'economia'}! Atual: R$ ${total.toFixed(2)}`,
              }]);

              toast.success(`🚀 Meta ultrapassada! R$ ${total.toFixed(2)}`);
            }
          }
        });
      } catch (error) {
        console.error("Erro ao verificar metas:", error);
      }
    };

    // Verificar ao montar o componente
    checkGoalsProgress();

    // Verificar periodicamente (a cada 5 minutos)
    const interval = setInterval(checkGoalsProgress, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
};
