import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";

interface StatsData {
  totalOperations: number;
  totalProfit: number;
  winRate: number;
  averageResult: number;
}

interface DashboardStatsProps {
  stats: StatsData;
  loading?: boolean;
}

export const DashboardStats = ({ stats, loading }: DashboardStatsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total de Operações",
      value: stats.totalOperations,
      icon: Activity,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Resultado Total",
      value: `R$ ${stats.totalProfit.toFixed(2)}`,
      icon: DollarSign,
      color: stats.totalProfit >= 0 ? "text-success" : "text-error",
      bgColor: stats.totalProfit >= 0 ? "bg-success/10" : "bg-error/10",
    },
    {
      title: "Taxa de Acerto",
      value: `${stats.winRate.toFixed(1)}%`,
      icon: stats.winRate >= 50 ? TrendingUp : TrendingDown,
      color: stats.winRate >= 50 ? "text-success" : "text-error",
      bgColor: stats.winRate >= 50 ? "bg-success/10" : "bg-error/10",
    },
    {
      title: "Resultado Médio",
      value: `R$ ${stats.averageResult.toFixed(2)}`,
      icon: Activity,
      color: stats.averageResult >= 0 ? "text-success" : "text-error",
      bgColor: stats.averageResult >= 0 ? "bg-success/10" : "bg-error/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card
          key={stat.title}
          className="overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-in"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">
                  {stat.title}
                </p>
                <p className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
