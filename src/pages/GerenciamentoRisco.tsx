import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AlertCircle, Target, Crosshair, TrendingUp, Calculator, DollarSign } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function GerenciamentoRisco() {
  const [capital, setCapital] = useState(5000);
  const [payoff, setPayoff] = useState(3);
  const [stopPontos, setStopPontos] = useState(200);
  const [taxaAcerto, setTaxaAcerto] = useState(30);

  // Cálculos base
  const stopDiario = useMemo(() => capital / 20, [capital]);
  const contratosWIN = useMemo(() => Math.floor(stopDiario / (stopPontos * 0.20)), [stopDiario, stopPontos]);
  const contratosWDO = useMemo(() => Math.floor(stopDiario / (stopPontos * 0.50)), [stopDiario, stopPontos]);
  const alvoOperacional = useMemo(() => stopPontos * payoff, [stopPontos, payoff]);

  // Projeção mensal
  const diasGain = useMemo(() => Math.round(20 * (taxaAcerto / 100)), [taxaAcerto]);
  const diasLoss = useMemo(() => 20 - diasGain, [diasGain]);
  
  const resultadoGain_WIN = useMemo(() => 
    payoff * (stopPontos * 0.20) * contratosWIN, 
    [payoff, stopPontos, contratosWIN]
  );
  
  const resultadoLoss_WIN = useMemo(() => 
    (stopPontos * 0.20) * contratosWIN, 
    [stopPontos, contratosWIN]
  );
  
  const resultadoBrutoMes_WIN = useMemo(() => 
    (diasGain * resultadoGain_WIN) - (diasLoss * resultadoLoss_WIN), 
    [diasGain, diasLoss, resultadoGain_WIN, resultadoLoss_WIN]
  );
  
  const ir_WIN = useMemo(() => 
    resultadoBrutoMes_WIN > 0 ? resultadoBrutoMes_WIN * 0.20 : 0, 
    [resultadoBrutoMes_WIN]
  );
  
  const resultadoLiquido_WIN = useMemo(() => 
    resultadoBrutoMes_WIN - ir_WIN, 
    [resultadoBrutoMes_WIN, ir_WIN]
  );

  // Gráfico de projeção mensal
  const gerarGraficoMensal = useMemo(() => {
    const data = [];
    let saldoAcumulado = 0;
    const totalDias = 20;
    
    for (let i = 1; i <= totalDias; i++) {
      const probabilidadeAcerto = taxaAcerto / 100;
      const isGain = i <= diasGain;
      
      if (isGain) {
        saldoAcumulado += resultadoGain_WIN;
      } else {
        saldoAcumulado -= resultadoLoss_WIN;
      }
      
      data.push({
        dia: `Dia ${i}`,
        saldo: saldoAcumulado,
      });
    }
    return data;
  }, [taxaAcerto, diasGain, resultadoGain_WIN, resultadoLoss_WIN]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const cardsResumo = [
    { 
      id: "stopDiario", 
      title: "Stop Diário", 
      icon: AlertCircle, 
      value: formatCurrency(stopDiario), 
      description: "Capital dividido por 20 pregões", 
      color: "text-red-400" 
    },
    { 
      id: "contratosWIN", 
      title: "Contratos WIN", 
      icon: Target, 
      value: contratosWIN.toString(), 
      description: "Tamanho de mão Mini Índice", 
      color: "text-cyan-400" 
    },
    { 
      id: "contratosWDO", 
      title: "Contratos WDO", 
      icon: Target, 
      value: contratosWDO.toString(), 
      description: "Tamanho de mão Mini Dólar", 
      color: "text-amber-400" 
    },
    { 
      id: "alvoOperacional", 
      title: "Alvo Operacional (pts)", 
      icon: Crosshair, 
      value: `${alvoOperacional} pts`, 
      description: "Stop multiplicado pelo payoff", 
      color: "text-purple-400" 
    },
  ];

  const cardsProjecao = [
    { 
      id: "brutoWIN", 
      title: "Resultado Bruto WIN", 
      icon: TrendingUp, 
      value: formatCurrency(resultadoBrutoMes_WIN), 
      color: resultadoBrutoMes_WIN >= 0 ? "text-green-400" : "text-red-400" 
    },
    { 
      id: "irWIN", 
      title: "IR (20%)", 
      icon: Calculator, 
      value: formatCurrency(ir_WIN), 
      color: "text-orange-400" 
    },
    { 
      id: "liquidoWIN", 
      title: "Resultado Líquido", 
      icon: DollarSign, 
      value: formatCurrency(resultadoLiquido_WIN), 
      color: resultadoLiquido_WIN >= 0 ? "text-emerald-400" : "text-red-400" 
    },
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
            Calcule mão adequada, risco diário e projeção mensal
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

        {/* Resumo Operacional */}
        <div>
          <h2 className="text-xl font-semibold text-cyan-400 mb-4">Resumo Operacional</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cardsResumo.map((card) => (
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

        {/* Projeção Mensal */}
        <div>
          <h2 className="text-xl font-semibold text-cyan-400 mb-2">Projeção Mensal Realista</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Baseado em {diasGain} dias de gain e {diasLoss} dias de loss ({taxaAcerto}% de acerto)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {cardsProjecao.map((card) => (
              <Card key={card.id} className="bg-[#111827]/80 border-cyan-500/20 backdrop-blur-sm hover:border-cyan-500/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{card.title}</p>
                      <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                    </div>
                    <card.icon className={`h-6 w-6 ${card.color} opacity-60`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Chart Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-cyan-400 mb-2">Evolução do Mês (20 pregões)</h2>
          </div>

          <Card className="bg-[#111827]/80 border-cyan-500/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-cyan-400">Projeção Mini Índice (WIN)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={gerarGraficoMensal}>
                    <XAxis dataKey="dia" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #0ea5e9' }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: number) => [formatCurrency(value), 'Saldo']}
                    />
                    <Line type="monotone" dataKey="saldo" stroke="#00E0FF" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
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
