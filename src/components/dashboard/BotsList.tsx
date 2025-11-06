import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Bot, TrendingUp, TrendingDown } from "lucide-react";

interface Bot {
  id: string;
  bot_name: string;
  status: string;
  performance_percentage: number;
  volume_operated: number;
}

interface BotsListProps {
  userId: string;
}

const BotsList = ({ userId }: BotsListProps) => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBots();
  }, [userId]);

  const loadBots = async () => {
    try {
      const { data, error } = await supabase
        .from("client_bots")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBots(data || []);
    } catch (error) {
      console.error("Erro ao carregar robôs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  if (bots.length === 0) {
    return (
      <div className="text-center py-8">
        <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Nenhum robô configurado ainda</p>
        <p className="text-sm text-muted-foreground mt-1">
          Entre em contato com a assessoria para configurar seus robôs
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bots.map((bot) => (
        <div
          key={bot.id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{bot.bot_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={bot.status === "active" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {bot.status === "active" ? "Ativo" : bot.status === "inactive" ? "Inativo" : "Manutenção"}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm font-semibold">
              {bot.performance_percentage && bot.performance_percentage > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-success">+{bot.performance_percentage}%</span>
                </>
              ) : (
                <span className="text-muted-foreground">--</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {bot.volume_operated ? `Vol: ${bot.volume_operated.toLocaleString()}` : "Sem dados"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BotsList;
