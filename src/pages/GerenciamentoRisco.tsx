import { useState, useMemo, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { ShieldCheck, TrendingUp, Target, DollarSign, Calendar, BarChart3, FileDown, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const GerenciamentoRisco = () => {
  const [capital, setCapital] = useState(5000);
  const [payoff, setPayoff] = useState(3);
  const [stopPontos, setStopPontos] = useState(200);
  const [taxaAcerto, setTaxaAcerto] = useState(30);
  const [ativo, setAtivo] = useState<"WIN" | "WDO">("WIN");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!data);
      }
    };
    checkAdmin();
  }, []);

  const calc = useMemo(() => {
    const pointValue = ativo === "WIN" ? 0.20 : 10;
    const stopDiario = capital / 20;
    const stopFinanceiro = stopPontos * pointValue;
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
      stopFinanceiro,
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

      // Header gradient background
      doc.setFillColor(11, 18, 32);
      doc.rect(0, 0, pageWidth, 50, "F");

      // Cyan accent line
      doc.setFillColor(0, 188, 212);
      doc.rect(0, 50, pageWidth, 3, "F");

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(0, 188, 212);
      doc.text("GERENCIAMENTO DE RISCO", pageWidth / 2, 25, { align: "center" });

      // Subtitle
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text("Relatorio de Projecao Financeira", pageWidth / 2, 35, { align: "center" });

      // Date
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(`Gerado em: ${today}`, pageWidth / 2, 45, { align: "center" });

      // Parameters Section
      doc.setFillColor(26, 35, 50);
      doc.roundedRect(14, 60, pageWidth - 28, 45, 3, 3, "F");

      doc.setFontSize(14);
      doc.setTextColor(0, 188, 212);
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

      // Operational Summary Section
      doc.setFillColor(26, 35, 50);
      doc.roundedRect(14, 112, pageWidth - 28, 35, 3, 3, "F");

      doc.setFontSize(14);
      doc.setTextColor(0, 188, 212);
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

      // Projection Table
      doc.setFontSize(14);
      doc.setTextColor(0, 188, 212);
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
          fillColor: [0, 100, 120],
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

      // Final result highlight
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

      // Footer
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
      
      // Parameters sheet data
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
        ["Stop Financeiro", calc.stopFinanceiro],
        ["Meta Diaria", calc.ganhoDiario],
        ["Dias Gain", calc.gains],
        ["Dias Loss", calc.loss],
        ["Resultado Mensal Bruto", calc.mensalBruto],
        ["Resultado Mensal Liquido", calc.mensalLiquido],
      ];

      // Projection sheet data
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#0b1220]">
        <AppSidebar isAdmin={isAdmin} />
        <main className="flex-1 p-6 overflow-auto">
          <div className="flex items-center gap-4 mb-6">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-cyan-400" />
                Gerenciamento de Risco
              </h1>
              <p className="text-gray-400 text-sm">
                Calcule mão adequada, risco diário e projeção mensal
              </p>
            </div>
          </div>

          {/* Parâmetros do Operacional */}
          <Card className="mb-6 bg-[#111827] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Parâmetros do Operacional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Ativo</Label>
                  <Select value={ativo} onValueChange={(v) => setAtivo(v as "WIN" | "WDO")}>
                    <SelectTrigger className="bg-[#1f2937] border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1f2937] border-gray-700">
                      <SelectItem value="WIN" className="text-white">Mini Índice (WIN) – R$0,20/ponto</SelectItem>
                      <SelectItem value="WDO" className="text-white">Mini Dólar (WDO) – R$10,00/ponto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Capital (R$)</Label>
                  <Input
                    type="number"
                    value={capital}
                    onChange={(e) => setCapital(Number(e.target.value))}
                    className="bg-[#1f2937] border-gray-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Payoff (R:R)</Label>
                  <Input
                    type="number"
                    value={payoff}
                    onChange={(e) => setPayoff(Number(e.target.value))}
                    className="bg-[#1f2937] border-gray-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Stop (pontos)</Label>
                  <Input
                    type="number"
                    value={stopPontos}
                    onChange={(e) => setStopPontos(Number(e.target.value))}
                    className="bg-[#1f2937] border-gray-700 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Taxa de Acerto: {taxaAcerto}%</Label>
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
          <Card className="mb-6 bg-[#1a2332] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Resumo Operacional</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="bg-[#1e3a5f] border-cyan-500/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-cyan-300" />
                      <span className="text-xs text-cyan-200">Contratos Permitidos</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{calc.contratos}</p>
                  </CardContent>
                </Card>

                <Card className="bg-[#4a1d1d] border-red-500/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-red-300" />
                      <span className="text-xs text-red-200">Stop Diário</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(calc.stopDiario)}</p>
                  </CardContent>
                </Card>

                <Card className="bg-[#4a2d1d] border-orange-500/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-orange-300" />
                      <span className="text-xs text-orange-200">Stop Financeiro</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(calc.stopFinanceiro)}</p>
                  </CardContent>
                </Card>

                <Card className="bg-[#1d4a2d] border-green-500/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-300" />
                      <span className="text-xs text-green-200">Meta Diária</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(calc.ganhoDiario)}</p>
                  </CardContent>
                </Card>

                <Card className="bg-[#3d1d4a] border-purple-500/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-purple-300" />
                      <span className="text-xs text-purple-200">Ganho / Perda (dias)</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{calc.gains} / {calc.loss}</p>
                  </CardContent>
                </Card>

                <Card className="bg-[#1d4a3d] border-emerald-500/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-4 w-4 text-emerald-300" />
                      <span className="text-xs text-emerald-200">Resultado Mensal Líquido</span>
                    </div>
                    <p className={`text-2xl font-bold ${calc.mensalLiquido >= 0 ? 'text-white' : 'text-red-400'}`}>
                      {formatCurrency(calc.mensalLiquido)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Projeção — Próximos 6 meses */}
          <Card className="mb-6 bg-[#1a2332] border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Projeção — Próximos 6 meses (com Acumulado)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={calc.projecao}>
                  <defs>
                    <linearGradient id="colorBruto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00bcd4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00bcd4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorLiquido" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="mes" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
                    labelStyle={{ color: "#fff" }}
                    formatter={(value: number) => [formatCurrency(value), ""]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="bruto"
                    name="Bruto (R$)"
                    stroke="#00bcd4"
                    fill="url(#colorBruto)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="liquido"
                    name="Líquido (R$)"
                    stroke="#10b981"
                    fill="url(#colorLiquido)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="acumuladoLiquido"
                    name="Acumulado Líquido (R$)"
                    stroke="#f59e0b"
                    fill="url(#colorAcumulado)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Dados Detalhados */}
          <Card className="bg-[#1a2332] border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white text-lg">Dados Detalhados</CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={exportToPDF}
                  variant="outline"
                  size="sm"
                  className="bg-red-600/20 border-red-500/50 text-red-300 hover:bg-red-600/30 hover:text-white"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button
                  onClick={exportToExcel}
                  variant="outline"
                  size="sm"
                  className="bg-green-600/20 border-green-500/50 text-green-300 hover:bg-green-600/30 hover:text-white"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-gray-200">Mês</TableHead>
                    <TableHead className="text-gray-200">Bruto (R$)</TableHead>
                    <TableHead className="text-gray-200">IR (R$)</TableHead>
                    <TableHead className="text-gray-200">Líquido (R$)</TableHead>
                    <TableHead className="text-gray-200">Acumulado Bruto (R$)</TableHead>
                    <TableHead className="text-gray-200">Acumulado Líquido (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calc.projecao.map((row, idx) => (
                    <TableRow key={idx} className="border-gray-600">
                      <TableCell className="text-white font-medium">{row.mes}</TableCell>
                      <TableCell className="text-cyan-300">{formatCurrency(row.bruto)}</TableCell>
                      <TableCell className="text-orange-300">{formatCurrency(row.ir)}</TableCell>
                      <TableCell className={row.liquido >= 0 ? "text-green-300" : "text-red-400"}>
                        {formatCurrency(row.liquido)}
                      </TableCell>
                      <TableCell className="text-cyan-400 font-medium">{formatCurrency(row.acumuladoBruto)}</TableCell>
                      <TableCell className={row.acumuladoLiquido >= 0 ? "text-amber-400 font-medium" : "text-red-400 font-medium"}>
                        {formatCurrency(row.acumuladoLiquido)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default GerenciamentoRisco;
