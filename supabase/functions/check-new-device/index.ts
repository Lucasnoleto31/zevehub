import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckDeviceRequest {
  user_id: string;
  ip_address: string;
  user_agent: string;
  device_info: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, ip_address, user_agent, device_info }: CheckDeviceRequest = await req.json();

    console.log("Checking new device for user:", user_id);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar o perfil do usuário para obter o email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se este IP já foi usado antes
    const { data: existingLogs, error: logsError } = await supabase
      .from("access_logs")
      .select("ip_address")
      .eq("user_id", user_id)
      .eq("ip_address", ip_address)
      .limit(1);

    if (logsError) {
      console.error("Error checking logs:", logsError);
    }

    // Se não existe log com este IP, é um novo dispositivo/localização
    const isNewDevice = !existingLogs || existingLogs.length === 0;

    if (isNewDevice && ip_address !== "client-side") {
      console.log("New device detected, sending email notification");

      // Obter informações do navegador/sistema
      const browserInfo = user_agent.includes("Chrome") ? "Chrome" :
                         user_agent.includes("Firefox") ? "Firefox" :
                         user_agent.includes("Safari") ? "Safari" :
                         user_agent.includes("Edge") ? "Edge" : "Navegador desconhecido";

      const now = new Date();
      const dateStr = now.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      const timeStr = now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Enviar email de notificação
      const emailResponse = await resend.emails.send({
        from: "Segurança <onboarding@resend.dev>",
        to: [profile.email],
        subject: "🔔 Novo acesso detectado em sua conta",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                .info-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 15px 0; border-radius: 5px; }
                .info-label { font-weight: bold; color: #667eea; margin-bottom: 5px; }
                .warning { background: #fff3cd; border-left-color: #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">🔒 Novo Acesso Detectado</h1>
                </div>
                <div class="content">
                  <p>Olá <strong>${profile.full_name || "Usuário"}</strong>,</p>
                  <p>Detectamos um novo acesso à sua conta. Se foi você, pode ignorar este e-mail.</p>
                  
                  <div class="info-box">
                    <div class="info-label">📅 Data e Hora</div>
                    <div>${dateStr} às ${timeStr}</div>
                  </div>
                  
                  <div class="info-box">
                    <div class="info-label">🌐 Navegador</div>
                    <div>${browserInfo}</div>
                  </div>
                  
                  <div class="info-box">
                    <div class="info-label">💻 Dispositivo</div>
                    <div>${device_info}</div>
                  </div>
                  
                  <div class="info-box">
                    <div class="info-label">📍 IP</div>
                    <div>${ip_address}</div>
                  </div>
                  
                  <div class="warning">
                    <strong>⚠️ Não foi você?</strong>
                    <p>Se você não reconhece este acesso, recomendamos que altere sua senha imediatamente e ative a autenticação de dois fatores (2FA) na página de perfil.</p>
                  </div>
                  
                  <div class="footer">
                    <p>Este é um e-mail automático de segurança. Por favor, não responda.</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
      });

      console.log("Email sent successfully:", emailResponse);

      // Registrar no log de atividades
      await supabase.from("activity_logs").insert({
        user_id: user_id,
        activity_type: "security",
        description: `Novo dispositivo detectado: ${browserInfo} em ${device_info}`,
        ip_address: ip_address,
        user_agent: user_agent,
      });
    } else {
      console.log("Device already known, no notification sent");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        isNewDevice,
        notificationSent: isNewDevice 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in check-new-device function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
