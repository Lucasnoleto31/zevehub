import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Bot, TrendingUp, Activity, Calendar } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface BotData {
  id: string;
  bot_name: string;
  status: string;
  performance_percentage: number;
  volume_operated: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const BotDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bot, setBot] = useState<BotData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBotDetails();
  }, [id]);

  const loadBotDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("client_bots")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setBot(data);
    } catch (error) {
      console.error("Erro ao carregar detalhes do robô:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Robô não encontrado</CardTitle>
            <CardDescription>O robô solicitado não existe ou foi removido.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header do Robô */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{bot.bot_name}</h1>
              <div className="flex items-center gap-3">
                <Badge variant={bot.status === "active" ? "default" : "secondary"}>
                  {bot.status === "active" ? "Ativo" : bot.status === "inactive" ? "Inativo" : "Manutenção"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ID: {bot.id.substring(0, 8)}...
                </span>
              </div>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  <span className="text-2xl font-bold text-success">
                    {bot.performance_percentage ? `+${bot.performance_percentage}%` : "--"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Volume Operado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <span className="text-2xl font-bold">
                    {bot.volume_operated ? bot.volume_operated.toLocaleString() : "0"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      bot.status === "active" ? "bg-success" : "bg-muted"
                    }`}
                  />
                  <span className="text-2xl font-bold capitalize">{bot.status}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Informações Detalhadas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Robô</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Nome do Robô</p>
                  <p className="font-medium">{bot.bot_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status Atual</p>
                  <p className="font-medium capitalize">{bot.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Criado em</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">
                      {new Date(bot.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Última Atualização</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium">
                      {new Date(bot.updated_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BotDetail;
