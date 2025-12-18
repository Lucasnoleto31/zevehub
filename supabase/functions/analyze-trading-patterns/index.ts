import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Operation {
  operation_date: string;
  operation_time: string;
  result: number;
  strategy?: string;
}

interface AnalysisData {
  totalOperations: number;
  winRate: number;
  totalResult: number;
  bestHour: { hour: number; winRate: number; avgResult: number };
  worstHour: { hour: number; winRate: number; avgResult: number };
  bestDay: { day: string; winRate: number; avgResult: number };
  worstDay: { day: string; winRate: number; avgResult: number };
  bestStrategy: { name: string; winRate: number; avgResult: number } | null;
  worstStrategy: { name: string; winRate: number; avgResult: number } | null;
  avgRecoveryAfterLoss: number;
  recoveryRate: number;
  maxWinStreak: number;
  maxLossStreak: number;
  avgResultAfterWinStreak: number;
  avgResultAfterLossStreak: number;
  morningPerformance: { winRate: number; avgResult: number; operations: number };
  afternoonPerformance: { winRate: number; avgResult: number; operations: number };
}

function analyzeOperations(operations: Operation[]): AnalysisData {
  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  
  // Group by hour
  const hourStats: Record<number, { wins: number; total: number; result: number }> = {};
  // Group by day
  const dayStats: Record<number, { wins: number; total: number; result: number }> = {};
  // Group by strategy
  const strategyStats: Record<string, { wins: number; total: number; result: number }> = {};
  // Morning vs Afternoon
  let morningWins = 0, morningTotal = 0, morningResult = 0;
  let afternoonWins = 0, afternoonTotal = 0, afternoonResult = 0;

  // Daily results for streaks and recovery
  const dailyResults: Record<string, number> = {};

  operations.forEach(op => {
    const hour = parseInt(op.operation_time.split(":")[0]);
    const [year, month, day] = op.operation_date.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const isWin = op.result > 0;

    // Hour stats
    if (!hourStats[hour]) hourStats[hour] = { wins: 0, total: 0, result: 0 };
    hourStats[hour].total++;
    if (isWin) hourStats[hour].wins++;
    hourStats[hour].result += op.result;

    // Day stats
    if (!dayStats[dayOfWeek]) dayStats[dayOfWeek] = { wins: 0, total: 0, result: 0 };
    dayStats[dayOfWeek].total++;
    if (isWin) dayStats[dayOfWeek].wins++;
    dayStats[dayOfWeek].result += op.result;

    // Strategy stats
    if (op.strategy) {
      if (!strategyStats[op.strategy]) strategyStats[op.strategy] = { wins: 0, total: 0, result: 0 };
      strategyStats[op.strategy].total++;
      if (isWin) strategyStats[op.strategy].wins++;
      strategyStats[op.strategy].result += op.result;
    }

    // Morning (before 12h) vs Afternoon
    if (hour < 12) {
      morningTotal++;
      if (isWin) morningWins++;
      morningResult += op.result;
    } else {
      afternoonTotal++;
      if (isWin) afternoonWins++;
      afternoonResult += op.result;
    }

    // Daily results
    if (!dailyResults[op.operation_date]) dailyResults[op.operation_date] = 0;
    dailyResults[op.operation_date] += op.result;
  });

  // Find best/worst hour
  let bestHour = { hour: 0, winRate: 0, avgResult: 0 };
  let worstHour = { hour: 0, winRate: 100, avgResult: Infinity };
  
  Object.entries(hourStats).forEach(([hour, stats]) => {
    if (stats.total >= 5) {
      const winRate = (stats.wins / stats.total) * 100;
      const avgResult = stats.result / stats.total;
      if (winRate > bestHour.winRate || (winRate === bestHour.winRate && avgResult > bestHour.avgResult)) {
        bestHour = { hour: parseInt(hour), winRate, avgResult };
      }
      if (winRate < worstHour.winRate || (winRate === worstHour.winRate && avgResult < worstHour.avgResult)) {
        worstHour = { hour: parseInt(hour), winRate, avgResult };
      }
    }
  });

  // Find best/worst day
  let bestDay = { day: "", winRate: 0, avgResult: 0 };
  let worstDay = { day: "", winRate: 100, avgResult: Infinity };
  
  Object.entries(dayStats).forEach(([day, stats]) => {
    if (stats.total >= 3) {
      const winRate = (stats.wins / stats.total) * 100;
      const avgResult = stats.result / stats.total;
      if (winRate > bestDay.winRate || (winRate === bestDay.winRate && avgResult > bestDay.avgResult)) {
        bestDay = { day: dayNames[parseInt(day)], winRate, avgResult };
      }
      if (winRate < worstDay.winRate || (winRate === worstDay.winRate && avgResult < worstDay.avgResult)) {
        worstDay = { day: dayNames[parseInt(day)], winRate, avgResult };
      }
    }
  });

  // Find best/worst strategy
  let bestStrategy: { name: string; winRate: number; avgResult: number } | null = null;
  let worstStrategy: { name: string; winRate: number; avgResult: number } | null = null;
  
  Object.entries(strategyStats).forEach(([name, stats]) => {
    if (stats.total >= 5) {
      const winRate = (stats.wins / stats.total) * 100;
      const avgResult = stats.result / stats.total;
      if (!bestStrategy || winRate > bestStrategy.winRate) {
        bestStrategy = { name, winRate, avgResult };
      }
      if (!worstStrategy || winRate < worstStrategy.winRate) {
        worstStrategy = { name, winRate, avgResult };
      }
    }
  });

  // Calculate recovery and streaks
  const sortedDays = Object.entries(dailyResults).sort(([a], [b]) => a.localeCompare(b));
  let recoveryResults: number[] = [];
  let maxWinStreak = 0, maxLossStreak = 0;
  let currentStreak = 0;
  let afterWinStreakResults: number[] = [];
  let afterLossStreakResults: number[] = [];

  for (let i = 0; i < sortedDays.length; i++) {
    const [, result] = sortedDays[i];
    
    // Recovery after loss
    if (i > 0 && sortedDays[i - 1][1] < 0) {
      recoveryResults.push(result);
    }

    // Streaks
    if (result > 0) {
      if (currentStreak < 0 && Math.abs(currentStreak) >= 2) {
        afterLossStreakResults.push(result);
      }
      currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
      maxWinStreak = Math.max(maxWinStreak, currentStreak);
    } else if (result < 0) {
      if (currentStreak > 0 && currentStreak >= 2) {
        afterWinStreakResults.push(result);
      }
      currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
      maxLossStreak = Math.max(maxLossStreak, Math.abs(currentStreak));
    }
  }

  const totalWins = operations.filter(op => op.result > 0).length;
  const totalResult = operations.reduce((sum, op) => sum + op.result, 0);

  return {
    totalOperations: operations.length,
    winRate: (totalWins / operations.length) * 100,
    totalResult,
    bestHour,
    worstHour,
    bestDay,
    worstDay,
    bestStrategy,
    worstStrategy,
    avgRecoveryAfterLoss: recoveryResults.length > 0 ? recoveryResults.reduce((a, b) => a + b, 0) / recoveryResults.length : 0,
    recoveryRate: recoveryResults.length > 0 ? (recoveryResults.filter(r => r > 0).length / recoveryResults.length) * 100 : 0,
    maxWinStreak,
    maxLossStreak,
    avgResultAfterWinStreak: afterWinStreakResults.length > 0 ? afterWinStreakResults.reduce((a, b) => a + b, 0) / afterWinStreakResults.length : 0,
    avgResultAfterLossStreak: afterLossStreakResults.length > 0 ? afterLossStreakResults.reduce((a, b) => a + b, 0) / afterLossStreakResults.length : 0,
    morningPerformance: {
      winRate: morningTotal > 0 ? (morningWins / morningTotal) * 100 : 0,
      avgResult: morningTotal > 0 ? morningResult / morningTotal : 0,
      operations: morningTotal
    },
    afternoonPerformance: {
      winRate: afternoonTotal > 0 ? (afternoonWins / afternoonTotal) * 100 : 0,
      avgResult: afternoonTotal > 0 ? afternoonResult / afternoonTotal : 0,
      operations: afternoonTotal
    }
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operations } = await req.json();
    
    if (!operations || operations.length < 10) {
      return new Response(
        JSON.stringify({ 
          insights: ["Dados insuficientes para análise. Continue operando para receber insights personalizados."],
          suggestions: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysis = analyzeOperations(operations);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Você é um analista de trading especializado. Analise os seguintes dados de performance e gere insights práticos e sugestões de melhoria em português brasileiro.

DADOS DE PERFORMANCE:
- Total de operações: ${analysis.totalOperations}
- Taxa de acerto geral: ${analysis.winRate.toFixed(1)}%
- Resultado total: R$ ${analysis.totalResult.toFixed(2)}
- Melhor horário: ${analysis.bestHour.hour}h (${analysis.bestHour.winRate.toFixed(1)}% acerto, média R$ ${analysis.bestHour.avgResult.toFixed(2)})
- Pior horário: ${analysis.worstHour.hour}h (${analysis.worstHour.winRate.toFixed(1)}% acerto, média R$ ${analysis.worstHour.avgResult.toFixed(2)})
- Melhor dia: ${analysis.bestDay.day} (${analysis.bestDay.winRate.toFixed(1)}% acerto)
- Pior dia: ${analysis.worstDay.day} (${analysis.worstDay.winRate.toFixed(1)}% acerto)
${analysis.bestStrategy ? `- Melhor estratégia: ${analysis.bestStrategy.name} (${analysis.bestStrategy.winRate.toFixed(1)}% acerto)` : ''}
${analysis.worstStrategy ? `- Pior estratégia: ${analysis.worstStrategy.name} (${analysis.worstStrategy.winRate.toFixed(1)}% acerto)` : ''}
- Taxa de recuperação após perdas: ${analysis.recoveryRate.toFixed(1)}%
- Maior sequência de ganhos: ${analysis.maxWinStreak} dias
- Maior sequência de perdas: ${analysis.maxLossStreak} dias
- Resultado médio após sequência de ganhos: R$ ${analysis.avgResultAfterWinStreak.toFixed(2)}
- Resultado médio após sequência de perdas: R$ ${analysis.avgResultAfterLossStreak.toFixed(2)}
- Performance manhã: ${analysis.morningPerformance.winRate.toFixed(1)}% acerto (${analysis.morningPerformance.operations} ops)
- Performance tarde: ${analysis.afternoonPerformance.winRate.toFixed(1)}% acerto (${analysis.afternoonPerformance.operations} ops)

Retorne exatamente no formato JSON abaixo, sem explicações adicionais:
{
  "insights": ["insight1", "insight2", "insight3"],
  "suggestions": ["sugestão1", "sugestão2", "sugestão3"],
  "highlight": "Frase de destaque sobre a descoberta mais importante (ex: Você performa 40% melhor às 10h)"
}

Regras:
- Cada insight deve ser curto e direto (máximo 15 palavras)
- Cada sugestão deve ser acionável e específica
- O highlight deve ser impactante e baseado nos dados
- Use números e porcentagens quando relevante
- Foque em padrões que podem ser melhorados`;

    console.log("Calling Lovable AI for trading analysis...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    console.log("AI Response:", content);

    // Parse JSON from response
    let parsedContent;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback to static insights based on data
      parsedContent = {
        insights: [
          `Taxa de acerto: ${analysis.winRate.toFixed(1)}%`,
          `Melhor horário: ${analysis.bestHour.hour}h`,
          `Recuperação após perdas: ${analysis.recoveryRate.toFixed(1)}%`
        ],
        suggestions: [
          `Concentre operações às ${analysis.bestHour.hour}h`,
          analysis.recoveryRate < 50 ? "Considere pausar após dias negativos" : "Mantenha consistência após perdas",
          `Evite operar às ${analysis.worstHour.hour}h`
        ],
        highlight: `Você performa ${((analysis.bestHour.winRate / analysis.winRate - 1) * 100).toFixed(0)}% melhor às ${analysis.bestHour.hour}h`
      };
    }

    return new Response(
      JSON.stringify({
        ...parsedContent,
        analysis: {
          bestHour: analysis.bestHour,
          worstHour: analysis.worstHour,
          bestDay: analysis.bestDay,
          worstDay: analysis.worstDay,
          morningPerformance: analysis.morningPerformance,
          afternoonPerformance: analysis.afternoonPerformance,
          recoveryRate: analysis.recoveryRate,
          bestStrategy: analysis.bestStrategy,
          worstStrategy: analysis.worstStrategy
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-trading-patterns:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
