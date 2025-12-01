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
      
      // Cabeçalho profissional
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, 210, 35, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório de Operações", 14, 20);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 14, 28);
      
      // Resetar cor do texto
      doc.setTextColor(0, 0, 0);
      
      // Estatísticas em cards
      if (stats) {
        let yPos = 45;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Resumo do Período", 14, yPos);
        yPos += 10;
        
        // Cards de métricas
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        // Primeira linha de cards
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(14, yPos, 90, 20, 3, 3, "F");
        doc.roundedRect(110, yPos, 90, 20, 3, 3, "F");
        
        doc.setFont("helvetica", "bold");
        doc.text("Total de Operações", 18, yPos + 7);
        doc.text("Win Rate", 114, yPos + 7);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(16);
        doc.text(stats.totalOperations.toString(), 18, yPos + 16);
        doc.text(`${stats.winRate.toFixed(2)}%`, 114, yPos + 16);
        
        yPos += 25;
        
        // Segunda linha de cards
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(14, yPos, 90, 20, 3, 3, "F");
        doc.roundedRect(110, yPos, 90, 20, 3, 3, "F");
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Resultado Total", 18, yPos + 7);
        doc.text("Média por Trade", 114, yPos + 7);
        doc.setFont("helvetica", "normal");
        
        // Cor baseada em lucro/prejuízo
        if (stats.totalResult >= 0) {
          doc.setTextColor(22, 163, 74); // verde
        } else {
          doc.setTextColor(220, 38, 38); // vermelho
        }
        doc.setFontSize(14);
        doc.text(formatCurrency(stats.totalResult), 18, yPos + 16);
        doc.setTextColor(0, 0, 0);
        
        const avgPerTrade = stats.totalOperations > 0 ? stats.totalResult / stats.totalOperations : 0;
        doc.text(formatCurrency(avgPerTrade), 114, yPos + 16);
        
        yPos += 30;
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
        startY: stats ? 130 : 45,
        head: [["Data", "Hora", "Ativo", "Estratégia", "Contratos", "Custos", "Resultado"]],
        body: tableData,
        styles: { 
          fontSize: 8,
          cellPadding: 3,
        },
        headStyles: { 
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          6: { 
            fontStyle: "bold",
            // Cor será aplicada via didParseCell
          }
        },
        didParseCell: (data: any) => {
          if (data.column.index === 6 && data.section === "body") {
            const value = operations[data.row.index].result;
            if (value >= 0) {
              data.cell.styles.textColor = [22, 163, 74]; // verde
            } else {
              data.cell.styles.textColor = [220, 38, 38]; // vermelho
            }
          }
        }
      });

      // Rodapé
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(
          `Página ${i} de ${pageCount} | Zeve Operations Pro`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      doc.save(`operacoes_${new Date().toISOString().split('T')[0]}.pdf`);
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
