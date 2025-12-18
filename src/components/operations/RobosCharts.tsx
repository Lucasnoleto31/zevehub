import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, AreaChart, Area, ReferenceLine, Cell, CartesianGrid,
  ComposedChart, Legend
} from "recharts";
import { TrendingUp, BarChart2, Clock, Calendar, ArrowUpRight, ArrowDownRight, Sparkles, Target, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
  iconColor = "from-primary/20 to-primary/5 text-primary",
  borderColor = "border-primary/20",
  delay = 0,
  badge,
}: { 
  children: React.ReactNode;
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor?: string;
  borderColor?: string;
  delay?: number;
  badge?: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
  >
    <Card className={cn(
      "border overflow-hidden backdrop-blur-sm transition-all duration-500",
      "bg-gradient-to-br from-card via-card to-accent/5",
      "hover:shadow-2xl hover:shadow-primary/5",
      borderColor
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-xl bg-gradient-to-br border shadow-lg",
              iconColor,
              borderColor
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          {badge}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {children}
      </CardContent>
    </Card>
  </motion.div>
);

const CustomTooltip = ({ active, payload, label, type = "default" }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const isPositive = value >= 0;
    
    return (
      <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl p-4 shadow-2xl">
        <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
        <div className="flex items-center gap-2">
          {isPositive ? (
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          )}
          <span className={cn(
            "text-lg font-bold",
            isPositive ? "text-emerald-400" : "text-rose-400"
          )}>
            {value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
        {payload[0].payload.operations && (
          <p className="text-xs text-muted-foreground mt-2">
            {payload[0].payload.operations} operações
          </p>
        )}
      </div>
    );
  }
  return null;
};

export const RobosCharts = ({
  performanceCurve,
  monthStats,
  yearlyStats,
  hourDistribution,
}: RobosChartsProps) => {
  // Calculate totals for badges
  const monthlyTotal = monthStats.reduce((sum, m) => sum + (m.result || 0), 0);
  const yearlyTotal = yearlyStats.reduce((sum, y) => sum + (y.result || 0), 0);
  const positiveMonths = monthStats.filter(m => m.result > 0).length;
  const positiveYears = yearlyStats.filter(y => y.result > 0).length;

  // Calculate performance curve stats
  const curveTotal = performanceCurve.length > 0 ? performanceCurve[performanceCurve.length - 1]?.value || 0 : 0;
  const curveMax = Math.max(...performanceCurve.map(p => p.value || 0));
  const curveMin = Math.min(...performanceCurve.map(p => p.value || 0));

  return (
    <div className="space-y-6">
      {/* Performance Curve - Premium Full Width */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className={cn(
          "border-2 overflow-hidden backdrop-blur-xl transition-all duration-500",
          "bg-gradient-to-br from-card via-card to-cyan-500/5",
          "hover:shadow-2xl hover:shadow-cyan-500/10",
          "border-cyan-500/20"
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div 
                  className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 border border-cyan-500/20 shadow-lg shadow-cyan-500/10"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                >
                  <TrendingUp className="w-6 h-6 text-cyan-400" />
                </motion.div>
                <div>
                  <CardTitle className="text-xl font-bold">Curva de Performance</CardTitle>
                  <CardDescription className="text-sm">Evolução do resultado acumulado ao longo do tempo</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold",
                  curveTotal >= 0 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                )}>
                  {curveTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={380}>
              <AreaChart data={performanceCurve}>
                <defs>
                  <linearGradient id="gradient-curve-premium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                    <stop offset="50%" stopColor="#22d3ee" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradient-line-premium" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#67e8f9" />
                  </linearGradient>
                  <filter id="glow-curve" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  opacity={0.1}
                  vertical={false}
                />
                
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
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const value = payload[0]?.value as number || 0;
                      return (
                        <div className="bg-card/95 backdrop-blur-xl border-2 border-cyan-500/30 rounded-xl p-4 shadow-2xl shadow-cyan-500/10">
                          <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
                          <div className="flex items-center gap-2">
                            {value >= 0 ? (
                              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4 text-rose-400" />
                            )}
                            <span className={cn(
                              "text-xl font-bold",
                              value >= 0 ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                
                <ReferenceLine 
                  y={0} 
                  stroke="hsl(var(--border))" 
                  strokeWidth={2}
                  strokeDasharray="6 6"
                />
                
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="url(#gradient-line-premium)"
                  strokeWidth={3} 
                  fill="url(#gradient-curve-premium)"
                  filter="url(#glow-curve)"
                />
              </AreaChart>
            </ResponsiveContainer>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4 p-4 rounded-xl bg-muted/20 border border-border/30">
              <div className="text-center">
                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Resultado Total</p>
                <p className={cn(
                  "text-lg font-bold mt-1",
                  curveTotal >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {curveTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <div className="text-center border-x border-border/30">
                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider flex items-center justify-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" /> Máximo
                </p>
                <p className="text-lg font-bold mt-1 text-emerald-400">
                  {curveMax.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider flex items-center justify-center gap-1">
                  <ArrowDownRight className="w-3 h-3 text-rose-400" /> Mínimo
                </p>
                <p className="text-lg font-bold mt-1 text-rose-400">
                  {curveMin.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Two Column Charts - Monthly & Yearly */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance - Premium */}
        <ChartCard
          title="Performance Mensal"
          description="Resultado por mês do ano"
          icon={Calendar}
          iconColor="from-violet-500/20 to-violet-500/5 text-violet-400"
          borderColor="border-violet-500/20"
          delay={0.2}
          badge={
            <div className="flex items-center gap-2">
              <div className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold",
                positiveMonths >= 6 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              )}>
                {positiveMonths}/12 meses +
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthStats} barCategoryGap="15%">
                <defs>
                  <linearGradient id="gradientPositiveMonth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ade80" stopOpacity={1} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="gradientNegativeMonth" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.7} />
                  </linearGradient>
                  <filter id="glowMonth" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  opacity={0.2}
                  vertical={false}
                />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 500 }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(value) => {
                    if (Math.abs(value) >= 1000) return `${(value/1000).toFixed(0)}k`;
                    return value.toString();
                  }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
                <Bar 
                  dataKey="result" 
                  radius={[6, 6, 6, 6]}
                  maxBarSize={40}
                >
                  {monthStats.map((entry, index) => (
                    <Cell 
                      key={`cell-month-${index}`}
                      fill={entry.result >= 0 ? "#4ade80" : "#f87171"}
                      stroke={entry.result >= 0 ? "#22c55e" : "#ef4444"}
                      strokeWidth={1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            
            {/* Summary footer */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
              <div className="text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Total</p>
                <p className={cn(
                  "text-sm font-bold",
                  monthlyTotal >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>
                  {monthlyTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Melhor</p>
                <p className="text-sm font-bold text-emerald-400">
                  {Math.max(...monthStats.map(m => m.result || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Pior</p>
                <p className="text-sm font-bold text-rose-400">
                  {Math.min(...monthStats.map(m => m.result || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* Yearly Performance - Premium */}
        <ChartCard
          title="Evolução Anual"
          description="Comparativo de resultado por ano"
          icon={Sparkles}
          iconColor="from-cyan-500/20 to-cyan-500/5 text-cyan-400"
          borderColor="border-cyan-500/20"
          delay={0.3}
          badge={
            <div className="flex items-center gap-2">
              <div className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold",
                positiveYears >= yearlyStats.length / 2
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              )}>
                {positiveYears}/{yearlyStats.length} anos +
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={yearlyStats} barCategoryGap="20%">
                <defs>
                  <linearGradient id="gradientPositiveYear" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={1} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="gradientNegativeYear" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity={1} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  opacity={0.2}
                  vertical={false}
                />
                <XAxis 
                  dataKey="year" 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 600 }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(value) => {
                    if (Math.abs(value) >= 1000) return `R$${(value/1000).toFixed(0)}k`;
                    return `R$${value}`;
                  }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }} />
                <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
                <Bar 
                  dataKey="result" 
                  radius={[8, 8, 8, 8]}
                  maxBarSize={60}
                >
                  {yearlyStats.map((entry, index) => (
                    <Cell 
                      key={`cell-year-${index}`}
                      fill={entry.result >= 0 ? "#22d3ee" : "#fb923c"}
                      stroke={entry.result >= 0 ? "#06b6d4" : "#f97316"}
                      strokeWidth={2}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            
            {/* Summary footer */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
              <div className="text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Total Acumulado</p>
                <p className={cn(
                  "text-sm font-bold",
                  yearlyTotal >= 0 ? "text-cyan-400" : "text-orange-400"
                )}>
                  {yearlyTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Melhor Ano</p>
                <p className="text-sm font-bold text-cyan-400">
                  {Math.max(...yearlyStats.map(y => y.result || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase text-muted-foreground">Média/Ano</p>
                <p className={cn(
                  "text-sm font-bold",
                  yearlyTotal / yearlyStats.length >= 0 ? "text-cyan-400" : "text-orange-400"
                )}>
                  {yearlyStats.length > 0 
                    ? (yearlyTotal / yearlyStats.length).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    : "R$ 0,00"
                  }
                </p>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Hour Distribution - Premium */}
      {(() => {
        const totalOperacoes = hourDistribution.reduce((sum, h) => sum + (h.operacoes || 0), 0);
        const totalResultado = hourDistribution.reduce((sum, h) => sum + (h.resultado || 0), 0);
        const bestHour = hourDistribution.reduce((best, h) => (h.resultado || 0) > (best?.resultado || -Infinity) ? h : best, hourDistribution[0]);
        const worstHour = hourDistribution.reduce((worst, h) => (h.resultado || 0) < (worst?.resultado || Infinity) ? h : worst, hourDistribution[0]);
        
        return (
          <ChartCard
            title="Distribuição por Horário"
            description="Performance e volume de operações por hora"
            icon={Clock}
            iconColor="from-amber-500/20 to-amber-500/5 text-amber-400"
            borderColor="border-amber-500/20"
            delay={0.4}
            badge={
              <div className="flex items-center gap-2">
                <div className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold",
                  totalResultado >= 0 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                )}>
                  {totalResultado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>
            }
          >
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={hourDistribution} barCategoryGap="8%">
                  <defs>
                    <linearGradient id="gradientPositiveHour" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={1} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="gradientNegativeHour" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="gradientLineHour" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    opacity={0.15}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 500 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} 
                    axisLine={false} 
                    tickLine={false}
                    label={{ 
                      value: 'Operações', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { fill: 'hsl(var(--muted-foreground))', fontSize: 10 }
                    }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#fbbf24", fontSize: 10 }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(value) => {
                      if (Math.abs(value) >= 1000) return `R$${(value/1000).toFixed(0)}k`;
                      return `R$${value}`;
                    }}
                    label={{ 
                      value: 'Resultado (R$)', 
                      angle: 90, 
                      position: 'insideRight',
                      style: { fill: '#fbbf24', fontSize: 10 }
                    }}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0]?.payload;
                        const positivas = data?.positivas || 0;
                        const negativas = data?.negativas || 0;
                        const resultado = data?.resultado || 0;
                        const total = positivas + negativas;
                        const winRate = total > 0 ? ((positivas / total) * 100).toFixed(1) : 0;
                        
                        return (
                          <div className="bg-card/95 backdrop-blur-xl border border-amber-500/30 rounded-xl p-4 shadow-2xl min-w-[180px]">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/30">
                              <Clock className="w-4 h-4 text-amber-400" />
                              <p className="text-base font-bold text-foreground">{label}</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                  <span className="text-xs text-muted-foreground">Positivas:</span>
                                </div>
                                <span className="text-sm font-bold text-emerald-400">{positivas}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                                  <span className="text-xs text-muted-foreground">Negativas:</span>
                                </div>
                                <span className="text-sm font-bold text-rose-400">{negativas}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-1.5">
                                  <Target className="w-2.5 h-2.5 text-sky-400" />
                                  <span className="text-xs text-muted-foreground">Taxa Acerto:</span>
                                </div>
                                <span className="text-sm font-bold text-sky-400">{winRate}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 pt-2 mt-2 border-t border-border/30">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                  <span className="text-xs text-muted-foreground">Resultado:</span>
                                </div>
                                <span className={cn(
                                  "text-sm font-bold",
                                  resultado >= 0 ? "text-amber-400" : "text-rose-400"
                                )}>
                                  {resultado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                    cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }}
                  />
                  <Bar 
                    yAxisId="left" 
                    dataKey="positivas" 
                    stackId="stack" 
                    fill="url(#gradientPositiveHour)"
                    name="Positivas" 
                    radius={[0, 0, 0, 0]}
                    maxBarSize={50}
                  />
                  <Bar 
                    yAxisId="left" 
                    dataKey="negativas" 
                    stackId="stack" 
                    fill="url(#gradientNegativeHour)"
                    name="Negativas" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone"
                    dataKey="resultado" 
                    stroke="url(#gradientLineHour)"
                    strokeWidth={3}
                    dot={{ fill: '#fbbf24', stroke: '#f59e0b', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, fill: '#fbbf24', stroke: '#fff', strokeWidth: 2 }}
                    name="Resultado"
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Summary footer */}
              <div className="grid grid-cols-4 gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                <div className="text-center">
                  <p className="text-[10px] uppercase text-muted-foreground">Total Ops</p>
                  <p className="text-sm font-bold text-foreground">{totalOperacoes}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase text-muted-foreground">Resultado</p>
                  <p className={cn(
                    "text-sm font-bold",
                    totalResultado >= 0 ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {totalResultado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase text-emerald-400/70 flex items-center justify-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> Melhor
                  </p>
                  <p className="text-sm font-bold text-emerald-400">
                    {bestHour?.hour || '-'} ({(bestHour?.resultado || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase text-rose-400/70 flex items-center justify-center gap-1">
                    <ArrowDownRight className="w-3 h-3" /> Pior
                  </p>
                  <p className="text-sm font-bold text-rose-400">
                    {worstHour?.hour || '-'} ({(worstHour?.resultado || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})
                  </p>
                </div>
              </div>
            </div>
          </ChartCard>
        );
      })()}
    </div>
  );
};

export default RobosCharts;
