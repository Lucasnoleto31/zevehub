import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from "recharts";
import { Calculator, TrendingUp, TrendingDown, AlertTriangle, Target, DollarSign, BarChart3, FileDown, Save, RotateCcw, Shield, Zap, Info } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AssetConfig {
  value: string;
  label: string;
  pontoValor: number;
}

const ASSETS: AssetConfig[] = [
  { value: "WIN", label: "Mini Índice (WIN) — R$ 0,20 / ponto", pontoValor: 0.2 },
  { value: "WDO", label: "Mini Dólar (WDO) — R$ 10,00 / ponto", pontoValor: 10 },
  { value: "CUSTOM", label: "Personalizado", pontoValor: 0 },
];

const GerenciamentoRisco = () => {
  // Form state
  const [capital, setCapital] = useState(5000);
  const [diasOperacionais, setDiasOperacionais] = useState(20);
  const [payoff, setPayoff] = useState(3);
  const [taxaAcerto, setTaxaAcerto] = useState(30);
  const [ativo, setAtivo] = useState("WIN");
  const [valorPontoCustom, setValorPontoCustom] = useState(0.2);
  const [stopPontos, setStopPontos] = useState(200);
  const [oportunidadesDia, setOportunidadesDia] = useState(3);

  // Calculated values
  const calculos = useMemo(() => {
    const pontoValor = ativo === "CUSTOM" ? valorPontoCustom : ASSETS.find(a => a.value === ativo)?.pontoValor || 0.2;
    const capitalDia = capital / diasOperacionais;
    const stopFinanceiro = stopPontos * pontoValor;
    const custoTotalContrato = stopFinanceiro * oportunidadesDia;
    const contratos = Math.floor(capitalDia / custoTotalContrato) || 1;
    const alvoOperacional = stopPontos * payoff;
    const alvoFinanceiro = alvoOperacional * pontoValor * contratos;
    const perdaFinanceira = stopFinanceiro * contratos;
    const resultadoDiario = (taxaAcerto / 100 * alvoFinanceiro) - ((1 - taxaAcerto / 100) * perdaFinanceira);
    const resultadoMensal = resultadoDiario * diasOperacionais;
    const minExpectedDay = capital * 0.01 / diasOperacionais;
    const drawdownWarning = resultadoMensal < -0.1 * capital;
    const riskScore = Math.min(100, Math.floor((capital / (stopFinanceiro * contratos * 20)) * 100));

    return {
      pontoValor,
      capitalDia,
      stopFinanceiro,
      custoTotalContrato,
      contratos,
      alvoOperacional,
      alvoFinanceiro,
      perdaFinanceira,
      resultadoDiario,
      resultadoMensal,
      minExpectedDay,
      drawdownWarning,
      riskScore,
    };
  }, [capital, diasOperacionais, payoff, taxaAcerto, ativo, valorPontoCustom, stopPontos, oportunidadesDia]);

  // Projection chart data
  const projectionData = useMemo(() => {
    const data = [];
    let cumulative = capital;
    for (let day = 1; day <= diasOperacionais; day++) {
      const daily = calculos.resultadoDiario;
      cumulative += daily;
      data.push({ day, daily: Math.round(daily * 100) / 100, cumulative: Math.round(cumulative * 100) / 100 });
    }
    return data;
  }, [diasOperacionais, calculos.resultadoDiario, capital]);

  // Sensitivity chart data
  const sensitivityData = useMemo(() => {
    const rates = [10, 20, 30, 40, 50, 60, 70, 80];
    return rates.map(p => {
      const daily = (p / 100 * calculos.alvoFinanceiro) - ((1 - p / 100) * calculos.perdaFinanceira);
      const monthly = daily * diasOperacionais;
      return { taxa: `${p}%`, monthly: Math.round(monthly * 100) / 100 };
    });
  }, [calculos.alvoFinanceiro, calculos.perdaFinanceira, diasOperacionais]);

  const getRiskLevel = (score: number) => {
    if (score <= 30) return { label: "Alto", color: "bg-red-500", textColor: "text-red-400" };
    if (score <= 60) return { label: "Médio", color: "bg-amber-500", textColor: "text-amber-400" };
    return { label: "Baixo", color: "bg-emerald-500", textColor: "text-emerald-400" };
  };

  const riskLevel = getRiskLevel(calculos.riskScore);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleReset = () => {
    setCapital(5000);
    setDiasOperacionais(20);
    setPayoff(3);
    setTaxaAcerto(30);
    setAtivo("WIN");
    setValorPontoCustom(0.2);
    setStopPontos(200);
    setOportunidadesDia(3);
    toast.success("Parâmetros resetados");
  };

  const handleCalculate = () => {
    toast.success("Plano calculado — veja as projeções e recomendações");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Gerenciamento de Risco - Zeve Hub", 14, 22);
    doc.setFontSize(12);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 32);

    doc.setFontSize(14);
    doc.text("Parâmetros", 14, 45);
    autoTable(doc, {
      startY: 50,
      head: [["Parâmetro", "Valor"]],
      body: [
        ["Capital", formatCurrency(capital)],
        ["Dias Operacionais", diasOperacionais.toString()],
        ["Payoff", `${payoff}x`],
        ["Taxa de Acerto", `${taxaAcerto}%`],
        ["Stop (pontos)", stopPontos.toString()],
        ["Oportunidades/dia", oportunidadesDia.toString()],
      ],
    });

    doc.setFontSize(14);
    doc.text("Resultados", 14, (doc as any).lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [["Métrica", "Valor"]],
      body: [
        ["Contratos Recomendados", calculos.contratos.toString()],
        ["Capital por Dia", formatCurrency(calculos.capitalDia)],
        ["Stop Financeiro", formatCurrency(calculos.stopFinanceiro)],
        ["Meta Diária", formatCurrency(calculos.resultadoDiario)],
        ["Projeção Mensal", formatCurrency(calculos.resultadoMensal)],
        ["Nível de Risco", riskLevel.label],
      ],
    });

    doc.save("gerenciamento-risco.pdf");
    toast.success("PDF exportado");
  };

  const handleExportCSV = () => {
    const rows = [
      ["Parâmetro", "Valor"],
      ["Capital", capital],
      ["Dias Operacionais", diasOperacionais],
      ["Payoff", payoff],
      ["Taxa de Acerto", taxaAcerto],
      ["Stop (pontos)", stopPontos],
      ["Oportunidades/dia", oportunidadesDia],
      [""],
      ["Métrica", "Valor"],
      ["Contratos Recomendados", calculos.contratos],
      ["Capital por Dia", calculos.capitalDia],
      ["Stop Financeiro", calculos.stopFinanceiro],
      ["Meta Diária", calculos.resultadoDiario],
      ["Projeção Mensal", calculos.resultadoMensal],
    ];

    const csvContent = rows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "gerenciamento-risco.csv";
    link.click();
    toast.success("CSV exportado");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Gerenciamento de Risco
          </h1>
          <p className="text-muted-foreground mt-1">Planeje contratos, metas e projeções com segurança</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <FileDown className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={handleCalculate}>
            <Save className="h-4 w-4 mr-1" /> Salvar Plano
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Panel */}
        <Card className="lg:col-span-4 border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Parâmetros do Trader
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Capital disponível (R$)</Label>
              <Input
                type="number"
                value={capital}
                onChange={(e) => setCapital(Number(e.target.value))}
                min={0}
              />
            </div>

            <div className="space-y-2">
              <Label>Dias operacionais (mês)</Label>
              <Input
                type="number"
                value={diasOperacionais}
                onChange={(e) => setDiasOperacionais(Number(e.target.value))}
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Payoff desejado (x)</Label>
              <Input
                type="number"
                value={payoff}
                onChange={(e) => setPayoff(Number(e.target.value))}
                min={0.1}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <Label>Taxa de acerto: {taxaAcerto}%</Label>
              <Slider
                value={[taxaAcerto]}
                onValueChange={(v) => setTaxaAcerto(v[0])}
                min={1}
                max={100}
                step={1}
                className="py-2"
              />
            </div>

            <div className="space-y-2">
              <Label>Ativo</Label>
              <Select value={ativo} onValueChange={setAtivo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSETS.map(asset => (
                    <SelectItem key={asset.value} value={asset.value}>
                      {asset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {ativo === "CUSTOM" && (
              <div className="space-y-2">
                <Label>Valor do ponto (R$)</Label>
                <Input
                  type="number"
                  value={valorPontoCustom}
                  onChange={(e) => setValorPontoCustom(Number(e.target.value))}
                  min={0.01}
                  step={0.01}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Stop (pontos)</Label>
              <Input
                type="number"
                value={stopPontos}
                onChange={(e) => setStopPontos(Number(e.target.value))}
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Oportunidades por dia</Label>
              <Input
                type="number"
                value={oportunidadesDia}
                onChange={(e) => setOportunidadesDia(Number(e.target.value))}
                min={1}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleCalculate} className="flex-1">
                <Zap className="h-4 w-4 mr-1" /> Calcular
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Contratos</span>
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <p className="text-3xl font-bold text-primary mt-2">{calculos.contratos}</p>
                <p className="text-xs text-muted-foreground">Recomendados</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Capital/dia</span>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-semibold mt-2">{formatCurrency(calculos.capitalDia)}</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Stop financeiro</span>
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </div>
                <p className="text-xl font-semibold mt-2">{formatCurrency(calculos.stopFinanceiro)}</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Custo 3 oport.</span>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xl font-semibold mt-2">{formatCurrency(calculos.custoTotalContrato)}</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ganho/operação</span>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-xl font-semibold text-emerald-400 mt-2">{formatCurrency(calculos.alvoFinanceiro)}</p>
              </CardContent>
            </Card>

            <Card className={`border-2 ${calculos.resultadoDiario >= 0 ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Meta diária</span>
                  {calculos.resultadoDiario >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  )}
                </div>
                <p className={`text-2xl font-bold mt-2 ${calculos.resultadoDiario >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(calculos.resultadoDiario)}
                </p>
                <p className="text-xs text-muted-foreground">Projetada</p>
              </CardContent>
            </Card>
          </div>

          {/* Risk Indicator */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Indicador de Risco
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${riskLevel.color} transition-all duration-500`}
                      style={{ width: `${calculos.riskScore}%` }}
                    />
                  </div>
                </div>
                <Badge variant="outline" className={riskLevel.textColor}>
                  {riskLevel.label} ({calculos.riskScore}%)
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Indicador rápido do nível de risco considerando capital, stop e contratos.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-7 border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Projeção de Saldo — Diário e Acumulado</CardTitle>
            <CardDescription>Evolução do saldo com base na taxa de acerto selecionada</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={projectionData}>
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  name="Acumulado"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                />
                <Line
                  type="monotone"
                  dataKey="daily"
                  name="Diário"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5 border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Sensibilidade por Taxa de Acerto</CardTitle>
            <CardDescription>Resultado mensal projetado para diferentes taxas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sensitivityData}>
                <XAxis dataKey="taxa" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar
                  dataKey="monthly"
                  name="Mensal"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Metrics & Recommendations */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            Métricas & Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm">Meta diária mínima</h4>
              <p className="text-xl font-semibold text-primary mt-1">{formatCurrency(calculos.minExpectedDay)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Sugerimos {">="} 1% do capital/dia como meta de sustentabilidade.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm">Recomendação de contratos</h4>
              <p className="text-xl font-semibold text-primary mt-1">{calculos.contratos}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ajuste contratos se resultado diário projetado for negativo.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm">Aviso de drawdown</h4>
              <p className={`text-xl font-semibold mt-1 ${calculos.drawdownWarning ? 'text-red-400' : 'text-emerald-400'}`}>
                {calculos.drawdownWarning ? 'ATENÇÃO' : 'OK'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Se perda acumulada {">"} 10% do capital, pare e reavise.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-4 border-t border-border/50">
        <p>Informação educacional — não constitui recomendação individual. Verifique seus limites e risco.</p>
      </div>
    </div>
  );
};

export default GerenciamentoRisco;
