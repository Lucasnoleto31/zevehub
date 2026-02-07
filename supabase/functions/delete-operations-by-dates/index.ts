import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`🗑️ Iniciando exclusão para ${dates.length} datas do usuário ${userId}`);

    // 1. Desabilitar triggers do usuário para evitar timeouts
    await supabase.rpc("exec_sql", {
      query: "ALTER TABLE public.trading_operations DISABLE TRIGGER USER",
    }).then(() => {
      console.log("✅ Triggers desabilitados");
    }).catch((err: unknown) => {
      // Se a função exec_sql não existir, tentar sem desabilitar triggers
      console.warn("⚠️ Não foi possível desabilitar triggers, continuando...", err);
    });

    let totalDeleted = 0;

    try {
      // 2. Buscar IDs das operações que serão deletadas
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

      // 3. Remover dependências em lotes de 500 IDs
      const ID_BATCH_SIZE = 500;
      for (let i = 0; i < ids.length; i += ID_BATCH_SIZE) {
        const idBatch = ids.slice(i, i + ID_BATCH_SIZE);

        // Deletar notifications dependentes
        const { error: notifError } = await supabase
          .from("notifications")
          .delete()
          .in("operation_id", idBatch);

        if (notifError) {
          console.warn(`⚠️ Erro ao deletar notifications (lote ${i}):`, notifError.message);
        }

        // Deletar ai_classification_logs dependentes
        const { error: aiError } = await supabase
          .from("ai_classification_logs")
          .delete()
          .in("operation_id", idBatch);

        if (aiError) {
          console.warn(`⚠️ Erro ao deletar ai_classification_logs (lote ${i}):`, aiError.message);
        }
      }

      console.log("✅ Dependências removidas");

      // 4. Deletar operações em lotes de 500 IDs
      for (let i = 0; i < ids.length; i += ID_BATCH_SIZE) {
        const idBatch = ids.slice(i, i + ID_BATCH_SIZE);

        const { error: deleteError } = await supabase
          .from("trading_operations")
          .delete()
          .in("id", idBatch);

        if (deleteError) {
          console.error(`Erro ao deletar lote ${i}:`, deleteError.message);
          throw deleteError;
        }

        totalDeleted += idBatch.length;
        console.log(`🗑️ Deletadas ${totalDeleted} de ${ids.length} operações`);
      }
    } finally {
      // 5. Reabilitar triggers sempre
      await supabase.rpc("exec_sql", {
        query: "ALTER TABLE public.trading_operations ENABLE TRIGGER USER",
      }).then(() => {
        console.log("✅ Triggers reabilitados");
      }).catch((err: unknown) => {
        console.warn("⚠️ Não foi possível reabilitar triggers:", err);
      });
    }

    console.log(`✅ Exclusão concluída: ${totalDeleted} operações removidas`);

    return new Response(
      JSON.stringify({ success: true, deleted: totalDeleted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Erro na exclusão por datas:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
