import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const today = new Date().toISOString().split("T")[0];

    // Buscar transações recorrentes que devem ser executadas hoje
    const { data: recurring, error: recurError } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("is_active", true)
      .lte("next_execution_date", today)
      .or(`end_date.is.null,end_date.gte.${today}`);

    if (recurError) throw recurError;

    let processedCount = 0;
    const errors: string[] = [];

    for (const recur of recurring || []) {
      try {
        // Criar transação
        const { error: insertError } = await supabase
          .from("personal_finances")
          .insert([{
            user_id: recur.user_id,
            title: recur.title,
            amount: recur.amount,
            type: recur.type,
            category: recur.category,
            account_id: recur.account_id,
            description: recur.description,
            tags: recur.tags,
            transaction_date: recur.next_execution_date,
          }]);

        if (insertError) throw insertError;

        // Calcular próxima data de execução
        const nextDate = new Date(recur.next_execution_date);
        switch (recur.frequency) {
          case "daily":
            nextDate.setDate(nextDate.getDate() + 1);
            break;
          case "weekly":
            nextDate.setDate(nextDate.getDate() + 7);
            break;
          case "monthly":
            if (recur.day_of_month) {
              nextDate.setMonth(nextDate.getMonth() + 1);
              nextDate.setDate(recur.day_of_month);
            } else {
              nextDate.setMonth(nextDate.getMonth() + 1);
            }
            break;
          case "yearly":
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        }

        // Atualizar próxima execução
        const { error: updateError } = await supabase
          .from("recurring_transactions")
          .update({ next_execution_date: nextDate.toISOString().split("T")[0] })
          .eq("id", recur.id);

        if (updateError) throw updateError;

        // Criar notificação
        await supabase.from("notifications").insert([{
          user_id: recur.user_id,
          type: "recurring_executed",
          title: "Transação Recorrente Criada",
          message: `${recur.title} - R$ ${recur.amount.toFixed(2)}`,
        }]);

        processedCount++;
      } catch (error: any) {
        errors.push(`Erro ao processar recorrência ${recur.id}: ${error.message}`);
        console.error("Error processing recurring transaction:", error);
      }
    }

    console.log(`Processed ${processedCount} recurring transactions`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in process-recurring:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
