import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Download, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ReportExport = ({ userId }: { userId: string }) => {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const generateMonthlyReport = async () => {
    setLoading(true);
    try {
      const startDate = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

      // Buscar dados do período
      const { data: operations, error } = await supabase
        .from("trading_operations")
        .select("*")
        .gte("operation_date", startDate)
        .lte("operation_date", endDate)
        .order("operation_date", { ascending: true });

      if (error) throw error;

      if (!operations || operations.length === 0) {
        toast.error("Nenhuma operação encontrada neste período");
        setLoading(false);
        return;
      }

      // Calcular estatísticas
      const totalOperations = operations.length;
      const wins = operations.filter((op) => op.result > 0).length;
      const losses = operations.filter((op) => op.result < 0).length;
      const winRate = ((wins / totalOperations) * 100).toFixed(2);
      const totalResult = operations.reduce((sum, op) => sum + op.result, 0);
      const totalCosts = operations.reduce((sum, op) => sum + op.costs, 0);
      const netResult = totalResult - totalCosts;
      const avgResult = totalResult / totalOperations;
      const avgWin = wins > 0 ? operations.filter((op) => op.result > 0).reduce((sum, op) => sum + op.result, 0) / wins : 0;
      const avgLoss = losses > 0 ? operations.filter((op) => op.result < 0).reduce((sum, op) => sum + op.result, 0) / losses : 0;
      const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;

      // Análise por ativo
      const assetStats: { [key: string]: { ops: number; result: number; wins: number } } = {};
      operations.forEach((op) => {
        if (!assetStats[op.asset]) {
          assetStats[op.asset] = { ops: 0, result: 0, wins: 0 };
        }
        assetStats[op.asset].ops += 1;
        assetStats[op.asset].result += op.result;
        assetStats[op.asset].wins += op.result > 0 ? 1 : 0;
      });

      // Análise por estratégia
      const strategyStats: { [key: string]: { ops: number; result: number; wins: number } } = {};
      operations.forEach((op) => {
        const strategy = op.strategy || "Sem estratégia";
        if (!strategyStats[strategy]) {
          strategyStats[strategy] = { ops: 0, result: 0, wins: 0 };
        }
        strategyStats[strategy].ops += 1;
        strategyStats[strategy].result += op.result;
        strategyStats[strategy].wins += op.result > 0 ? 1 : 0;
      });

      // Criar PDF
      const doc = new jsPDF();
      const monthName = format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR });

      // Título
      doc.setFontSize(20);
      doc.text(`Relatório Mensal de Trading`, 14, 20);
      doc.setFontSize(14);
      doc.text(monthName.charAt(0).toUpperCase() + monthName.slice(1), 14, 30);

      // Resumo Geral
      doc.setFontSize(12);
      doc.text("Resumo Geral", 14, 45);
      autoTable(doc, {
        startY: 50,
        head: [["Métrica", "Valor"]],
        body: [
          ["Total de Operações", totalOperations.toString()],
          ["Operações Ganhas", wins.toString()],
          ["Operações Perdidas", losses.toString()],
          ["Win Rate", `${winRate}%`],
          ["Resultado Bruto", `R$ ${totalResult.toFixed(2)}`],
          ["Custos", `R$ ${totalCosts.toFixed(2)}`],
          ["Resultado Líquido", `R$ ${netResult.toFixed(2)}`],
          ["Resultado Médio", `R$ ${avgResult.toFixed(2)}`],
          ["Ganho Médio", `R$ ${avgWin.toFixed(2)}`],
          ["Perda Média", `R$ ${avgLoss.toFixed(2)}`],
          ["Profit Factor", profitFactor.toFixed(2)],
        ],
      });

      // Performance por Ativo
      let finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.text("Performance por Ativo", 14, finalY);
      autoTable(doc, {
        startY: finalY + 5,
        head: [["Ativo", "Operações", "Win Rate", "Resultado"]],
        body: Object.entries(assetStats).map(([asset, stats]) => [
          asset,
          stats.ops.toString(),
          `${((stats.wins / stats.ops) * 100).toFixed(1)}%`,
          `R$ ${stats.result.toFixed(2)}`,
        ]),
      });

      // Performance por Estratégia
      finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.text("Performance por Estratégia", 14, finalY);
      autoTable(doc, {
        startY: finalY + 5,
        head: [["Estratégia", "Operações", "Win Rate", "Resultado"]],
        body: Object.entries(strategyStats).map(([strategy, stats]) => [
          strategy,
          stats.ops.toString(),
          `${((stats.wins / stats.ops) * 100).toFixed(1)}%`,
          `R$ ${stats.result.toFixed(2)}`,
        ]),
      });

      // Nova página para operações detalhadas
      doc.addPage();
      doc.setFontSize(12);
      doc.text("Histórico de Operações", 14, 20);
      autoTable(doc, {
        startY: 25,
        head: [["Data", "Hora", "Ativo", "Contratos", "Resultado", "Custos"]],
        body: operations.map((op) => [
          format(new Date(op.operation_date), "dd/MM/yyyy"),
          op.operation_time,
          op.asset,
          op.contracts.toString(),
          `R$ ${op.result.toFixed(2)}`,
          `R$ ${op.costs.toFixed(2)}`,
        ]),
        styles: { fontSize: 8 },
      });

      // Salvar PDF
      const fileName = `relatorio_trading_${format(selectedMonth, "yyyy_MM")}.pdf`;
      doc.save(fileName);

      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  const changeMonth = (direction: number) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedMonth(newDate);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Exportação de Relatórios
        </CardTitle>
        <CardDescription>Gere relatórios mensais completos em PDF</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <Button variant="outline" size="sm" onClick={() => changeMonth(-1)}>
            ←
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="font-semibold">
              {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR }).charAt(0).toUpperCase() +
                format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR }).slice(1)}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => changeMonth(1)}>
            →
          </Button>
        </div>

        <Button onClick={generateMonthlyReport} disabled={loading} className="w-full" size="lg">
          <Download className="w-4 h-4 mr-2" />
          {loading ? "Gerando Relatório..." : "Gerar Relatório PDF"}
        </Button>

        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-semibold mb-2">O que está incluído:</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Resumo geral com todas as métricas principais</li>
            <li>Performance detalhada por ativo</li>
            <li>Performance detalhada por estratégia</li>
            <li>Histórico completo de todas as operações</li>
            <li>Análise de win rate e profit factor</li>
            <li>Custos operacionais e resultado líquido</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportExport;
