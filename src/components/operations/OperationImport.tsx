import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface OperationImportProps {
  userId: string;
}

interface ImportedOperation {
  operation_date: string;
  operation_time: string;
  asset: string;
  contracts: number;
  costs: number;
  result: number;
  notes?: string;
}

const OperationImport = ({ userId }: OperationImportProps) => {
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: number } | null>(null);

  const downloadTemplate = () => {
    const template = [
      {
        data_operacao: "2024-01-15",
        horario: "10:30:00",
        ativo: "WIN",
        contratos: 1,
        custos: 2.50,
        resultado: 150.00,
        observacoes: "Operação de exemplo"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Operações");
    XLSX.writeFile(wb, "modelo_operacoes.xlsx");
    toast.success("Modelo baixado com sucesso!");
  };

  const parseExcelDate = (excelDate: any): string => {
    // Se já é uma string de data, processar
    if (typeof excelDate === 'string') {
      if (excelDate.includes('/')) {
        const parts = excelDate.split('/');
        // Formato M/D/YY ou M/D/YYYY
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        let year = parts[2];
        
        // Converter YY para YYYY
        if (year.length === 2) {
          const numYear = parseInt(year);
          year = numYear >= 50 ? `19${year}` : `20${year}`;
        }
        
        return `${year}-${month}-${day}`;
      }
      return excelDate;
    }
    
    // Se é número serial do Excel (dias desde 1900-01-01)
    if (typeof excelDate === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + excelDate * 86400000);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return excelDate.toString();
  };

  const parseExcelTime = (excelTime: any): string => {
    if (typeof excelTime === 'string') {
      let timeStr = excelTime.trim();
      
      // Converter AM/PM para 24h
      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        const isPM = timeStr.includes('PM');
        timeStr = timeStr.replace(/\s*(AM|PM)/i, '');
        
        const [time] = timeStr.split(' ');
        const parts = time.split(':');
        let hours = parseInt(parts[0]);
        const minutes = parts[1] || '00';
        const seconds = parts[2] || '00';
        
        // Ajustar horas para formato 24h
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
        
        return `${hours.toString().padStart(2, '0')}:${minutes}:${seconds}`;
      }
      
      // Se já está em formato HH:MM ou HH:MM:SS
      const parts = timeStr.split(':');
      if (parts.length === 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
      }
      if (parts.length === 3) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
      }
      
      return timeStr;
    }
    
    // Se é fração decimal do Excel (fração de 24h)
    if (typeof excelTime === 'number') {
      const totalSeconds = Math.round(excelTime * 86400);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return excelTime.toString();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const operations: ImportedOperation[] = [];
      const errors: string[] = [];

      jsonData.forEach((row: any, index: number) => {
        try {
          // Mapear colunas do Excel para o formato esperado
          const rawDate = row.data_operacao || row.data || row.date;
          const rawTime = row.horario || row.time || row.hora;
          const asset = row.ativo || row.asset || row.ticker;
          const contracts = Number(row.contratos || row.contracts || row.qtd);
          const costs = Number(row.custos || row.costs || row.custo || 0);
          const result = Number(row.resultado || row.result || row.lucro);
          const notes = row.observacoes || row.notes || row.obs || "";

          // Validação básica
          if (!rawDate || !rawTime || !asset) {
            errors.push(`Linha ${index + 2}: dados obrigatórios faltando`);
            return;
          }

          if (isNaN(contracts) || isNaN(result)) {
            errors.push(`Linha ${index + 2}: valores numéricos inválidos`);
            return;
          }

          // Processar data e hora
          const operation: ImportedOperation = {
            operation_date: parseExcelDate(rawDate),
            operation_time: parseExcelTime(rawTime),
            asset: asset.toString().trim(),
            contracts,
            costs,
            result,
            notes: notes.toString()
          };

          operations.push(operation);
        } catch (error) {
          errors.push(`Linha ${index + 2}: erro ao processar dados - ${error}`);
        }
      });

      if (errors.length > 0) {
        toast.error(`${errors.length} linha(s) com erro. Verifique o formato.`);
        console.error("Erros:", errors);
      }

      if (operations.length === 0) {
        toast.error("Nenhuma operação válida encontrada na planilha");
        setResults({ success: 0, errors: errors.length });
        return;
      }

      // Inserir operações no banco
      const operationsWithUserId = operations.map(op => ({
        ...op,
        user_id: userId
      }));

      const { error } = await supabase
        .from("trading_operations")
        .insert(operationsWithUserId);

      if (error) throw error;

      setResults({ success: operations.length, errors: errors.length });
      toast.success(`${operations.length} operação(ões) importada(s) com sucesso!`);
      
      // Limpar input
      event.target.value = "";
    } catch (error: any) {
      console.error("Erro ao importar:", error);
      toast.error(error.message || "Erro ao importar planilha");
      setResults({ success: 0, errors: 1 });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Importar Planilha
        </CardTitle>
        <CardDescription>
          Importe suas operações em lote via Excel ou CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Baixar Modelo
          </Button>

          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              disabled={importing}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              id="file-upload"
            />
            <Button
              variant="default"
              disabled={importing}
              className="w-full gap-2"
              asChild
            >
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-4 h-4" />
                {importing ? "Importando..." : "Selecionar Arquivo"}
              </label>
            </Button>
          </div>
        </div>

        {results && (
          <div className="space-y-2 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-success" />
              <span>{results.success} operação(ões) importada(s)</span>
            </div>
            {results.errors > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="w-4 h-4 text-destructive" />
                <span>{results.errors} linha(s) com erro</span>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-semibold">Formato esperado:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>data_operacao: YYYY-MM-DD ou DD/MM/YYYY</li>
            <li>horario: HH:MM:SS</li>
            <li>ativo: texto (ex: WIN, WDO)</li>
            <li>contratos: número</li>
            <li>custos: número (opcional)</li>
            <li>resultado: número</li>
            <li>observacoes: texto (opcional)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default OperationImport;
