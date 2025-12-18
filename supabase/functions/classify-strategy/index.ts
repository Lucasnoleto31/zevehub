import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operationId, asset, result, contracts, costs, notes } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obter user_id da operação
    const { data: operation, error: opError } = await supabase
      .from("trading_operations")
      .select("user_id")
      .eq("id", operationId)
      .single();

    if (opError || !operation) {
      throw new Error("Operação não encontrada");
    }

    const systemPrompt = `Você é um especialista em classificação de estratégias de trading.
Baseado nas informações da operação, classifique a estratégia utilizada.

Estratégias possíveis:
- Abertura de Posição (AP): Posição aberta no início do pregão
- Tape Reading: Leitura de fluxo de ordens
- Breakout: Rompimento de níveis importantes
- Reversão: Operação contra a tendência
- Scalping: Operações muito rápidas
- Price Action: Análise de ação do preço
- Suporte/Resistência: Operações em níveis-chave

Retorne APENAS o nome da estratégia mais provável.`;

    const userPrompt = `Ativo: ${asset}
Resultado: R$ ${result}
Contratos: ${contracts}
Custos: R$ ${costs}
Notas: ${notes || 'Sem notas'}

Qual estratégia foi utilizada?`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        throw new Error("Limite de taxa atingido. Tente novamente em alguns instantes.");
      }
      if (aiResponse.status === 402) {
        throw new Error("Créditos insuficientes. Adicione créditos em Settings → Workspace → Usage.");
      }
      throw new Error(`Erro na API de IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let classifiedStrategy = aiData.choices?.[0]?.message?.content?.trim() || "";
    
    // Validar se a resposta é uma estratégia válida (não uma mensagem de erro)
    const invalidResponses = [
      "não é possível",
      "não foi possível", 
      "informações fornecidas",
      "não são suficientes",
      "não classificado",
      "impossível determinar"
    ];
    
    const isInvalidResponse = invalidResponses.some(invalid => 
      classifiedStrategy.toLowerCase().includes(invalid)
    ) || classifiedStrategy.length > 50;
    
    if (isInvalidResponse || !classifiedStrategy) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: "Não foi possível classificar esta operação"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const confidence = 0.85; // Confiança padrão

    // Salvar log de classificação
    const { error: logError } = await supabase
      .from("ai_classification_logs")
      .insert({
        operation_id: operationId,
        classified_strategy: classifiedStrategy,
        confidence,
        model_used: "google/gemini-2.5-flash",
        user_id: operation.user_id,
      });

    if (logError) {
      console.error("Erro ao salvar log:", logError);
    }

    // Atualizar estratégia da operação
    const { error: updateError } = await supabase
      .from("trading_operations")
      .update({ strategy: classifiedStrategy })
      .eq("id", operationId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        strategy: classifiedStrategy, 
        confidence,
        success: true 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na classificação:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao classificar estratégia";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});