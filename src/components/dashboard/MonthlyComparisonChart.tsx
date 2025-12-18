import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CalendarDays, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

interface Operation {
  operation_date: string;
  result: number;
}

interface MonthlyComparisonChartProps {
  operations: Operation[];
  loading?: boolean;
}

const MonthlyComparisonChart = ({ operations, loading }: MonthlyComparisonChartProps) => {
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, { gains: number; losses: number; total: number; count: number }>();

    operations.forEach((op) => {
      const [year, month] = op.operation_date.split("-");
      const key = `${year}-${month}`;

      if (!monthMap.has(key)) {
        monthMap.set(key, { gains: 0, losses: 0, total: 0, count: 0 });
      }

      const current = monthMap.get(key)!;
      current.total += op.result;
      current.count += 1;

      if (op.result > 0) {
        current.gains += op.result;
      } else {
        current.losses += Math.abs(op.result);
      }
    });

    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    return Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([key, data]) => {
        const [year, month] = key.split("-");
        return {
          month: `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`,
          resultado: data.total,
          ganhos: data.gains,
          perdas: data.losses,
          operacoes: data.count,
        };
      });
  }, [operations]);

  const stats = useMemo(() => {
    const positive = monthlyData.filter(d => d.resultado > 0).length;
    const negative = monthlyData.filter(d => d.resultado < 0).length;
    const best = monthlyData.reduce((max, d) => d.resultado > max.resultado ? d : max, monthlyData[0]);
    const worst = monthlyData.reduce((min, d) => d.resultado < min.resultado ? d : min, monthlyData[0]);
    return { positive, negative, best, worst };
  }, [monthlyData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPositive = data.resultado >= 0;
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-xl">
          <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Resultado:</span>
              <span className={`text-sm font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                R$ {data.resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Ganhos:</span>
              <span className="text-sm text-success">
                R$ {data.ganhos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">Perdas:</span>
              <span className="text-sm text-destructive">
                R$ {data.perdas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/50">
              <span className="text-xs text-muted-foreground">Operações:</span>
              <span className="text-sm font-medium text-foreground">{data.operacoes}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-gradient-to-br from-card via-card to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            Performance Mensal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-border/50 bg-gradient-to-br from-card via-card to-accent/5 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <span>Performance Mensal</span>
              </CardTitle>
              <CardDescription className="mt-1.5">
                Resultado líquido por mês do ano
              </CardDescription>
            </div>
            {monthlyData.length > 0 && (
              <div className="flex gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20">
                  <TrendingUp className="w-3.5 h-3.5 text-success" />
                  <span className="text-xs font-medium text-success">{stats.positive} meses +</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
                  <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                  <span className="text-xs font-medium text-destructive">{stats.negative} meses -</span>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-[350px]">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradientPositive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="gradientNegative" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                      <stop offset="100%" stopColor="#dc2626" stopOpacity={0.8} />
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    opacity={0.3}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => {
                      if (Math.abs(value) >= 1000) {
                        return `R$${(value / 1000).toFixed(0)}k`;
                      }
                      return `R$${value}`;
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }} />
                  <Bar 
                    dataKey="resultado" 
                    radius={[6, 6, 6, 6]}
                    maxBarSize={50}
                    filter="url(#glow)"
                  >
                    {monthlyData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`}
                        fill={entry.resultado >= 0 ? "url(#gradientPositive)" : "url(#gradientNegative)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <CalendarDays className="w-12 h-12 opacity-20" />
                <span>Nenhum dado disponível</span>
              </div>
            )}
          </div>
          
          {monthlyData.length > 0 && stats.best && stats.worst && (
            <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
              <div className="p-3 rounded-xl bg-success/5 border border-success/20">
                <p className="text-xs text-muted-foreground mb-1">Melhor mês</p>
                <p className="text-sm font-semibold text-success">{stats.best.month}</p>
                <p className="text-lg font-bold text-success">
                  R$ {stats.best.resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                <p className="text-xs text-muted-foreground mb-1">Pior mês</p>
                <p className="text-sm font-semibold text-destructive">{stats.worst.month}</p>
                <p className="text-lg font-bold text-destructive">
                  R$ {stats.worst.resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MonthlyComparisonChart;
