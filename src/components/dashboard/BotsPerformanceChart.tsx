import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp } from "lucide-react";

interface PerformancePoint {
  date: string;
  accumulated: number;
  operations: number;
  positiveValue: number;
  negativeValue: number;
}

const BotsPerformanceChart = () => {
  const [performanceData, setPerformanceData] = useState<PerformancePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    try {
      const { data: operationsData, error } = await supabase
        .from("trading_operations")
        .select("operation_date, result")
        .order("operation_date", { ascending: true });

      if (error) throw error;

      if (operationsData && operationsData.length > 0) {
        // Agrupar operações por data e calcular resultado acumulado
        const dataByDate: { [key: string]: { result: number; count: number } } = {};

        operationsData.forEach((op) => {
          // Parse da data sem conversão de timezone
          const [year, month, day] = op.operation_date.split('-').map(Number);
          const date = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
          
          if (!dataByDate[date]) {
            dataByDate[date] = { result: 0, count: 0 };
          }
          
          dataByDate[date].result += op.result || 0;
          dataByDate[date].count += 1;
        });

let accumulated = 0;
const chartData: PerformancePoint[] = Object.entries(dataByDate).map(([date, data]) => {
  accumulated += data.result;
  const value = Number(accumulated.toFixed(2));
  return {
    date,
    accumulated: value,
    operations: data.count,
    positiveValue: value >= 0 ? value : 0,
    negativeValue: value < 0 ? value : 0,
  };
});

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

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const point = payload[0].payload;
    const value = point.accumulated as number;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground mb-1">{point.date}</p>
        <p className="text-sm text-muted-foreground">
          Operações: <span className="font-medium text-foreground">{point.operations}</span>
        </p>
        <p className={`text-sm font-bold ${value >= 0 ? 'text-success' : 'text-destructive'}`}>
          Resultado: R$ {value >= 0 ? '+' : ''}{value.toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Evolução de Performance
        </CardTitle>
        <CardDescription>
          Resultado acumulado de todas as operações ao longo do tempo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: 10, bottom: 60 }}>
            <defs>
              <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#DFF3E2" stopOpacity={1}/>
                <stop offset="100%" stopColor="#DFF3E2" stopOpacity={0.3}/>
              </linearGradient>
              <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F9D5D5" stopOpacity={0.3}/>
                <stop offset="100%" stopColor="#F9D5D5" stopOpacity={1}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Área negativa - do valor até zero */}
            <Area
              type="monotone"
              dataKey="negativeValue"
              stroke="hsl(var(--destructive))"
              strokeWidth={2.5}
              fill="url(#negativeGradient)"
              fillOpacity={1}
              isAnimationActive={false}
            />
            {/* Área positiva - de zero até o valor */}
            <Area
              type="monotone"
              dataKey="positiveValue"
              stroke="hsl(var(--success))"
              strokeWidth={2.5}
              fill="url(#positiveGradient)"
              fillOpacity={1}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default BotsPerformanceChart;
