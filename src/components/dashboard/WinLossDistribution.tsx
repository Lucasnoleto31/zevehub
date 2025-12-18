import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Target } from "lucide-react";

interface WinLossDistributionProps {
  wins: number;
  losses: number;
  loading?: boolean;
}

export const WinLossDistribution = ({ wins, losses, loading }: WinLossDistributionProps) => {
  if (loading) {
    return (
      <Card className="border-2 animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48" />
        </CardHeader>
        <CardContent>
          <div className="h-[280px] bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const total = wins + losses;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

  const data = [
    { name: 'Wins', value: wins, color: 'hsl(145, 63%, 49%)' },
    { name: 'Losses', value: losses, color: 'hsl(0, 85%, 60%)' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border-2 border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium" style={{ color: data.color }}>
            {data.name}: {data.value}
          </p>
          <p className="text-xs text-muted-foreground">
            {total > 0 ? ((data.value / total) * 100).toFixed(1) : 0}% do total
          </p>
        </div>
      );
    }
    return null;
  };

  if (total === 0) {
    return (
      <Card className="border-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Distribuição Win/Loss
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            Sem dados para exibir
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Distribuição Win/Loss
          </CardTitle>
          <span className="text-lg font-bold text-primary">{winRate}%</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom"
                formatter={(value: string) => (
                  <span className="text-sm text-foreground">{value === 'Wins' ? 'Ganhos' : 'Perdas'}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-4 pointer-events-none">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{total}</p>
              <p className="text-xs text-muted-foreground">operações</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
