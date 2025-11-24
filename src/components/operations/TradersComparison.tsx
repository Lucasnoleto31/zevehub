import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TrendingUp, TrendingDown, Target, BarChart3, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface TraderStats {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  total_operations: number;
  total_result: number;
  positive_operations: number;
  negative_operations: number;
  win_rate: number;
  average_result: number;
  best_result: number;
  worst_result: number;
  total_contracts: number;
}

export const TradersComparison = () => {
  const [traders, setTraders] = useState<TraderStats[]>([]);
  const [selectedTraders, setSelectedTraders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTradersStats();
  }, []);

  const loadTradersStats = async () => {
    try {
      // Buscar operações agrupadas por usuário
      const { data: operations, error } = await supabase
        .from("trading_operations")
        .select("user_id, result, contracts");

      if (error) throw error;

      // Agrupar por usuário e calcular estatísticas
      const userStatsMap = new Map<string, {
        results: number[];
        contracts: number;
      }>();

      operations?.forEach((op) => {
        if (!userStatsMap.has(op.user_id)) {
          userStatsMap.set(op.user_id, { results: [], contracts: 0 });
        }
        const stats = userStatsMap.get(op.user_id)!;
        stats.results.push(op.result);
        stats.contracts += op.contracts;
      });

      // Buscar perfis dos traders
      const userIds = Array.from(userStatsMap.keys());
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      // Calcular métricas
      const tradersStats: TraderStats[] = [];
      userStatsMap.forEach((stats, userId) => {
        const profile = profiles?.find(p => p.id === userId);
        const positive = stats.results.filter(r => r >= 0).length;
        const negative = stats.results.filter(r => r < 0).length;
        const total = stats.results.length;
        const totalResult = stats.results.reduce((sum, r) => sum + r, 0);

        tradersStats.push({
          user_id: userId,
          full_name: profile?.full_name || "Trader Desconhecido",
          avatar_url: profile?.avatar_url || null,
          total_operations: total,
          total_result: totalResult,
          positive_operations: positive,
          negative_operations: negative,
          win_rate: total > 0 ? (positive / total) * 100 : 0,
          average_result: total > 0 ? totalResult / total : 0,
          best_result: Math.max(...stats.results),
          worst_result: Math.min(...stats.results),
          total_contracts: stats.contracts,
        });
      });

      // Ordenar por resultado total
      tradersStats.sort((a, b) => b.total_result - a.total_result);
      setTraders(tradersStats);

      // Selecionar os 3 primeiros automaticamente
      if (tradersStats.length > 0) {
        setSelectedTraders(tradersStats.slice(0, Math.min(3, tradersStats.length)).map(t => t.user_id));
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas dos traders:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrader = (traderId: string) => {
    setSelectedTraders(prev => 
      prev.includes(traderId)
        ? prev.filter(id => id !== traderId)
        : [...prev, traderId]
    );
  };

  const selectedTradersData = traders.filter(t => selectedTraders.includes(t.user_id));

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seleção de Traders */}
      <Card>
        <CardHeader>
          <CardTitle>Selecione Traders para Comparar</CardTitle>
          <CardDescription>
            Escolha até 4 traders para visualizar comparação detalhada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {traders.map((trader) => (
              <div
                key={trader.user_id}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                onClick={() => toggleTrader(trader.user_id)}
              >
                <Checkbox
                  checked={selectedTraders.includes(trader.user_id)}
                  disabled={!selectedTraders.includes(trader.user_id) && selectedTraders.length >= 4}
                />
                <Avatar className="w-10 h-10">
                  <AvatarImage src={trader.avatar_url || undefined} />
                  <AvatarFallback>{trader.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{trader.full_name}</p>
                  <p className={`text-sm ${trader.total_result >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {trader.total_result >= 0 ? '+' : ''}
                    {trader.total_result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparação Detalhada */}
      {selectedTradersData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {selectedTradersData.map((trader) => (
            <Card key={trader.user_id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={trader.avatar_url || undefined} />
                    <AvatarFallback>{trader.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{trader.full_name}</CardTitle>
                    <CardDescription>{trader.total_operations} operações</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Resultado Total */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Resultado Total</span>
                    <div className="flex items-center gap-1">
                      {trader.total_result >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                  </div>
                  <p className={`text-2xl font-bold ${trader.total_result >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {trader.total_result >= 0 ? '+' : ''}
                    {trader.total_result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>

                {/* Win Rate */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      Win Rate
                    </span>
                    <span className="text-sm font-semibold">{trader.win_rate.toFixed(1)}%</span>
                  </div>
                  <Progress value={trader.win_rate} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="text-success">{trader.positive_operations} ganhos</span>
                    <span className="text-destructive">{trader.negative_operations} perdas</span>
                  </div>
                </div>

                {/* Média por Operação */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    Média/Operação
                  </span>
                  <span className={`font-semibold ${trader.average_result >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {trader.average_result >= 0 ? '+' : ''}
                    {trader.average_result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>

                {/* Melhor e Pior Resultado */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Melhor</p>
                    <p className="text-sm font-semibold text-success">
                      +{trader.best_result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Pior</p>
                    <p className="text-sm font-semibold text-destructive">
                      {trader.worst_result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>

                {/* Contratos Operados */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    Contratos
                  </span>
                  <Badge variant="outline">{trader.total_contracts.toLocaleString('pt-BR')}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabela Comparativa */}
      {selectedTradersData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Comparação Lado a Lado</CardTitle>
            <CardDescription>Análise comparativa das métricas principais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Métrica</th>
                    {selectedTradersData.map(trader => (
                      <th key={trader.user_id} className="text-right p-3 font-medium">
                        {trader.full_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-3 text-muted-foreground">Resultado Total</td>
                    {selectedTradersData.map(trader => (
                      <td key={trader.user_id} className={`text-right p-3 font-semibold ${trader.total_result >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {trader.total_result >= 0 ? '+' : ''}
                        {trader.total_result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-3 text-muted-foreground">Win Rate</td>
                    {selectedTradersData.map(trader => (
                      <td key={trader.user_id} className="text-right p-3 font-semibold">
                        {trader.win_rate.toFixed(1)}%
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-3 text-muted-foreground">Média por Operação</td>
                    {selectedTradersData.map(trader => (
                      <td key={trader.user_id} className={`text-right p-3 font-semibold ${trader.average_result >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {trader.average_result >= 0 ? '+' : ''}
                        {trader.average_result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-3 text-muted-foreground">Total de Operações</td>
                    {selectedTradersData.map(trader => (
                      <td key={trader.user_id} className="text-right p-3">
                        {trader.total_operations}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-3 text-muted-foreground">Operações Positivas</td>
                    {selectedTradersData.map(trader => (
                      <td key={trader.user_id} className="text-right p-3 text-success">
                        {trader.positive_operations}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-3 text-muted-foreground">Operações Negativas</td>
                    {selectedTradersData.map(trader => (
                      <td key={trader.user_id} className="text-right p-3 text-destructive">
                        {trader.negative_operations}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b hover:bg-muted/50">
                    <td className="p-3 text-muted-foreground">Melhor Resultado</td>
                    {selectedTradersData.map(trader => (
                      <td key={trader.user_id} className="text-right p-3 text-success">
                        +{trader.best_result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-muted/50">
                    <td className="p-3 text-muted-foreground">Pior Resultado</td>
                    {selectedTradersData.map(trader => (
                      <td key={trader.user_id} className="text-right p-3 text-destructive">
                        {trader.worst_result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};