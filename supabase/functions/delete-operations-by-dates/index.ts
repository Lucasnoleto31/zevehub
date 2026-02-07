import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dates, userId } = await req.json();

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return new Response(
        JSON.stringify({ error: "dates array é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing env vars:", { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });
      return new Response(
        JSON.stringify({ error: "Configuração do servidor ausente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🗑️ Iniciando exclusão para ${dates.length} datas do usuário ${userId}`);

    // 1. Buscar IDs das operações que serão deletadas
    const { data: operationIds, error: fetchError } = await supabase
      .from("trading_operations")
      .select("id")
      .eq("user_id", userId)
      .in("operation_date", dates);

    if (fetchError) {
      console.error("Erro ao buscar operações:", fetchError);
      throw fetchError;
    }

    if (!operationIds || operationIds.length === 0) {
      console.log("Nenhuma operação encontrada para as datas informadas");
      return new Response(
        JSON.stringify({ success: true, deleted: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ids = operationIds.map((op: { id: string }) => op.id);
    console.log(`📊 Encontradas ${ids.length} operações para deletar`);

    let totalDeleted = 0;
    const BATCH_SIZE = 5; // Ultra-small batches to avoid timeout
    const DELAY_MS = 300; // Delay between batches

    // 2. Process in ultra-small batches: delete deps then operation
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const idBatch = ids.slice(i, i + BATCH_SIZE);

      // Delete notifications for this batch (ignore errors - may not exist)
      const { error: notifError } = await supabase
        .from("notifications")
        .delete()
        .in("operation_id", idBatch);

      if (notifError) {
        console.warn(`⚠️ Notif batch ${i}:`, notifError.message);
      }

      // Delete ai_classification_logs for this batch
      const { error: aiError } = await supabase
        .from("ai_classification_logs")
        .delete()
        .in("operation_id", idBatch);

      if (aiError) {
        console.warn(`⚠️ AI logs batch ${i}:`, aiError.message);
      }

      // Small delay to let DB breathe
      await sleep(100);

      // Delete the operations themselves
      const { error: deleteError } = await supabase
        .from("trading_operations")
        .delete()
        .in("id", idBatch);

      if (deleteError) {
        console.error(`❌ Erro ao deletar lote ${i}:`, deleteError.message);
        // Continue with next batch instead of throwing
        console.log(`⚠️ Pulando lote com erro, continuando...`);
      } else {
        totalDeleted += idBatch.length;
      }

      if (i + BATCH_SIZE < ids.length) {
        await sleep(DELAY_MS);
      }

      // Log progress every 25 operations
      if ((i + BATCH_SIZE) % 25 === 0 || i + BATCH_SIZE >= ids.length) {
        console.log(`🗑️ Progresso: ${Math.min(i + BATCH_SIZE, ids.length)}/${ids.length}`);
      }
    }

    console.log(`✅ Exclusão concluída: ${totalDeleted} operações removidas`);

    return new Response(
      JSON.stringify({ success: true, deleted: totalDeleted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Erro na exclusão por datas:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
