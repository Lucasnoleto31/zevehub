import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProfitOperation {
  operation_result: number | null;
  open_time: string;
  asset: string;
  strategy_id: string | null;
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

    // Buscar operações dos últimos 12 meses
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const { data: operations, error: opsError } = await supabase
      .from("profit_operations")
      .select("operation_result, open_time, asset, strategy_id")
      .eq("user_id", user.id)
      .gte("open_time", twelveMonthsAgo.toISOString())
      .order("open_time", { ascending: true });

    if (opsError) throw opsError;

    if (!operations || operations.length < 10) {
      return new Response(
        JSON.stringify({ 
          error: "Histórico insuficiente. Necessário pelo menos 10 operações dos últimos 12 meses.",
          code: "INSUFFICIENT_DATA"
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Preparar dados para análise
    const monthlyData: { [key: string]: { profit: number; loss: number; count: number; wins: number } } = {};
    const assetPerformance: { [key: string]: { profit: number; count: number } } = {};
    
    operations.forEach((op: ProfitOperation) => {
      const month = op.open_time.substring(0, 7);
      const result = op.operation_result || 0;
      
      if (!monthlyData[month]) {
        monthlyData[month] = { profit: 0, loss: 0, count: 0, wins: 0 };
      }
      
      monthlyData[month].count++;
      if (result > 0) {
        monthlyData[month].profit += result;
        monthlyData[month].wins++;
      } else {
        monthlyData[month].loss += Math.abs(result);
      }

      // Performance por ativo
      if (!assetPerformance[op.asset]) {
        assetPerformance[op.asset] = { profit: 0, count: 0 };
      }
      assetPerformance[op.asset].profit += result;
      assetPerformance[op.asset].count++;
    });

    const historicalSummary = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        profit: data.profit,
        loss: data.loss,
        netResult: data.profit - data.loss,
        operations: data.count,
        winRate: data.count > 0 ? (data.wins / data.count * 100).toFixed(1) : "0",
      }))
      .slice(-6);

    // Top ativos por performance
    const topAssets = Object.entries(assetPerformance)
      .sort(([, a], [, b]) => b.profit - a.profit)
      .slice(0, 5)
      .map(([asset, data]) => ({ 
        asset, 
        profit: data.profit, 
        count: data.count,
        avgPerOp: data.count > 0 ? data.profit / data.count : 0
      }));

    // Calcular métricas gerais
    const totalProfit = operations.reduce((sum, op) => sum + (op.operation_result || 0), 0);
    const totalWins = operations.filter(op => (op.operation_result || 0) > 0).length;
    const winRate = (totalWins / operations.length * 100).toFixed(1);

    // Chamar Lovable AI para previsão
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiPrompt = `Analise os dados de trading abaixo e forneça previsões detalhadas para os próximos 3 meses:

Performance Geral:
- Total de operações: ${operations.length}
- Taxa de acerto: ${winRate}%
- Resultado líquido: R$${totalProfit.toFixed(2)}

Histórico dos últimos 6 meses:
${historicalSummary.map(m => `${m.month}: Ganhos R$${m.profit.toFixed(2)}, Perdas R$${m.loss.toFixed(2)}, Líquido R$${m.netResult.toFixed(2)}, ${m.operations} ops, Win Rate ${m.winRate}%`).join("\n")}

Top 5 Ativos por Performance:
${topAssets.map(a => `${a.asset}: R$${a.profit.toFixed(2)} (${a.count} ops, média R$${a.avgPerOp.toFixed(2)}/op)`).join("\n")}

Com base nesses dados históricos de trading, forneça:
1. Projeção de resultados mensais para os próximos 3 meses (valores em R$)
2. Tendências identificadas no desempenho
3. Ativos com maior potencial baseado no histórico
4. Recomendações para otimização da estratégia
5. Alertas sobre possíveis riscos identificados

Seja específico com números e datas. Formato a resposta de forma clara e organizada.`;

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
            content: "Você é um analista financeiro especializado em trading e análise de performance de operações em bolsa. Forneça análises detalhadas, específicas e acionáveis baseadas em dados históricos. Use linguagem profissional e objetiva. Sempre apresente valores em Reais (R$)."
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
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const prediction = aiData.choices[0].message.content;

    console.log("Trading cashflow prediction generated successfully");

    return new Response(
      JSON.stringify({
        prediction,
        historical: historicalSummary,
        topAssets,
        metrics: {
          totalOperations: operations.length,
          totalProfit,
          winRate: parseFloat(winRate),
        },
        generatedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in predict-trading-cashflow:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
