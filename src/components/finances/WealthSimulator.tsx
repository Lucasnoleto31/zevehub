import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, DollarSign, Calendar } from "lucide-react";

export const WealthSimulator = () => {
  const [initialCapital, setInitialCapital] = useState(10000);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [annualReturn, setAnnualReturn] = useState(10);
  const [timePeriod, setTimePeriod] = useState(12);

  const simulationData = useMemo(() => {
    const data = [];
    let currentCapital = initialCapital;
    const monthlyRate = annualReturn / 100 / 12;

    for (let month = 0; month <= timePeriod; month++) {
      const interestOnly = initialCapital * Math.pow(1 + monthlyRate, month);
      
      data.push({
        month: month,
        label: `Mês ${month}`,
        capital: parseFloat(currentCapital.toFixed(2)),
        invested: parseFloat((initialCapital + (monthlyContribution * month)).toFixed(2)),
        earnings: parseFloat((currentCapital - initialCapital - (monthlyContribution * month)).toFixed(2)),
      });

      currentCapital = (currentCapital + monthlyContribution) * (1 + monthlyRate);
    }

    return data;
  }, [initialCapital, monthlyContribution, annualReturn, timePeriod]);

  const finalValues = simulationData[simulationData.length - 1];
  const totalInvested = finalValues.invested;
  const totalEarnings = finalValues.earnings;
  const finalCapital = finalValues.capital;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Simulador de Patrimônio
          </CardTitle>
          <CardDescription>
            Projete a evolução do seu patrimônio ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initialCapital">Capital Inicial (R$)</Label>
              <Input
                id="initialCapital"
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                min={0}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="monthlyContribution">Aporte Mensal (R$)</Label>
              <Input
                id="monthlyContribution"
                type="number"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                min={0}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="annualReturn">Rentabilidade Anual (%)</Label>
              <Input
                id="annualReturn"
                type="number"
                value={annualReturn}
                onChange={(e) => setAnnualReturn(Number(e.target.value))}
                min={0}
                step={0.1}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timePeriod">Período (meses)</Label>
              <Select value={timePeriod.toString()} onValueChange={(v) => setTimePeriod(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                  <SelectItem value="24">24 meses</SelectItem>
                  <SelectItem value="36">36 meses</SelectItem>
                  <SelectItem value="60">60 meses</SelectItem>
                  <SelectItem value="120">120 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Investido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalInvested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Rendimento Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {totalEarnings.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Patrimônio Final
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {finalCapital.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução do Patrimônio</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={simulationData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="label" 
                    className="text-xs"
                    interval={Math.floor(timePeriod / 12)}
                  />
                  <YAxis 
                    className="text-xs"
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="invested" 
                    stackId="1"
                    stroke="hsl(var(--muted-foreground))" 
                    fill="hsl(var(--muted))" 
                    name="Total Investido"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="earnings" 
                    stackId="1"
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.6}
                    name="Rendimentos"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="capital" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                    name="Patrimônio Total"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
