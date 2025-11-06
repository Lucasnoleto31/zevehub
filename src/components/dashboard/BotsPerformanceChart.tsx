import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface BotPerformanceData {
  bot_name: string;
  performance_percentage: number;
  updated_at: string;
}

const BotsPerformanceChart = () => {
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    try {
      const { data: botsData, error } = await supabase
        .from("client_bots")
        .select("bot_name, performance_percentage, updated_at, created_at")
        .order("updated_at", { ascending: true });

      if (error) throw error;

      if (botsData && botsData.length > 0) {
        // Agrupar dados por data para criar pontos no gráfico
        const dataByDate: { [key: string]: any } = {};

        botsData.forEach((bot) => {
          const date = new Date(bot.updated_at).toLocaleDateString("pt-BR");
          
          if (!dataByDate[date]) {
            dataByDate[date] = { date };
          }
          
          dataByDate[date][bot.bot_name] = bot.performance_percentage || 0;
        });

        const chartData = Object.values(dataByDate);
        setPerformanceData(chartData);
      }
    } catch (error) {
      console.error("Erro ao carregar dados de performance:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Evolução de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Carregando...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (performanceData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Evolução de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado de performance disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  // Extrair nomes únicos dos robôs para criar as linhas do gráfico
  const botNames = Array.from(
    new Set(
      performanceData.flatMap((data) =>
        Object.keys(data).filter((key) => key !== "date")
      )
    )
  );

  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "#8b5cf6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Evolução de Performance dos Robôs
        </CardTitle>
        <CardDescription>
          Acompanhe a performance de cada robô ao longo do tempo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              label={{ 
                value: "Performance (%)", 
                angle: -90, 
                position: "insideLeft",
                style: { fill: "hsl(var(--muted-foreground))" }
              }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
            {botNames.map((botName, index) => (
              <Line
                key={botName}
                type="monotone"
                dataKey={botName}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default BotsPerformanceChart;
