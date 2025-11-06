import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  strategy?: string;
}

const OperationImport = ({ userId }: OperationImportProps) => {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; errors: number } | null>(null);
  const [previewData, setPreviewData] = useState<ImportedOperation[]>([]);
  const [pendingOperations, setPendingOperations] = useState<ImportedOperation[]>([]);

  const downloadTemplate = () => {
    const template = [
      {
        data_operacao: "2024-01-15",
        horario: "10:30:00",
        ativo: "WIN",
        contratos: 1,
        custos: 2.50,
        resultado: 150.00,
        observacoes: "Operação de exemplo",
        estrategia: "Bot WIN v1.0"
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
      // Formato longo em inglês: "Wednesday, January 03, 2018"
      if (excelDate.includes(',')) {
        try {
          const date = new Date(excelDate);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        } catch (e) {
          console.error('Erro ao processar data:', excelDate);
        }
      }
      
      // Formato DD/MM/YYYY ou DD-MM-YYYY (brasileiro)
      if (excelDate.includes('/') || excelDate.includes('-')) {
        const separator = excelDate.includes('/') ? '/' : '-';
        const parts = excelDate.split(separator);
        
        // Se primeiro valor é maior que 12, é DD/MM/YYYY
        if (parseInt(parts[0]) > 12) {
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          let year = parts[2];
          
          if (year.length === 2) {
            const numYear = parseInt(year);
            year = numYear >= 50 ? `19${year}` : `20${year}`;
          }
          
          return `${year}-${month}-${day}`;
        }
        
        // Caso contrário, assume M/D/YYYY (americano)
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        let year = parts[2];
        
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

    setResults(null);
    setPreviewData([]);
    setPendingOperations([]);
    setProgress(0);

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
          const strategy = row.estrategia || row.strategy || row.robo || row.bot || "";

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
            notes: notes.toString(),
            strategy: strategy.toString()
          };

          operations.push(operation);
        } catch (error) {
          errors.push(`Linha ${index + 2}: erro ao processar dados - ${error}`);
        }
      });

      if (errors.length > 0) {
        toast.warning(`${errors.length} linha(s) com erro serão ignoradas.`);
        console.error("Erros:", errors);
      }

      if (operations.length === 0) {
        toast.error("Nenhuma operação válida encontrada na planilha");
        setResults({ success: 0, errors: errors.length });
        return;
      }

      // Mostrar preview das primeiras 10 linhas
      setPreviewData(operations.slice(0, 10));
      setPendingOperations(operations);
      toast.success(`${operations.length} operação(ões) encontrada(s). Revise o preview antes de importar.`);
      
      // Limpar input
      event.target.value = "";
    } catch (error: any) {
      console.error("Erro ao processar arquivo:", error);
      toast.error(error.message || "Erro ao processar arquivo");
    }
  };

  const confirmImport = async () => {
    if (pendingOperations.length === 0) return;

    setImporting(true);
    setProgress(0);

    try {
      const batchSize = 100;
      const batches = Math.ceil(pendingOperations.length / batchSize);
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, pendingOperations.length);
        const batch = pendingOperations.slice(start, end);

        const operationsWithUserId = batch.map(op => ({
          ...op,
          user_id: userId
        }));

        const { error } = await supabase
          .from("trading_operations")
          .insert(operationsWithUserId);

        if (error) {
          console.error(`Erro no lote ${i + 1}:`, error);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }

        // Atualizar progresso
        const currentProgress = Math.round(((i + 1) / batches) * 100);
        setProgress(currentProgress);
      }

      setResults({ success: successCount, errors: errorCount });
      
      if (successCount > 0) {
        toast.success(`${successCount} operação(ões) importada(s) com sucesso!`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} operação(ões) falharam na importação`);
      }

      // Limpar preview
      setPreviewData([]);
      setPendingOperations([]);
    } catch (error: any) {
      console.error("Erro ao importar:", error);
      toast.error(error.message || "Erro ao importar planilha");
      setResults({ success: 0, errors: pendingOperations.length });
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  const cancelImport = () => {
    setPreviewData([]);
    setPendingOperations([]);
    setProgress(0);
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
              disabled={importing || previewData.length > 0}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              id="file-upload"
            />
            <Button
              variant="default"
              disabled={importing || previewData.length > 0}
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

        {importing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Importando...</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {previewData.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Eye className="w-4 h-4" />
              Preview - Primeiras 10 operações de {pendingOperations.length}
            </div>
            
            <ScrollArea className="h-[300px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Contratos</TableHead>
                    <TableHead className="text-right">Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((op, index) => {
                    const [year, month, day] = op.operation_date.split('-');
                    const formattedDate = `${day}/${month}/${year}`;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell className="text-xs">{formattedDate}</TableCell>
                        <TableCell className="text-xs">{op.operation_time}</TableCell>
                        <TableCell className="text-xs">{op.asset}</TableCell>
                        <TableCell className="text-xs text-right">{op.contracts}</TableCell>
                        <TableCell className={`text-xs text-right font-medium ${op.result >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {op.result >= 0 ? '+' : ''}{op.result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex gap-2">
              <Button
                onClick={confirmImport}
                disabled={importing}
                className="flex-1 gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Confirmar Importação ({pendingOperations.length} ops)
              </Button>
              <Button
                onClick={cancelImport}
                disabled={importing}
                variant="outline"
                className="gap-2"
              >
                <XCircle className="w-4 h-4" />
                Cancelar
              </Button>
            </div>
          </div>
        )}

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
            <li>data_operacao: DD/MM/YYYY ou formato longo do Excel</li>
            <li>horario: HH:MM:SS ou HH:MM AM/PM</li>
            <li>ativo: texto (ex: WIN, WDO)</li>
            <li>contratos: número</li>
            <li>custos: número (opcional)</li>
            <li>resultado: número</li>
            <li>observacoes: texto (opcional)</li>
            <li>estrategia: texto (opcional - nome do robô/estratégia)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default OperationImport;
