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
    const { operations, userId, rawNote } = await req.json();
    
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      throw new Error("Operações são obrigatórias");
    }

    if (!userId) {
      throw new Error("userId é obrigatório");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Inserir operações no banco
    const operationsToInsert = operations.map((op: any) => ({
      user_id: userId,
      asset: op.ticker,
      operation_date: op.date,
      operation_time: op.time,
      contracts: op.qty,
      costs: op.costs || 0,
      result: op.result,
      notes: op.notes,
      raw_note: rawNote?.substring(0, 500),
      risk_level: op.risk_level,
      strategy: null, // Será classificado depois se necessário
    }));

    const { data, error } = await supabase
      .from("trading_operations")
      .insert(operationsToInsert)
      .select();

    if (error) {
      console.error("Erro ao inserir operações:", error);
      throw error;
    }

    console.log(`✅ ${data.length} operações confirmadas e salvas`);

    return new Response(
      JSON.stringify({ 
        success: true,
        operations: data,
        count: data.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro ao confirmar importação:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro ao confirmar importação";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});