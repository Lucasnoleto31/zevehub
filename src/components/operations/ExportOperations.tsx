import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Operation {
  operation_date: string;
  operation_time: string;
  asset: string;
  strategy: string | null;
  contracts: number;
  costs: number;
  result: number;
  notes: string | null;
}

interface ExportOperationsProps {
  operations: Operation[];
  stats?: {
    totalOperations: number;
    winRate: number;
    totalResult: number;
    averageWin: number;
    averageLoss: number;
  };
}

export const ExportOperations = ({ operations, stats }: ExportOperationsProps) => {
  const [exporting, setExporting] = useState(false);

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.text("Relatório de Operações", 14, 22);
      
      // Estatísticas
      if (stats) {
        doc.setFontSize(12);
        let yPos = 35;
        doc.text(`Total de Operações: ${stats.totalOperations}`, 14, yPos);
        yPos += 7;
        doc.text(`Win Rate: ${stats.winRate.toFixed(2)}%`, 14, yPos);
        yPos += 7;
        doc.text(`Resultado Total: ${formatCurrency(stats.totalResult)}`, 14, yPos);
        yPos += 7;
        doc.text(`Média de Ganhos: ${formatCurrency(stats.averageWin)}`, 14, yPos);
        yPos += 7;
        doc.text(`Média de Perdas: ${formatCurrency(stats.averageLoss)}`, 14, yPos);
        yPos += 10;
      }

      // Tabela de operações
      const tableData = operations.map(op => [
        formatDate(op.operation_date),
        op.operation_time,
        op.asset,
        op.strategy || "-",
        op.contracts.toString(),
        formatCurrency(op.costs),
        formatCurrency(op.result),
      ]);

      autoTable(doc, {
        startY: stats ? 75 : 35,
        head: [["Data", "Hora", "Ativo", "Estratégia", "Contratos", "Custos", "Resultado"]],
        body: tableData,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      // Data de geração
      const today = new Date().toLocaleDateString("pt-BR");
      const finalY = (doc as any).lastAutoTable.finalY || 35;
      doc.setFontSize(10);
      doc.text(`Gerado em: ${today}`, 14, finalY + 10);

      doc.save(`operacoes_${Date.now()}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setExporting(false);
    }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      // Preparar dados
      const data = operations.map(op => ({
        Data: formatDate(op.operation_date),
        Hora: op.operation_time,
        Ativo: op.asset,
        Estratégia: op.strategy || "-",
        Contratos: op.contracts,
        Custos: op.costs,
        Resultado: op.result,
        Notas: op.notes || "",
      }));

      // Adicionar estatísticas no início se disponíveis
      const worksheetData = stats
        ? [
            ["ESTATÍSTICAS"],
            ["Total de Operações", stats.totalOperations],
            ["Win Rate", `${stats.winRate.toFixed(2)}%`],
            ["Resultado Total", stats.totalResult],
            ["Média de Ganhos", stats.averageWin],
            ["Média de Perdas", stats.averageLoss],
            [],
            ["OPERAÇÕES"],
            Object.keys(data[0] || {}),
            ...data.map(row => Object.values(row)),
          ]
        : [
            ["OPERAÇÕES"],
            Object.keys(data[0] || {}),
            ...data.map(row => Object.values(row)),
          ];

      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Operações");

      XLSX.writeFile(wb, `operacoes_${Date.now()}.xlsx`);
      toast.success("Excel exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      toast.error("Erro ao exportar Excel");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={exportPDF}
        disabled={exporting || operations.length === 0}
        className="gap-2"
      >
        <FileDown className="w-4 h-4" />
        Exportar PDF
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={exportExcel}
        disabled={exporting || operations.length === 0}
        className="gap-2"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Exportar Excel
      </Button>
    </div>
  );
};
