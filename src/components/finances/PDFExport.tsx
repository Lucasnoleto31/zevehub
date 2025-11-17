import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { Transaction } from "@/types/finances";

interface PDFExportProps {
  transactions: Transaction[];
}

export const PDFExport = ({ transactions }: PDFExportProps) => {
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    setGenerating(true);

    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text("Relatório Financeiro Detalhado", 14, 20);
      
      // Data do relatório
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 28);

      // Sumário
      const totalIncome = transactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const totalExpense = transactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const balance = totalIncome - totalExpense;

      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);
      doc.text("Resumo Financeiro", 14, 40);
      
      doc.setFontSize(10);
      doc.text(`Total de Receitas: R$ ${totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 14, 48);
      doc.text(`Total de Despesas: R$ ${totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 14, 54);
      doc.setFont(undefined, "bold");
      doc.text(`Saldo: R$ ${balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 14, 60);
      doc.setFont(undefined, "normal");

      // Análise por categoria
      const categoryData: { [key: string]: number } = {};
      transactions
        .filter(t => t.type === "expense")
        .forEach(t => {
          categoryData[t.category] = (categoryData[t.category] || 0) + Number(t.amount);
        });

      const topCategories = Object.entries(categoryData)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);

      doc.text("Top 5 Categorias de Despesas", 14, 72);
      let yPos = 80;
      topCategories.forEach(([cat, amount]) => {
        const percentage = (amount / totalExpense * 100).toFixed(1);
        doc.text(`• ${cat}: R$ ${amount.toFixed(2)} (${percentage}%)`, 14, yPos);
        yPos += 6;
      });

      // Tabela de transações
      autoTable(doc, {
        startY: yPos + 5,
        head: [["Data", "Título", "Tipo", "Categoria", "Valor"]],
        body: transactions.map(t => [
          new Date(t.transaction_date).toLocaleDateString("pt-BR"),
          t.title,
          t.type === "income" ? "Receita" : "Despesa",
          t.category,
          `R$ ${Number(t.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        ]),
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
      });

      // Salvar PDF
      doc.save(`relatorio_financeiro_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar relatório PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Exportar Relatório PDF
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Gere um relatório PDF completo com análises detalhadas, gráficos e tabelas de
          transações para compartilhar ou arquivar.
        </p>
        <Button onClick={generatePDF} disabled={generating} className="w-full">
          <Download className="mr-2 h-4 w-4" />
          {generating ? "Gerando PDF..." : "Gerar Relatório Completo"}
        </Button>
      </CardContent>
    </Card>
  );
};
