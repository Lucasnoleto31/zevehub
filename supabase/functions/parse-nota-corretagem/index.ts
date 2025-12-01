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
    const { fileContent, userId } = await req.json();
    
    if (!fileContent || !userId) {
      throw new Error("Conteúdo do arquivo e userId são obrigatórios");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const systemPrompt = `Você é um especialista em extrair dados de notas de corretagem brasileiras.
Analise o texto fornecido e extraia TODAS as operações realizadas.

Para cada operação, retorne um objeto JSON com:
{
  "ticker": "código do ativo",
  "type": "C" ou "V" (Compra ou Venda),
  "qty": quantidade de contratos,
  "price": preço médio,
  "result": resultado líquido (positivo para lucro, negativo para prejuízo),
  "date": "YYYY-MM-DD",
  "time": "HH:MM:SS"
}

Retorne um array JSON com todas as operações encontradas.
Se não encontrar operações, retorne um array vazio.
Responda APENAS com o JSON válido, sem texto adicional.`;

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
          { role: "user", content: fileContent },
        ],
        temperature: 0.1,
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
    let parsedOperations = [];
    
    try {
      const content = aiData.choices?.[0]?.message?.content || "[]";
      // Tentar extrair JSON do texto (caso venha com markdown)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      parsedOperations = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Erro ao parsear resposta da IA:", e);
      throw new Error("Não foi possível extrair operações do documento");
    }

    // Inserir operações no banco
    const operationsToInsert = parsedOperations.map((op: any) => ({
      user_id: userId,
      asset: op.ticker || "UNKNOWN",
      operation_date: op.date || new Date().toISOString().split('T')[0],
      operation_time: op.time || "09:00:00",
      contracts: parseInt(op.qty) || 1,
      costs: 0,
      result: parseFloat(op.result) || 0,
      notes: `Importado automaticamente. Tipo: ${op.type}. Preço: ${op.price}`,
      raw_note: fileContent.substring(0, 500), // Guardar parte do texto original
      risk_level: Math.abs(parseFloat(op.result)) > 300 ? "ALTO" : "MEDIO",
    }));

    if (operationsToInsert.length > 0) {
      const { data, error } = await supabase
        .from("trading_operations")
        .insert(operationsToInsert)
        .select();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          operations: data,
          count: data.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Nenhuma operação encontrada no documento",
          operations: [],
          count: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Erro no parse:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao processar nota de corretagem";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});