import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Upload } from "lucide-react";

export const JsonToExcelConverter = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data)) {
        toast.error("O arquivo deve conter um array JSON");
        return;
      }

      // Transformar os dados para formato tabular
      const transformedData = data.map((item: any) => ({
        ID: item._id,
        Data: item.Data?.$date ? new Date(item.Data.$date).toLocaleDateString('pt-BR') : '',
        "ID Robô": item.IdRobo,
        "Nome Robô": item.NomeRobo,
        Resultado: item.Resultado,
        "Tenant ID": item.TenantId
      }));

      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(transformedData);

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 10 }, // ID
        { wch: 12 }, // Data
        { wch: 10 }, // ID Robô
        { wch: 20 }, // Nome Robô
        { wch: 12 }, // Resultado
        { wch: 45 }  // Tenant ID
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Histórico Robôs");

      // Gerar arquivo
      const fileName = file.name.replace('.json', '') + '.xlsx';
      XLSX.writeFile(wb, fileName);

      toast.success(`Arquivo convertido com sucesso! ${transformedData.length} registros exportados.`);
    } catch (error) {
      console.error("Erro ao converter arquivo:", error);
      toast.error("Erro ao converter o arquivo JSON");
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Converter JSON para Excel
        </CardTitle>
        <CardDescription>
          Faça upload de um arquivo JSON para converter em Excel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => document.getElementById('json-file-input')?.click()}
            disabled={isProcessing}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {isProcessing ? "Processando..." : "Selecionar Arquivo JSON"}
          </Button>
          <input
            id="json-file-input"
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div className="text-sm text-muted-foreground space-y-2">
          <p>Formato esperado do JSON:</p>
          <pre className="bg-muted p-3 rounded-md overflow-x-auto">
{`[
  {
    "_id": 10,
    "Data": { "$date": "2024-07-15T03:00:00.000Z" },
    "IdRobo": 2,
    "NomeRobo": "Adams",
    "Resultado": "-133",
    "TenantId": "..."
  }
]`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};
