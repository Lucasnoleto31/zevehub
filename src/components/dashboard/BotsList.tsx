import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, TrendingUp, Search } from "lucide-react";

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
  const navigate = useNavigate();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadBots();
  }, [userId]);

  const loadBots = async () => {
    try {
      // Carregar TODOS os robôs (não apenas do usuário)
      const { data, error } = await supabase
        .from("client_bots")
        .select("*")
        .order("performance_percentage", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setBots(data || []);
    } catch (error) {
      console.error("Erro ao carregar robôs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBots = bots.filter((bot) => {
    const matchesSearch = bot.bot_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || bot.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  if (bots.length === 0) {
    return (
      <div className="text-center py-8">
        <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Nenhum robô cadastrado ainda</p>
        <p className="text-sm text-muted-foreground mt-1">
          Aguardando cadastro de robôs pela assessoria
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar robô por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="inactive">Inativo</SelectItem>
            <SelectItem value="maintenance">Manutenção</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Robôs */}
      {filteredBots.length === 0 ? (
        <div className="text-center py-8">
          <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Nenhum robô encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tente ajustar os filtros de busca
          </p>
        </div>
      ) : (
        <div className="space-y-3">
      {filteredBots.map((bot) => (
        <div
          key={bot.id}
          onClick={() => navigate(`/bot/${bot.id}`)}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors cursor-pointer"
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
      )}
    </div>
  );
};

export default BotsList;
