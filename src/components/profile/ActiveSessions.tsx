import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Monitor, Smartphone, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ActiveSessionsProps {
  userId: string;
}

interface Session {
  id: string;
  login_at: string;
  device_info: string | null;
  user_agent: string | null;
  ip_address: string | null;
}

const getDeviceIcon = (userAgent: string | null) => {
  if (!userAgent) return Monitor;
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return Smartphone;
  }
  return Monitor;
};

export const ActiveSessions = ({ userId }: ActiveSessionsProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, [userId]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("access_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("success", true)
        .order("login_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error("Erro ao carregar sessões:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAllSessions = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
      toast.success("Todas as sessões foram encerradas. Faça login novamente.");
    } catch (error) {
      console.error("Erro ao encerrar sessões:", error);
      toast.error("Erro ao encerrar sessões");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessões Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Logins Recentes</CardTitle>
          <Button
            onClick={handleLogoutAllSessions}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Encerrar Todas
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma sessão ativa
          </p>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, index) => {
              const DeviceIcon = getDeviceIcon(session.user_agent);
              return (
                <div
                  key={session.id}
                  className="flex items-start gap-4 p-4 border rounded-lg"
                >
                  <div className="p-2 rounded-full bg-primary/10">
                    <DeviceIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">
                        {session.device_info || "Dispositivo desconhecido"}
                      </p>
                      {index === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Atual
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(session.login_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {session.ip_address && (
                      <p className="text-xs text-muted-foreground">
                        IP: {session.ip_address}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
