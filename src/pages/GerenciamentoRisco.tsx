import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AlertCircle, TrendingDown, BarChart3, Target, Trophy, Crosshair } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function GerenciamentoRisco() {
  const [capital, setCapital] = useState(5000);
  const [payoff, setPayoff] = useState(3);
  const [stopPontos, setStopPontos] = useState(200);
  const [taxaAcerto, setTaxaAcerto] = useState(50);

  const stopDiario = useMemo(() => capital / 20, [capital]);
  const stopFinanceiroWIN = useMemo(() => stopPontos * 0.20, [stopPontos]);
  const stopFinanceiroWDO = useMemo(() => stopPontos * 0.50, [stopPontos]);
  const stopsPossiveisWIN = useMemo(() => stopDiario / stopFinanceiroWIN, [stopDiario, stopFinanceiroWIN]);
  const stopsPossiveisWDO = useMemo(() => stopDiario / stopFinanceiroWDO, [stopDiario, stopFinanceiroWDO]);
  const contratosWIN = useMemo(() => Math.floor(stopsPossiveisWIN), [stopsPossiveisWIN]);
  const contratosWDO = useMemo(() => Math.floor(stopsPossiveisWDO), [stopsPossiveisWDO]);
  const metaDiaria = useMemo(() => payoff * stopDiario, [payoff, stopDiario]);
  const alvoOperacional = useMemo(() => stopPontos * payoff, [stopPontos, payoff]);

  const gerarProjecaoMensal = (valorPonto: number) => {
    const dias = 20;
    const data = [];
    let saldoAcumulado = 0;
    const ganhoOp = stopPontos * payoff * valorPonto * (valorPonto === 0.20 ? contratosWIN : contratosWDO);
    const perdaOp = stopPontos * valorPonto * (valorPonto === 0.20 ? contratosWIN : contratosWDO);

    for (let i = 1; i <= dias; i++) {
      const acertou = Math.random() * 100 < taxaAcerto;
      saldoAcumulado += acertou ? ganhoOp : -perdaOp;
      data.push({
        dia: `Dia ${i}`,
        saldo: saldoAcumulado,
      });
    }
    return data;
  };

  const projecaoWIN = useMemo(() => gerarProjecaoMensal(0.20), [capital, payoff, stopPontos, taxaAcerto, contratosWIN]);
  const projecaoWDO = useMemo(() => gerarProjecaoMensal(0.50), [capital, payoff, stopPontos, taxaAcerto, contratosWDO]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const cards = [
    { id: "stopDiario", title: "Stop Diário", icon: AlertCircle, value: formatCurrency(stopDiario), description: "Capital dividido por 20 pregões", color: "text-red-400" },
    { id: "stopFinanceiroWIN", title: "Stop Financeiro (WIN)", icon: TrendingDown, value: formatCurrency(stopFinanceiroWIN), description: "Stop em pontos x R$0,20", color: "text-orange-400" },
    { id: "stopFinanceiroWDO", title: "Stop Financeiro (WDO)", icon: TrendingDown, value: formatCurrency(stopFinanceiroWDO), description: "Stop em pontos x R$0,50", color: "text-orange-400" },
    { id: "stopsPossiveisWIN", title: "Stops Possíveis (WIN)", icon: BarChart3, value: stopsPossiveisWIN.toFixed(2), description: "Baseado no stop diário", color: "text-blue-400" },
    { id: "stopsPossiveisWDO", title: "Stops Possíveis (WDO)", icon: BarChart3, value: stopsPossiveisWDO.toFixed(2), description: "Baseado no stop diário", color: "text-blue-400" },
    { id: "contratosWIN", title: "Contratos (WIN)", icon: Target, value: contratosWIN.toString(), description: "Quantidade por operação", color: "text-cyan-400" },
    { id: "contratosWDO", title: "Contratos (WDO)", icon: Target, value: contratosWDO.toString(), description: "Quantidade por operação", color: "text-cyan-400" },
    { id: "metaDiaria", title: "Meta Diária", icon: Trophy, value: formatCurrency(metaDiaria), description: "Payoff x stop diário", color: "text-green-400" },
    { id: "alvoOperacional", title: "Alvo Operacional", icon: Crosshair, value: `${alvoOperacional} pts`, description: "Stop x payoff", color: "text-purple-400" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1F] via-[#111827] to-[#0A0F1F] p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Gerenciamento de Risco
          </h1>
          <p className="text-muted-foreground">
            Simule estratégias, contratos possíveis e projeções mensais
          </p>
        </div>

        {/* Inputs Section */}
        <Card className="bg-[#111827]/80 border-cyan-500/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-cyan-400">Dados da Estratégia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="capital" className="text-white/80">Capital (R$)</Label>
                <Input
                  id="capital"
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value) || 0)}
                  placeholder="Ex: 5000"
                  className="bg-[#0A0F1F] border-cyan-500/30 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payoff" className="text-white/80">Payoff (R:R)</Label>
                <Input
                  id="payoff"
                  type="number"
                  value={payoff}
                  onChange={(e) => setPayoff(Number(e.target.value) || 1)}
                  placeholder="Ex: 3"
                  className="bg-[#0A0F1F] border-cyan-500/30 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stopPontos" className="text-white/80">Stop em Pontos</Label>
                <Input
                  id="stopPontos"
                  type="number"
                  value={stopPontos}
                  onChange={(e) => setStopPontos(Number(e.target.value) || 1)}
                  placeholder="Ex: 200"
                  className="bg-[#0A0F1F] border-cyan-500/30 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Taxa de Acerto: {taxaAcerto}%</Label>
                <Slider
                  value={[taxaAcerto]}
                  onValueChange={(v) => setTaxaAcerto(v[0])}
                  min={10}
                  max={99}
                  step={1}
                  className="mt-3"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div>
          <h2 className="text-xl font-semibold text-cyan-400 mb-4">Resultados do Gerenciamento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <Card key={card.id} className="bg-[#111827]/80 border-cyan-500/20 backdrop-blur-sm hover:border-cyan-500/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{card.title}</p>
                      <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                      <p className="text-xs text-muted-foreground">{card.description}</p>
                    </div>
                    <card.icon className={`h-6 w-6 ${card.color} opacity-60`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-cyan-400 mb-2">Projeção de Resultado Mensal</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Com base na taxa de acerto, payoff e risco da estratégia
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-[#111827]/80 border-cyan-500/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-400">Projeção Mini Índice (WIN)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={projecaoWIN}>
                      <XAxis dataKey="dia" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #0ea5e9' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value: number) => [formatCurrency(value), 'Saldo']}
                      />
                      <Line type="monotone" dataKey="saldo" stroke="#00C6FF" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#111827]/80 border-cyan-500/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-400">Projeção Mini Dólar (WDO)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={projecaoWDO}>
                      <XAxis dataKey="dia" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #f59e0b' }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value: number) => [formatCurrency(value), 'Saldo']}
                      />
                      <Line type="monotone" dataKey="saldo" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-6 border-t border-cyan-500/20">
          <p className="text-muted-foreground text-sm italic">
            Gerenciamento de risco — o trader que sobrevive é o que vence.
          </p>
        </div>
      </div>
    </div>
  );
}
