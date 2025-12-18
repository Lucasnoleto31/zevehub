import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, AreaChart, Area, ReferenceLine 
} from "recharts";
import { TrendingUp, BarChart2, Clock, Bot } from "lucide-react";

interface RobosChartsProps {
  performanceCurve: any[];
  monthStats: any[];
  yearlyStats: any[];
  hourDistribution: any[];
}

const ChartCard = ({ 
  children, 
  title, 
  description, 
  icon: Icon,
  iconColor = "text-primary",
  delay = 0
}: { 
  children: React.ReactNode;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor?: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <Card className="border-border/50 overflow-hidden bg-gradient-to-br from-card to-card/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-r from-primary/5 via-transparent to-transparent">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className={`p-2 rounded-lg bg-muted/50 ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {children}
      </CardContent>
    </Card>
  </motion.div>
);

export const RobosCharts = ({
  performanceCurve,
  monthStats,
  yearlyStats,
  hourDistribution,
}: RobosChartsProps) => {
  const tooltipStyle = {
    borderRadius: "12px",
    border: "1px solid hsl(var(--border))",
    backgroundColor: "hsl(var(--card))",
    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.2)",
  };

  return (
    <div className="space-y-6">
      {/* Performance Curve - Full Width */}
      <ChartCard
        title="Curva de Performance"
        description="Evolução do resultado acumulado ao longo do tempo"
        icon={TrendingUp}
        delay={0.1}
      >
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={performanceCurve}>
            <defs>
              <linearGradient id="gradient-curve" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <XAxis 
              dataKey="date" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
              axisLine={false} 
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
              axisLine={false} 
              tickLine={false}
              tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: number) => [
                value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                "Acumulado"
              ]}
              contentStyle={tooltipStyle}
            />
            
            <ReferenceLine 
              y={0} 
              stroke="hsl(var(--border))" 
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))"
              strokeWidth={2.5} 
              fill="url(#gradient-curve)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Two Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <ChartCard
          title="Performance Mensal"
          description="Resultado por mês do ano"
          icon={BarChart2}
          delay={0.2}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthStats}>
              <XAxis 
                dataKey="month" 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip 
                formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                contentStyle={tooltipStyle}
              />
              <Bar 
                dataKey="result" 
                radius={[6, 6, 0, 0]}
              >
                {monthStats.map((entry, index) => (
                  <rect 
                    key={`bar-${index}`}
                    fill={entry.result >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Yearly Performance */}
        <ChartCard
          title="Evolução Anual"
          description="Comparativo entre anos"
          icon={TrendingUp}
          iconColor="text-emerald-500"
          delay={0.3}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={yearlyStats}>
              <XAxis 
                dataKey="year" 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip 
                formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                contentStyle={tooltipStyle}
              />
              <Bar 
                dataKey="result" 
                fill="hsl(var(--primary))" 
                radius={[6, 6, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Hour Distribution */}
      <ChartCard
        title="Distribuição por Horário"
        description="Performance e volume de operações por hora"
        icon={Clock}
        iconColor="text-violet-500"
        delay={0.4}
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hourDistribution}>
            <XAxis 
              dataKey="hour" 
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
              axisLine={false} 
              tickLine={false} 
            />
            <YAxis 
              yAxisId="left"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
              axisLine={false} 
              tickLine={false}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} 
              axisLine={false} 
              tickLine={false}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === "resultado") {
                  return [value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), "Resultado"];
                }
                return [value, name === "positivas" ? "Positivas" : "Negativas"];
              }}
              contentStyle={tooltipStyle}
            />
            <Bar 
              yAxisId="left" 
              dataKey="positivas" 
              stackId="a" 
              fill="hsl(var(--success))" 
              name="Positivas" 
              radius={[0, 0, 0, 0]} 
            />
            <Bar 
              yAxisId="left" 
              dataKey="negativas" 
              stackId="a" 
              fill="hsl(var(--destructive))" 
              name="Negativas" 
              radius={[4, 4, 0, 0]} 
            />
            <Bar 
              yAxisId="right" 
              dataKey="resultado" 
              fill="hsl(var(--primary))" 
              name="Resultado (R$)" 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

export default RobosCharts;
