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
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
      value: stats.totalOperations.toLocaleString("pt-BR"),
      icon: Activity,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      gradient: "from-blue-500/20 to-transparent",
    },
    {
      title: "Resultado Total",
      value: formatCurrency(stats.totalProfit),
      icon: DollarSign,
      color: stats.totalProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
      bgColor: stats.totalProfit >= 0 ? "bg-green-500/10" : "bg-red-500/10",
      borderColor: stats.totalProfit >= 0 ? "border-green-500/20" : "border-red-500/20",
      gradient: stats.totalProfit >= 0 ? "from-green-500/20 to-transparent" : "from-red-500/20 to-transparent",
    },
    {
      title: "Taxa de Acerto",
      value: `${stats.winRate.toFixed(1)}%`,
      icon: stats.winRate >= 50 ? TrendingUp : TrendingDown,
      color: stats.winRate >= 50 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400",
      bgColor: stats.winRate >= 50 ? "bg-green-500/10" : "bg-orange-500/10",
      borderColor: stats.winRate >= 50 ? "border-green-500/20" : "border-orange-500/20",
      gradient: stats.winRate >= 50 ? "from-green-500/20 to-transparent" : "from-orange-500/20 to-transparent",
    },
    {
      title: "Resultado Médio",
      value: formatCurrency(stats.averageResult),
      icon: Activity,
      color: stats.averageResult >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
      bgColor: stats.averageResult >= 0 ? "bg-green-500/10" : "bg-red-500/10",
      borderColor: stats.averageResult >= 0 ? "border-green-500/20" : "border-red-500/20",
      gradient: stats.averageResult >= 0 ? "from-green-500/20 to-transparent" : "from-red-500/20 to-transparent",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.title}
            className={`overflow-hidden hover:shadow-xl transition-all duration-300 animate-fade-in border-2 ${stat.borderColor} relative group cursor-pointer`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
            <CardContent className="pt-6 relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-14 h-14 rounded-xl ${stat.bgColor} flex items-center justify-center ring-4 ring-background shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-7 h-7 ${stat.color}`} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {stat.title}
                </p>
                <p className={`text-3xl font-bold ${stat.color} tracking-tight`}>
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
