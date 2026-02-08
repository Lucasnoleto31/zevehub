import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Calculator,
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Info,
  Receipt,
  Percent,
  Minus,
  BarChart3,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, getYear, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
// jsPDF and autoTable are dynamically imported where used
import { PremiumPageLayout, PremiumCard, PremiumSection } from "@/components/layout/PremiumPageLayout";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";

interface MonthlyResult {
  year: number;
  month: number;
  monthName: string;
  grossProfit: number;
  accumulatedLoss: number;
  taxableBase: number;
  taxDue: number;
  isPaid: boolean;
  paidAt: string | null;
  operationsCount: number;
}

interface TaxCalculation {
  id: string;
  year: number;
  month: number;
  gross_profit: number;
  accumulated_loss: number;
  taxable_base: number;
  tax_due: number;
  is_paid: boolean;
  paid_at: string | null;
}

const TAX_RATE = 0.20; // 20% para Day Trade
const MIN_TAX_AMOUNT = 10; // DARF mínimo de R$ 10,00

const Impostos = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyResults, setMonthlyResults] = useState<MonthlyResult[]>([]);
  const [savedCalculations, setSavedCalculations] = useState<TaxCalculation[]>([]);
  const [showDarfDialog, setShowDarfDialog] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  useEffect(() => {
    if (userId) {
      calculateMonthlyTaxes();
    }
  }, [userId, selectedYear]);

  const calculateMonthlyTaxes = async () => {
    if (!userId) return;
    setIsCalculating(true);

    try {
      // Fetch all profit_operations for the selected year
      const startDate = new Date(selectedYear, 0, 1).toISOString();
      const endDate = new Date(selectedYear, 11, 31, 23, 59, 59).toISOString();

      const { data: operations, error: opsError } = await supabase
        .from("profit_operations")
        .select("open_time, operation_result")
        .eq("user_id", userId)
        .gte("open_time", startDate)
        .lte("open_time", endDate)
        .order("open_time", { ascending: true });

      if (opsError) throw opsError;

      // Fetch saved tax calculations
      const { data: savedCalcs, error: calcsError } = await supabase
        .from("tax_calculations")
        .select("*")
        .eq("user_id", userId)
        .eq("year", selectedYear);

      if (calcsError) throw calcsError;
      setSavedCalculations(savedCalcs || []);

      // Group operations by month
      const monthlyOps: Record<number, { total: number; count: number }> = {};
      
      for (let m = 0; m < 12; m++) {
        monthlyOps[m] = { total: 0, count: 0 };
      }

      operations?.forEach((op) => {
        const date = new Date(op.open_time);
        const month = date.getMonth();
        monthlyOps[month].total += Number(op.operation_result) || 0;
        monthlyOps[month].count += 1;
      });

      // Calculate taxes with loss compensation
      let accumulatedLoss = 0;

      // Get accumulated loss from previous year if exists
      const prevYearCalcs = await supabase
        .from("tax_calculations")
        .select("accumulated_loss")
        .eq("user_id", userId)
        .eq("year", selectedYear - 1)
        .eq("month", 12)
        .maybeSingle();

      if (prevYearCalcs.data) {
        accumulatedLoss = Number(prevYearCalcs.data.accumulated_loss) || 0;
      }

      const results: MonthlyResult[] = [];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      for (let m = 0; m < 12; m++) {
        // Only show months up to current month if current year
        if (selectedYear === currentYear && m > currentMonth) continue;

        const grossProfit = monthlyOps[m].total;
        const savedCalc = savedCalcs?.find(c => c.month === m + 1);

        let taxableBase = 0;
        let taxDue = 0;

        if (grossProfit > 0) {
          // Compensate losses
          if (accumulatedLoss > 0) {
            const compensation = Math.min(accumulatedLoss, grossProfit);
            taxableBase = grossProfit - compensation;
            accumulatedLoss -= compensation;
          } else {
            taxableBase = grossProfit;
          }

          // Calculate tax (20%)
          taxDue = taxableBase * TAX_RATE;

          // DARF minimum is R$ 10,00
          if (taxDue < MIN_TAX_AMOUNT && taxDue > 0) {
            taxDue = 0; // Accumulate to next month
          }
        } else if (grossProfit < 0) {
          // Accumulate loss
          accumulatedLoss += Math.abs(grossProfit);
        }

        results.push({
          year: selectedYear,
          month: m + 1,
          monthName: format(new Date(selectedYear, m, 1), "MMMM", { locale: ptBR }),
          grossProfit,
          accumulatedLoss,
          taxableBase,
          taxDue,
          isPaid: savedCalc?.is_paid || false,
          paidAt: savedCalc?.paid_at || null,
          operationsCount: monthlyOps[m].count,
        });
      }

      setMonthlyResults(results);
    } catch (error) {
      console.error("Erro ao calcular impostos:", error);
      toast.error("Erro ao calcular impostos");
    } finally {
      setIsCalculating(false);
      setIsLoading(false);
    }
  };

  const handleMarkAsPaid = async (result: MonthlyResult, paid: boolean) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("tax_calculations")
        .upsert({
          user_id: userId,
          year: result.year,
          month: result.month,
          gross_profit: result.grossProfit,
          accumulated_loss: result.accumulatedLoss,
          taxable_base: result.taxableBase,
          tax_due: result.taxDue,
          is_paid: paid,
          paid_at: paid ? new Date().toISOString() : null,
        }, { onConflict: "user_id,year,month" });

      if (error) throw error;

      toast.success(paid ? "Marcado como pago!" : "Marcado como pendente");
      calculateMonthlyTaxes();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status de pagamento");
    }
  };

  const generateDARF = (result: MonthlyResult) => {
    setSelectedMonth(result);
    setShowDarfDialog(true);
  };

  const exportDARFPDF = async () => {
    if (!selectedMonth) return;

    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const today = format(new Date(), "dd/MM/yyyy");
      const dueDate = format(
        endOfMonth(new Date(selectedMonth.year, selectedMonth.month - 1)),
        "dd/MM/yyyy"
      );

      // Header
      doc.setFillColor(11, 18, 32);
      doc.rect(0, 0, pageWidth, 55, "F");

      doc.setFillColor(239, 68, 68);
      doc.rect(0, 55, pageWidth, 3, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(239, 68, 68);
      doc.text("DARF - DAY TRADE", pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("Documento de Arrecadação de Receitas Federais", pageWidth / 2, 32, { align: "center" });

      doc.setFontSize(11);
      doc.setTextColor(200, 200, 200);
      const monthCapitalized = selectedMonth.monthName.charAt(0).toUpperCase() + selectedMonth.monthName.slice(1);
      doc.text(`Período de Apuração: ${monthCapitalized} de ${selectedMonth.year}`, pageWidth / 2, 45, { align: "center" });

      // Info Box
      doc.setFillColor(26, 35, 50);
      doc.roundedRect(14, 65, pageWidth - 28, 70, 3, 3, "F");

      doc.setFontSize(12);
      doc.setTextColor(239, 68, 68);
      doc.text("INFORMAÇÕES DO DARF", 20, 78);

      doc.setFontSize(10);
      const infoData = [
        ["Código da Receita:", "6015 - IRPF - Day Trade"],
        ["Período de Apuração:", `${String(selectedMonth.month).padStart(2, "0")}/${selectedMonth.year}`],
        ["Vencimento:", dueDate],
        ["Resultado Bruto:", formatCurrency(selectedMonth.grossProfit)],
        ["Prejuízo Compensado:", formatCurrency(selectedMonth.accumulatedLoss > 0 ? Math.min(selectedMonth.accumulatedLoss, Math.max(0, selectedMonth.grossProfit)) : 0)],
        ["Base de Cálculo:", formatCurrency(selectedMonth.taxableBase)],
        ["Alíquota:", "20%"],
        ["Valor do Imposto:", formatCurrency(selectedMonth.taxDue)],
      ];

      let yPos = 92;
      infoData.forEach((row) => {
        doc.setTextColor(150, 150, 150);
        doc.text(row[0], 20, yPos);
        doc.setTextColor(255, 255, 255);
        doc.text(row[1], 90, yPos);
        yPos += 8;
      });

      // Highlight Box
      doc.setFillColor(239, 68, 68);
      doc.roundedRect(14, 145, pageWidth - 28, 30, 3, 3, "F");

      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("VALOR PRINCIPAL A RECOLHER", pageWidth / 2, 158, { align: "center" });

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(selectedMonth.taxDue), pageWidth / 2, 170, { align: "center" });

      // Instructions
      doc.setFillColor(26, 35, 50);
      doc.roundedRect(14, 185, pageWidth - 28, 60, 3, 3, "F");

      doc.setFontSize(11);
      doc.setTextColor(239, 68, 68);
      doc.text("INSTRUÇÕES DE PAGAMENTO", 20, 198);

      doc.setFontSize(9);
      doc.setTextColor(200, 200, 200);
      const instructions = [
        "1. Acesse o Sicalc no site da Receita Federal: www.sicalc.receita.economia.gov.br",
        "2. Selecione 'DARF Comum' e informe o código 6015 (IRPF - Day Trade)",
        "3. Preencha o período de apuração e o valor principal",
        "4. Gere o DARF e realize o pagamento até a data de vencimento",
        "5. Após o pagamento, marque como pago no sistema para controle",
      ];

      let instrY = 210;
      instructions.forEach((instr) => {
        doc.text(instr, 20, instrY);
        instrY += 8;
      });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Documento gerado em ${today} pelo Zeve Hub`, pageWidth / 2, 280, { align: "center" });
      doc.text("Este documento é apenas informativo. Para recolhimento, gere o DARF oficial no Sicalc.", pageWidth / 2, 286, { align: "center" });

      // Save
      const fileName = `DARF_${selectedMonth.year}_${String(selectedMonth.month).padStart(2, "0")}.pdf`;
      doc.save(fileName);

      // Update database
      await supabase
        .from("tax_calculations")
        .upsert({
          user_id: userId!,
          year: selectedMonth.year,
          month: selectedMonth.month,
          gross_profit: selectedMonth.grossProfit,
          accumulated_loss: selectedMonth.accumulatedLoss,
          taxable_base: selectedMonth.taxableBase,
          tax_due: selectedMonth.taxDue,
          darf_generated_at: new Date().toISOString(),
        }, { onConflict: "user_id,year,month" });

      toast.success("DARF exportado com sucesso!");
      setShowDarfDialog(false);
    } catch (error) {
      console.error("Erro ao gerar DARF:", error);
      toast.error("Erro ao gerar PDF do DARF");
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Summary calculations
  const summary = useMemo(() => {
    const totalGrossProfit = monthlyResults.reduce((acc, r) => acc + Math.max(0, r.grossProfit), 0);
    const totalLoss = monthlyResults.reduce((acc, r) => acc + Math.min(0, r.grossProfit), 0);
    const totalTaxDue = monthlyResults.reduce((acc, r) => acc + r.taxDue, 0);
    const totalPaid = monthlyResults.filter(r => r.isPaid).reduce((acc, r) => acc + r.taxDue, 0);
    const totalPending = totalTaxDue - totalPaid;
    const currentAccumulatedLoss = monthlyResults.length > 0 
      ? monthlyResults[monthlyResults.length - 1].accumulatedLoss 
      : 0;

    return {
      totalGrossProfit,
      totalLoss,
      totalTaxDue,
      totalPaid,
      totalPending,
      currentAccumulatedLoss,
    };
  }, [monthlyResults]);

  if (isLoading) {
    return (
      <PremiumPageLayout
        title="Calculadora de IR"
        subtitle="Day Trade"
        icon={Calculator}
      >
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PremiumPageLayout>
    );
  }

  return (
    <PremiumPageLayout
      title="Calculadora de IR"
      subtitle="Imposto de Renda Day Trade"
      icon={Calculator}
    >
      <div className="space-y-6">
        {/* Year Selector & Refresh */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={calculateMonthlyTaxes}
            disabled={isCalculating}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isCalculating ? "animate-spin" : ""}`} />
            Recalcular
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <PremiumCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Lucro Bruto</span>
            </div>
            <p className="text-lg font-bold text-green-500">
              {formatCurrency(summary.totalGrossProfit)}
            </p>
          </PremiumCard>

          <PremiumCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Prejuízo</span>
            </div>
            <p className="text-lg font-bold text-red-500">
              {formatCurrency(summary.totalLoss)}
            </p>
          </PremiumCard>

          <PremiumCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Minus className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Prejuízo Acumulado</span>
            </div>
            <p className="text-lg font-bold text-orange-500">
              {formatCurrency(summary.currentAccumulatedLoss)}
            </p>
          </PremiumCard>

          <PremiumCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">IR Total</span>
            </div>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(summary.totalTaxDue)}
            </p>
          </PremiumCard>

          <PremiumCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Pago</span>
            </div>
            <p className="text-lg font-bold text-green-500">
              {formatCurrency(summary.totalPaid)}
            </p>
          </PremiumCard>

          <PremiumCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Pendente</span>
            </div>
            <p className="text-lg font-bold text-yellow-500">
              {formatCurrency(summary.totalPending)}
            </p>
          </PremiumCard>
        </div>

        {/* Info Card */}
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-500">Como funciona o IR sobre Day Trade?</p>
                <p className="text-xs text-muted-foreground">
                  O imposto é de <strong>20%</strong> sobre o lucro líquido mensal. Prejuízos podem ser compensados nos meses seguintes.
                  O DARF deve ser pago até o último dia útil do mês seguinte à apuração. Valores abaixo de R$ 10,00 são acumulados.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Table */}
        <PremiumCard>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Apuração Mensal - {selectedYear}
            </CardTitle>
            <CardDescription>
              Resultados mensais e cálculo de IR com compensação de prejuízos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyResults.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma operação encontrada para {selectedYear}</p>
                <p className="text-sm">Importe suas operações na página de Trading</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Operações</TableHead>
                      <TableHead className="text-right">Resultado Bruto</TableHead>
                      <TableHead className="text-right">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 ml-auto">
                              Prejuízo Acum.
                              <Info className="w-3 h-3" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Prejuízo acumulado disponível para compensação</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>
                      <TableHead className="text-right">Base de Cálculo</TableHead>
                      <TableHead className="text-right">IR (20%)</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {monthlyResults.map((result, index) => (
                        <motion.tr
                          key={result.month}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-border/50"
                        >
                          <TableCell className="font-medium capitalize">
                            {result.monthName}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {result.operationsCount}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${
                            result.grossProfit >= 0 ? "text-green-500" : "text-red-500"
                          }`}>
                            {formatCurrency(result.grossProfit)}
                          </TableCell>
                          <TableCell className="text-right text-orange-500">
                            {result.accumulatedLoss > 0 ? formatCurrency(result.accumulatedLoss) : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {result.taxableBase > 0 ? formatCurrency(result.taxableBase) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            {result.taxDue > 0 ? formatCurrency(result.taxDue) : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            {result.taxDue > 0 ? (
                              result.isPaid ? (
                                <Badge variant="default" className="bg-green-500">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Pago
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Pendente
                                </Badge>
                              )
                            ) : (
                              <Badge variant="secondary">Isento</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {result.taxDue > 0 && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => generateDARF(result)}
                                    className="gap-1"
                                  >
                                    <FileText className="w-3 h-3" />
                                    DARF
                                  </Button>
                                  <Checkbox
                                    checked={result.isPaid}
                                    onCheckedChange={(checked) => 
                                      handleMarkAsPaid(result, checked as boolean)
                                    }
                                  />
                                </>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </PremiumCard>
      </div>

      {/* DARF Dialog */}
      <Dialog open={showDarfDialog} onOpenChange={setShowDarfDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-500" />
              Gerar DARF
            </DialogTitle>
            <DialogDescription>
              Documento de Arrecadação de Receitas Federais
            </DialogDescription>
          </DialogHeader>

          {selectedMonth && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Período:</span>
                  <span className="font-medium capitalize">
                    {selectedMonth.monthName} de {selectedMonth.year}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Código da Receita:</span>
                  <span className="font-medium">6015 - IRPF Day Trade</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resultado Bruto:</span>
                  <span className={`font-medium ${selectedMonth.grossProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {formatCurrency(selectedMonth.grossProfit)}
                  </span>
                </div>
                {selectedMonth.accumulatedLoss > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prejuízo Compensado:</span>
                    <span className="font-medium text-orange-500">
                      {formatCurrency(Math.min(selectedMonth.accumulatedLoss, Math.max(0, selectedMonth.grossProfit)))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base de Cálculo:</span>
                  <span className="font-medium">{formatCurrency(selectedMonth.taxableBase)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alíquota:</span>
                  <span className="font-medium">20%</span>
                </div>
                <div className="border-t border-border pt-3 flex justify-between">
                  <span className="font-medium">Valor do Imposto:</span>
                  <span className="text-xl font-bold text-red-500">
                    {formatCurrency(selectedMonth.taxDue)}
                  </span>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Este documento é apenas informativo. Para recolhimento, gere o DARF oficial 
                    no site da Receita Federal (Sicalc).
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDarfDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={exportDARFPDF} className="gap-2 bg-red-500 hover:bg-red-600">
              <Download className="w-4 h-4" />
              Exportar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PremiumPageLayout>
  );
};

export default Impostos;
