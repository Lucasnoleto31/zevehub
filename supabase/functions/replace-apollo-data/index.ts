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
    const { action, operations, userId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Ação: deletar todos os registros do Apollo
    if (action === "delete") {
      console.log("Iniciando exclusão dos dados do Apollo...");
      
      let totalDeleted = 0;
      let hasMore = true;
      let errors = 0;
      const maxErrors = 50;

      while (hasMore && errors < maxErrors) {
        // Buscar um ID por vez
        const { data: records, error: fetchError } = await supabase
          .from("trading_operations")
          .select("id")
          .ilike("strategy", "%apolo%")
          .limit(1);

        if (fetchError) {
          console.error("Erro ao buscar:", fetchError);
          errors++;
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        if (!records || records.length === 0) {
          hasMore = false;
          break;
        }

        const id = records[0].id;

        // Deletar o registro
        const { error: deleteError } = await supabase
          .from("trading_operations")
          .delete()
          .eq("id", id);

        if (deleteError) {
          console.error("Erro ao deletar:", deleteError);
          errors++;
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        totalDeleted++;
        
        if (totalDeleted % 100 === 0) {
          console.log(`Deletados: ${totalDeleted}`);
        }

        // Pequeno delay entre exclusões
        await new Promise(r => setTimeout(r, 50));
      }

      console.log(`✅ Total deletado: ${totalDeleted}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "delete",
          deleted: totalDeleted 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ação: inserir novos registros em lote (ultra pequeno para evitar timeout)
    if (action === "insert") {
      if (!operations || !Array.isArray(operations) || operations.length === 0) {
        throw new Error("Operações são obrigatórias para inserção");
      }

      if (!userId) {
        throw new Error("userId é obrigatório");
      }

      console.log(`Inserindo lote de ${operations.length} operações...`);

      // Preparar os dados para inserção
      const operationsToInsert = operations.map((op: any) => ({
        user_id: userId,
        asset: op.asset || "WIN",
        operation_date: op.operation_date,
        operation_time: op.operation_time || "00:00:00",
        contracts: op.contracts || 1,
        costs: op.costs || 0,
        result: op.result || 0,
        notes: op.notes || null,
        strategy: "Apolo",
      }));

      // Inserir em lotes MUITO pequenos (10) com retry
      const batchSize = 10;
      let totalInserted = 0;
      let insertErrors = 0;
      const maxRetries = 3;

      for (let i = 0; i < operationsToInsert.length; i += batchSize) {
        const batch = operationsToInsert.slice(i, i + batchSize);
        let success = false;
        
        for (let retry = 0; retry < maxRetries && !success; retry++) {
          if (retry > 0) {
            console.log(`Retry ${retry} para lote ${i / batchSize + 1}`);
            await new Promise(r => setTimeout(r, 500 * retry)); // Delay crescente
          }

          const { data, error } = await supabase
            .from("trading_operations")
            .insert(batch)
            .select("id");

          if (!error) {
            totalInserted += data?.length || 0;
            success = true;
          } else if (retry === maxRetries - 1) {
            console.error(`Erro final no lote ${i / batchSize + 1}:`, error.message);
            insertErrors++;
          }
        }
        
        if (totalInserted % 100 === 0 && totalInserted > 0) {
          console.log(`Inseridos: ${totalInserted}`);
        }

        // Delay maior entre lotes para não sobrecarregar
        await new Promise(r => setTimeout(r, 150));
      }

      console.log(`✅ Total inserido: ${totalInserted}, Erros: ${insertErrors}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "insert",
          inserted: totalInserted,
          errors: insertErrors
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Ação inválida. Use 'delete' ou 'insert'");

  } catch (error) {
    console.error("Erro:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
