import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { ShieldCheck, TrendingUp, Target, DollarSign, Calendar, BarChart3, FileDown, FileSpreadsheet, Info, Loader2, Check, Percent, Zap, Crosshair, Wallet } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { PremiumPageLayout, PremiumCard, PremiumSection } from "@/components/layout/PremiumPageLayout";

const GerenciamentoRisco = () => {
  const [capital, setCapital] = useState(5000);
  const [payoff, setPayoff] = useState(3);
  const [stopPontos, setStopPontos] = useState(200);
  const [taxaAcerto, setTaxaAcerto] = useState(30);
  const [ativo, setAtivo] = useState<"WIN" | "WDO">("WIN");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setUserId(user.id);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!roleData);

      const { data: settings } = await supabase
        .from("risk_management_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (settings) {
        setCapital(Number(settings.capital));
        setPayoff(Number(settings.payoff));
        setStopPontos(Number(settings.stop_pontos));
        setTaxaAcerto(Number(settings.taxa_acerto));
        setAtivo(settings.ativo as "WIN" | "WDO");
      }
      
      setIsLoading(false);
    };
    
    loadSettings();
  }, []);

  useEffect(() => {
    if (!userId || isLoading) return;

    const saveSettings = async () => {
      setIsSaving(true);
      
      const { error } = await supabase
        .from("risk_management_settings")
        .upsert({
          user_id: userId,
          capital,
          payoff,
          stop_pontos: stopPontos,
          taxa_acerto: taxaAcerto,
          ativo,
        }, { onConflict: "user_id" });

      if (error) {
        console.error("Erro ao salvar configurações:", error);
      }
      
      setIsSaving(false);
    };

    const debounceTimer = setTimeout(saveSettings, 500);
    return () => clearTimeout(debounceTimer);
  }, [userId, capital, payoff, stopPontos, taxaAcerto, ativo, isLoading]);

  const calc = useMemo(() => {
    const pointValue = ativo === "WIN" ? 0.20 : 10;
    const stopDiario = capital / 20;
    const stopPorOperacao = stopDiario / 3;
    const contratos = Math.floor((stopDiario / 3 / pointValue) / stopPontos);
    const alvoOperacional = stopPontos * payoff;
    const gains = Math.round((taxaAcerto / 100) * 20);
    const loss = 20 - gains;
    const ganhoDiario = payoff * stopDiario;
    const perdaDiaria = stopDiario;
    const mensalBruto = (gains * ganhoDiario) - (loss * perdaDiaria);
    const mensalIr = mensalBruto > 0 ? mensalBruto * 0.20 : 0;
    const mensalLiquido = mensalBruto - mensalIr;

    let acumuladoBruto = 0;
    let acumuladoLiquido = 0;
    const projecao = Array.from({ length: 6 }, (_, i) => {
      acumuladoBruto += mensalBruto;
      acumuladoLiquido += mensalLiquido;
      return {
        mes: `Mês ${i + 1}`,
        bruto: mensalBruto,
        ir: mensalIr,
        liquido: mensalLiquido,
        acumuladoBruto,
        acumuladoLiquido,
      };
    });

    return {
      pointValue,
      stopDiario,
      stopPorOperacao,
      contratos,
      alvoOperacional,
      gains,
      loss,
      ganhoDiario,
      perdaDiaria,
      mensalBruto,
      mensalIr,
      mensalLiquido,
      projecao,
    };
  }, [capital, payoff, stopPontos, taxaAcerto, ativo]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatCurrencyPDF = (value: number) => {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const today = new Date().toLocaleDateString("pt-BR");

      doc.setFillColor(11, 18, 32);
      doc.rect(0, 0, pageWidth, 50, "F");

      doc.setFillColor(59, 130, 246);
      doc.rect(0, 50, pageWidth, 3, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(59, 130, 246);
      doc.text("GERENCIAMENTO DE RISCO", pageWidth / 2, 25, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text("Relatorio de Projecao Financeira", pageWidth / 2, 35, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(`Gerado em: ${today}`, pageWidth / 2, 45, { align: "center" });

      doc.setFillColor(26, 35, 50);
      doc.roundedRect(14, 60, pageWidth - 28, 45, 3, 3, "F");

      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246);
      doc.text("PARAMETROS DO OPERACIONAL", 20, 72);

      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      const params = [
        ["Ativo:", ativo === "WIN" ? "Mini Indice (WIN)" : "Mini Dolar (WDO)"],
        ["Capital:", `R$ ${formatCurrencyPDF(capital)}`],
        ["Payoff:", `${payoff}:1`],
        ["Stop (pontos):", stopPontos.toString()],
        ["Taxa de Acerto:", `${taxaAcerto}%`],
      ];

      let paramY = 82;
      params.forEach((param, idx) => {
        const xPos = idx < 3 ? 20 : 110;
        const yPos = idx < 3 ? paramY + idx * 8 : paramY + (idx - 3) * 8;
        doc.setTextColor(150, 150, 150);
        doc.text(param[0], xPos, yPos);
        doc.setTextColor(255, 255, 255);
        doc.text(param[1], xPos + 35, yPos);
      });

      doc.setFillColor(26, 35, 50);
      doc.roundedRect(14, 112, pageWidth - 28, 35, 3, 3, "F");

      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246);
      doc.text("RESUMO OPERACIONAL", 20, 124);

      doc.setFontSize(10);
      const summary = [
        ["Contratos:", calc.contratos.toString(), "Stop Diario:", `R$ ${formatCurrencyPDF(calc.stopDiario)}`],
        ["Meta Diaria:", `R$ ${formatCurrencyPDF(calc.ganhoDiario)}`, "Dias Gain/Loss:", `${calc.gains} / ${calc.loss}`],
      ];

      let summaryY = 134;
      summary.forEach((row, idx) => {
        doc.setTextColor(150, 150, 150);
        doc.text(row[0], 20, summaryY + idx * 8);
        doc.setTextColor(16, 185, 129);
        doc.text(row[1], 50, summaryY + idx * 8);
        doc.setTextColor(150, 150, 150);
        doc.text(row[2], 100, summaryY + idx * 8);
        doc.setTextColor(16, 185, 129);
        doc.text(row[3], 140, summaryY + idx * 8);
      });

      doc.setFontSize(14);
      doc.setTextColor(59, 130, 246);
      doc.text("PROJECAO 6 MESES", 20, 160);

      const tableData = calc.projecao.map((row) => [
        row.mes,
        `R$ ${formatCurrencyPDF(row.bruto)}`,
        `R$ ${formatCurrencyPDF(row.ir)}`,
        `R$ ${formatCurrencyPDF(row.liquido)}`,
        `R$ ${formatCurrencyPDF(row.acumuladoBruto)}`,
        `R$ ${formatCurrencyPDF(row.acumuladoLiquido)}`,
      ]);

      autoTable(doc, {
        startY: 165,
        head: [["Mes", "Bruto", "IR (20%)", "Liquido", "Acum. Bruto", "Acum. Liquido"]],
        body: tableData,
        theme: "plain",
        styles: {
          fillColor: [26, 35, 50],
          textColor: [200, 200, 200],
          fontSize: 9,
          cellPadding: 4,
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [20, 28, 40],
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30, halign: "right" },
          2: { cellWidth: 28, halign: "right" },
          3: { cellWidth: 30, halign: "right" },
          4: { cellWidth: 35, halign: "right" },
          5: { cellWidth: 35, halign: "right" },
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(14, finalY, pageWidth - 28, 25, 3, 3, "F");

      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text("RESULTADO FINAL (6 MESES)", 20, finalY + 10);
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      const finalLiquido = calc.projecao[calc.projecao.length - 1].acumuladoLiquido;
      doc.text(`R$ ${formatCurrencyPDF(finalLiquido)}`, pageWidth - 20, finalY + 15, { align: "right" });

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Zeve Hub - Gerenciamento de Risco | Este documento e apenas uma projecao e nao garante resultados futuros.", pageWidth / 2, 285, { align: "center" });

      doc.save(`gerenciamento-risco-${today.replace(/\//g, "-")}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  const exportToExcel = () => {
    try {
      const today = new Date().toLocaleDateString("pt-BR");
      
      const parametros = [
        ["GERENCIAMENTO DE RISCO - PARAMETROS"],
        [],
        ["Ativo", ativo === "WIN" ? "Mini Indice (WIN)" : "Mini Dolar (WDO)"],
        ["Capital", capital],
        ["Payoff", `${payoff}:1`],
        ["Stop (pontos)", stopPontos],
        ["Taxa de Acerto", `${taxaAcerto}%`],
        [],
        ["RESUMO OPERACIONAL"],
        [],
        ["Contratos Permitidos", calc.contratos],
        ["Stop Diario", calc.stopDiario],
        ["Stop por Operacao", calc.stopPorOperacao],
        ["Meta Diaria", calc.ganhoDiario],
        ["Dias Gain", calc.gains],
        ["Dias Loss", calc.loss],
        ["Resultado Mensal Bruto", calc.mensalBruto],
        ["Resultado Mensal Liquido", calc.mensalLiquido],
      ];

      const projecaoData = [
        ["Mes", "Bruto (R$)", "IR (R$)", "Liquido (R$)", "Acumulado Bruto (R$)", "Acumulado Liquido (R$)"],
        ...calc.projecao.map((row) => [
          row.mes,
          row.bruto,
          row.ir,
          row.liquido,
          row.acumuladoBruto,
          row.acumuladoLiquido,
        ]),
      ];

      const wb = XLSX.utils.book_new();
      
      const wsParams = XLSX.utils.aoa_to_sheet(parametros);
      wsParams["!cols"] = [{ wch: 25 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsParams, "Parametros");

      const wsProjecao = XLSX.utils.aoa_to_sheet(projecaoData);
      wsProjecao["!cols"] = [
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
        { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, wsProjecao, "Projecao 6 Meses");

      XLSX.writeFile(wb, `gerenciamento-risco-${today.replace(/\//g, "-")}.xlsx`);
      toast.success("Excel exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      toast.error("Erro ao exportar Excel");
    }
  };

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    tooltip,
    variant = "default"
  }: { 
    icon: any; 
    label: string; 
    value: string; 
    tooltip?: string;
    variant?: "default" | "success" | "warning" | "destructive"
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 ${
            variant === "success" ? "bg-success/5 border-success/20" : 
            variant === "warning" ? "bg-warning/5 border-warning/20" : 
            variant === "destructive" ? "bg-destructive/5 border-destructive/20" :
            "bg-card"
          }`}>
            <div className={`absolute top-0 left-0 w-1 h-full ${
              variant === "success" ? "bg-success" : 
              variant === "warning" ? "bg-warning" : 
              variant === "destructive" ? "bg-destructive" :
              "bg-primary"
            }`} />
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground font-medium">{label}</p>
                  <p className={`text-2xl font-bold ${
                    variant === "success" ? "text-success" : 
                    variant === "warning" ? "text-warning" : 
                    variant === "destructive" ? "text-destructive" :
                    "text-foreground"
                  }`}>
                    {value}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${
                  variant === "success" ? "bg-success/10" : 
                  variant === "warning" ? "bg-warning/10" : 
                  variant === "destructive" ? "bg-destructive/10" :
                  "bg-primary/10"
                }`}>
                  <Icon className={`w-5 h-5 ${
                    variant === "success" ? "text-success" : 
                    variant === "warning" ? "text-warning" : 
                    variant === "destructive" ? "text-destructive" :
                    "text-primary"
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        {tooltip && (
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );

  const headerActions = !isLoading && (
    <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-muted/50">
      {isSaving ? (
        <>
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <span className="text-muted-foreground">Salvando...</span>
        </>
      ) : (
        <>
          <Check className="h-4 w-4 text-success" />
          <span className="text-muted-foreground">Salvo</span>
        </>
      )}
    </div>
  );

  return (
    <PremiumPageLayout
      title="Gerenciamento de Risco"
      subtitle="Calcule mão adequada e projeção mensal"
      icon={ShieldCheck}
      backTo="/dashboard"
      maxWidth="full"
      headerActions={headerActions}
    >

      {/* Parâmetros */}
      <PremiumCard variant="glow">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
                  Parâmetros do Operacional
                </CardTitle>
                <CardDescription>Configure os parâmetros para calcular seu gerenciamento de risco</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Ativo</Label>
                    <Select value={ativo} onValueChange={(v) => setAtivo(v as "WIN" | "WDO")}>
                      <SelectTrigger className="h-11 bg-background/50 border-border/50 focus:border-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WIN">Mini Índice (WIN) – R$0,20/pt</SelectItem>
                        <SelectItem value="WDO">Mini Dólar (WDO) – R$10,00/pt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Capital (R$)</Label>
                    <Input
                      type="number"
                      value={capital}
                      onChange={(e) => setCapital(Number(e.target.value))}
                      className="h-11 bg-background/50 border-border/50 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Payoff (R:R)</Label>
                    <Input
                      type="number"
                      value={payoff}
                      onChange={(e) => setPayoff(Number(e.target.value))}
                      className="h-11 bg-background/50 border-border/50 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Stop (pontos)</Label>
                    <Input
                      type="number"
                      value={stopPontos}
                      onChange={(e) => setStopPontos(Number(e.target.value))}
                      className="h-11 bg-background/50 border-border/50 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Taxa de Acerto: {taxaAcerto}%</Label>
                    <div className="pt-2">
                      <Slider
                        value={[taxaAcerto]}
                        onValueChange={(v) => setTaxaAcerto(v[0])}
                        min={10}
                        max={99}
                        step={1}
                        className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                      />
                    </div>
                  </div>
              </div>
            </CardContent>
          </PremiumCard>

          {/* Resumo Operacional */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={BarChart3}
                label="Contratos Permitidos"
                value={calc.contratos.toString()}
                tooltip={`Fórmula: floor((Stop Diário / 3 / ${calc.pointValue.toFixed(2)}) / ${stopPontos})`}
                variant="default"
              />
              <StatCard
                icon={Crosshair}
                label="Stop Diário"
                value={formatCurrency(calc.stopDiario)}
                tooltip="Fórmula: Capital / 20 dias úteis"
                variant="destructive"
              />
              <StatCard
                icon={Target}
                label="Stop por Operação"
                value={formatCurrency(calc.stopPorOperacao)}
                tooltip="Fórmula: Stop Diário / 3 oportunidades"
                variant="destructive"
              />
              <StatCard
                icon={TrendingUp}
                label="Meta Diária"
                value={formatCurrency(calc.ganhoDiario)}
                tooltip="Fórmula: Payoff × Stop Diário"
                variant="success"
              />
          </div>

          {/* Resultado Mensal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <PremiumCard>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground font-medium">Dias de Gain/Loss</p>
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 text-center p-3 rounded-lg bg-success/10 border border-success/20">
                      <p className="text-2xl font-bold text-success">{calc.gains}</p>
                      <p className="text-xs text-muted-foreground">Gains</p>
                    </div>
                    <div className="flex-1 text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-2xl font-bold text-destructive">{calc.loss}</p>
                      <p className="text-xs text-muted-foreground">Loss</p>
                    </div>
                  </div>
                </CardContent>
            </PremiumCard>

            <PremiumCard>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground font-medium">Resultado Mensal</p>
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Bruto</span>
                      <span className={`font-semibold ${calc.mensalBruto >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(calc.mensalBruto)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">IR (20%)</span>
                      <span className="font-semibold text-warning">{formatCurrency(calc.mensalIr)}</span>
                    </div>
                    <div className="h-px bg-border my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Líquido</span>
                      <span className={`text-lg font-bold ${calc.mensalLiquido >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(calc.mensalLiquido)}
                      </span>
                    </div>
                  </div>
                </CardContent>
            </PremiumCard>

            <PremiumCard variant="gradient" className="border-success/30 bg-gradient-to-br from-success/5 to-success/10">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground font-medium">Resultado 6 Meses</p>
                    <Wallet className="w-5 h-5 text-success" />
                  </div>
                  <p className={`text-3xl font-bold ${calc.projecao[5].acumuladoLiquido >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(calc.projecao[5].acumuladoLiquido)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Líquido acumulado</p>
                </CardContent>
            </PremiumCard>
          </div>

          {/* Gráfico de Projeção */}
          <PremiumCard className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Projeção 6 Meses</CardTitle>
                    <CardDescription>Evolução do capital ao longo dos próximos meses</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportToPDF} className="gap-2">
                      <FileDown className="w-4 h-4" />
                      PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      Excel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={calc.projecao}>
                      <defs>
                        <linearGradient id="colorBruto" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorLiquido" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                      <RechartsTooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="acumuladoBruto" 
                        stroke="hsl(var(--primary))" 
                        fill="url(#colorBruto)" 
                        name="Acum. Bruto" 
                        strokeWidth={2}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="acumuladoLiquido" 
                        stroke="hsl(var(--success))" 
                        fill="url(#colorLiquido)" 
                        name="Acum. Líquido" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
          </PremiumCard>

          {/* Tabela de Projeção */}
          <PremiumCard>
            <CardHeader>
                <CardTitle className="text-lg">Detalhamento Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-semibold">Mês</TableHead>
                        <TableHead className="text-right font-semibold">Bruto</TableHead>
                        <TableHead className="text-right font-semibold">IR (20%)</TableHead>
                        <TableHead className="text-right font-semibold">Líquido</TableHead>
                        <TableHead className="text-right font-semibold">Acum. Bruto</TableHead>
                        <TableHead className="text-right font-semibold">Acum. Líquido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {calc.projecao.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-medium">{row.mes}</TableCell>
                          <TableCell className={`text-right ${row.bruto >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(row.bruto)}
                          </TableCell>
                          <TableCell className="text-right text-warning">{formatCurrency(row.ir)}</TableCell>
                          <TableCell className={`text-right font-medium ${row.liquido >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(row.liquido)}
                          </TableCell>
                          <TableCell className={`text-right ${row.acumuladoBruto >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(row.acumuladoBruto)}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${row.acumuladoLiquido >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(row.acumuladoLiquido)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </PremiumCard>
    </PremiumPageLayout>
  );
};

export default GerenciamentoRisco;
