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

    // Detectar corretora baseado no conteúdo
    const brokersPatterns = {
      clear: /clear|clear corretora/i,
      xp: /xp investimentos|xp corretora/i,
      btg: /btg pactual/i,
      modal: /modal mais/i,
      rico: /rico corretora/i,
      inter: /inter dtvm/i,
      ativa: /ativa investimentos/i,
      genial: /genial investimentos/i,
    };

    let detectedBroker = "generic";
    for (const [broker, pattern] of Object.entries(brokersPatterns)) {
      if (pattern.test(fileContent)) {
        detectedBroker = broker;
        break;
      }
    }

    const systemPrompt = `Você é um especialista em extrair dados de notas de corretagem brasileiras.
Analise o texto fornecido e extraia TODAS as operações realizadas.

IMPORTANTE - Formato da corretora detectada: ${detectedBroker.toUpperCase()}

TEMPLATES POR CORRETORA:

CLEAR CORRETAGEM:
- Procure seções com "Negócios realizados" ou "Q Negociação"
- Formato comum: [Data] [Hora] [C/V] [Ativo] [Quantidade] [Preço]
- Custos: Taxa de liquidação, Emolumentos, Taxa de Termo/Opções

XP INVESTIMENTOS:
- Procure "Resumo dos Negócios" ou "Movimentação"
- Formato: Código negociação | C/V | Tipo mercado | Quantidade | Preço
- Total líquido geralmente no final

BTG PACTUAL:
- Seção "Negócios realizados em bolsa"
- Formato tabular com colunas bem definidas
- Custos separados em "Resumo financeiro"

MODAL MAIS:
- Busque "Nota de Negociação" ou "Negócios realizados"
- Formato: Título | Tipo | Qtde | Preço | Valor
- Custos em "Resumo dos negócios"

RICO CORRETORA:
- Procure "Negócios" ou "Operações"
- Formato similar à Clear
- Taxa de corretagem destacada

PADRÕES GERAIS:
- Datas no formato DD/MM/YYYY ou DD/MM/AA
- Horários no formato HH:MM ou HH:MM:SS
- Ativos: geralmente 4-6 caracteres (WDOQ24, WING24, etc)
- C = Compra, V = Venda
- Valores com vírgula decimal (R$ 1.234,56)

Para cada operação, retorne um objeto JSON com:
{
  "ticker": "código do ativo (ex: WDOQ24)",
  "type": "C" ou "V" (Compra ou Venda)",
  "qty": quantidade de contratos (número inteiro),
  "price": preço médio (número decimal),
  "result": resultado líquido após custos (positivo para lucro, negativo para prejuízo),
  "date": "YYYY-MM-DD",
  "time": "HH:MM:SS",
  "broker": "${detectedBroker}",
  "costs": valor total dos custos (número decimal)
}

CÁLCULO DO RESULTADO:
- Para COMPRA: result = (preço_venda - preço_compra) * quantidade - custos_totais
- Para VENDA: result = (preço_compra - preço_venda) * quantidade - custos_totais
- Se não conseguir calcular o resultado exato, estime baseado nos valores da nota

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

    // Preparar operações para preview (não inserir ainda)
    const operationsPreview = parsedOperations.map((op: any) => ({
      ticker: op.ticker || "UNKNOWN",
      type: op.type || "C",
      qty: parseInt(op.qty) || 1,
      price: parseFloat(op.price) || 0,
      result: parseFloat(op.result) || 0,
      date: op.date || new Date().toISOString().split('T')[0],
      time: op.time || "09:00:00",
      broker: op.broker || detectedBroker,
      costs: parseFloat(op.costs) || 0,
      risk_level: Math.abs(parseFloat(op.result)) > 300 ? "ALTO" : "MEDIO",
      notes: `Importado via ${detectedBroker}. Tipo: ${op.type}. Preço: R$ ${op.price}`,
    }));

    return new Response(
      JSON.stringify({ 
        success: true,
        operations: operationsPreview,
        count: operationsPreview.length,
        broker: detectedBroker,
        preview: true, // Indica que é preview, não foi salvo ainda
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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