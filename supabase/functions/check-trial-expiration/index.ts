import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find users with expired trials
    const { data: expiredUsers, error: selectError } = await supabase
      .from("profiles")
      .select("id, full_name, email, trial_expires_at")
      .eq("access_status", "aprovado")
      .not("trial_expires_at", "is", null)
      .lt("trial_expires_at", new Date().toISOString());

    if (selectError) {
      throw selectError;
    }

    if (!expiredUsers || expiredUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum usuário com trial expirado", blocked: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Block expired users
    const userIds = expiredUsers.map((u) => u.id);
    
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        access_status: "bloqueado",
        trial_expires_at: null 
      })
      .in("id", userIds);

    if (updateError) {
      throw updateError;
    }

    // Send notification to each blocked user
    const notifications = expiredUsers.map((user) => ({
      user_id: user.id,
      title: "Período de Teste Expirado",
      content: "Seu período de teste de 3 dias expirou. Entre em contato com seu assessor pelo WhatsApp +55 62 98181-0004 para continuar usando a plataforma.",
      priority: "high",
      is_global: false,
    }));

    await supabase.from("messages").insert(notifications);

    console.log(`Bloqueados ${expiredUsers.length} usuários com trial expirado`);

    return new Response(
      JSON.stringify({ 
        message: `${expiredUsers.length} usuário(s) bloqueado(s) por trial expirado`,
        blocked: expiredUsers.length,
        users: expiredUsers.map(u => ({ id: u.id, name: u.full_name, email: u.email }))
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro ao verificar trials expirados:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});