import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Transaction {
  amount: number;
  type: string;
  category: string;
  transaction_date: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("Unauthorized");
    }

    // Buscar transações dos últimos 12 meses
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: transactions, error: txError } = await supabase
      .from("personal_finances")
      .select("amount, type, category, transaction_date")
      .eq("user_id", user.id)
      .gte("transaction_date", twelveMonthsAgo.toISOString().split("T")[0])
      .order("transaction_date", { ascending: true });

    if (txError) throw txError;

    if (!transactions || transactions.length < 5) {
      return new Response(
        JSON.stringify({ 
          error: "Histórico insuficiente. Necessário pelo menos 5 transações dos últimos 12 meses." 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Preparar dados para análise
    const monthlyData: { [key: string]: { income: number; expense: number } } = {};
    
    transactions.forEach((t: Transaction) => {
      const month = t.transaction_date.substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expense: 0 };
      }
      if (t.type === "income") {
        monthlyData[month].income += Number(t.amount);
      } else {
        monthlyData[month].expense += Number(t.amount);
      }
    });

    const historicalSummary = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        balance: data.income - data.expense,
      }))
      .slice(-6);

    // Análise por categoria
    const categorySpending: { [key: string]: number } = {};
    transactions
      .filter((t: Transaction) => t.type === "expense")
      .forEach((t: Transaction) => {
        categorySpending[t.category] = (categorySpending[t.category] || 0) + Number(t.amount);
      });

    const topCategories = Object.entries(categorySpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, amount]) => ({ category: cat, total: amount }));

    // Chamar Lovable AI para previsão
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiPrompt = `Analise os dados financeiros abaixo e forneça previsões detalhadas para os próximos 3 meses:

Histórico dos últimos 6 meses:
${historicalSummary.map(m => `${m.month}: Receita R$${m.income.toFixed(2)}, Despesa R$${m.expense.toFixed(2)}, Saldo R$${m.balance.toFixed(2)}`).join("\n")}

Top 5 Categorias de Gastos:
${topCategories.map(c => `${c.category}: R$${c.total.toFixed(2)}`).join("\n")}

Com base nesses dados históricos, forneça:
1. Previsão de receitas mensais para os próximos 3 meses
2. Previsão de despesas mensais para os próximos 3 meses
3. Tendências identificadas nos gastos
4. Recomendações específicas para otimização financeira
5. Alertas sobre possíveis problemas de fluxo de caixa

Seja específico com números e datas.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um analista financeiro especializado em previsão de fluxo de caixa. Forneça análises detalhadas, específicas e acionáveis baseadas em dados históricos."
          },
          { role: "user", content: aiPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings -> Workspace -> Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const prediction = aiData.choices[0].message.content;

    console.log("Cashflow prediction generated successfully");

    return new Response(
      JSON.stringify({
        prediction,
        historical: historicalSummary,
        topCategories,
        generatedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in predict-cashflow:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
