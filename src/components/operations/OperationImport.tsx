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
  _index?: number; // Para rastrear a linha original
}

const OperationImport = ({ userId }: OperationImportProps) => {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ success: number; errors: number } | null>(null);
  const [previewData, setPreviewData] = useState<ImportedOperation[]>([]);
  const [pendingOperations, setPendingOperations] = useState<ImportedOperation[]>([]);
  const [errorList, setErrorList] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [editingCell, setEditingCell] = useState<{ index: number; field: string } | null>(null);

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
      const trimmed = excelDate.trim();
      
      // Formato YYYY.MM.DD HH:MM:SS (formato Zeus) - extrair apenas a data
      if (/^\d{4}\.\d{1,2}\.\d{1,2}\s+\d{1,2}:\d{1,2}:\d{1,2}$/.test(trimmed)) {
        const [datePart] = trimmed.split(' ');
        const parts = datePart.split('.');
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // Formato YYYY-MM-DD (ISO)
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
        const parts = trimmed.split('-');
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
      
      // Formato longo em inglês: "Wednesday, January 03, 2018"
      if (trimmed.includes(',')) {
        try {
          const date = new Date(trimmed);
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
      if (trimmed.includes('/') || trimmed.includes('-')) {
        const separator = trimmed.includes('/') ? '/' : '-';
        const parts = trimmed.split(separator);
        
        if (parts.length === 3) {
          // Se primeiro valor é maior que 12 ou igual a 0, é DD/MM/YYYY
          const firstNum = parseInt(parts[0]);
          if (firstNum > 12 || firstNum === 0 || parts[0].length > 2) {
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
      }
      
      return trimmed;
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
      
      // Formato YYYY.MM.DD HH:MM:SS (formato Zeus) - extrair apenas o horário
      if (/^\d{4}\.\d{1,2}\.\d{1,2}\s+\d{1,2}:\d{1,2}:\d{1,2}$/.test(timeStr)) {
        const [, timePart] = timeStr.split(' ');
        const parts = timePart.split(':');
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
      }
      
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
    
    // Se é número do Excel (pode ser serial completo ou fração)
    if (typeof excelTime === 'number') {
      // Pegar apenas a parte decimal (fração do dia = horário)
      const timeFraction = excelTime - Math.floor(excelTime);
      const totalSeconds = Math.round(timeFraction * 86400);
      const hours = Math.floor(totalSeconds / 3600) % 24;
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
    setErrorList([]);
    setShowErrors(false);
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
          let rawDate = row.data_operacao || row.data || row.date;
          let rawTime = row.horario || row.time || row.hora;
          
          // Se data_operacao contém data e hora juntas, usar para ambos
          if (rawDate && !rawTime && typeof rawDate === 'string' && rawDate.includes(' ')) {
            rawTime = rawDate;
          }
          
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
            strategy: strategy.toString(),
            _index: index
          };

          operations.push(operation);
        } catch (error) {
          errors.push(`Linha ${index + 2}: erro ao processar dados - ${error}`);
        }
      });

      if (errors.length > 0) {
        setErrorList(errors);
        toast.warning(`${errors.length} linha(s) com erro serão ignoradas. Clique em "Ver Erros" para detalhes.`);
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
      // Batch menor para evitar timeout do banco de dados
      const batchSize = 10;
      const batches = Math.ceil(pendingOperations.length / batchSize);
      let successCount = 0;
      let errorCount = 0;
      const failedOperations: string[] = [];

      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, pendingOperations.length);
        const batch = pendingOperations.slice(start, end);

        const operationsWithUserId = batch.map(op => {
          const { _index, ...operationData } = op;
          return {
            ...operationData,
            user_id: userId
          };
        });

        try {
          const { error } = await supabase
            .from("trading_operations")
            .insert(operationsWithUserId);

          if (error) {
            console.error(`Erro no lote ${i + 1}:`, error);
            errorCount += batch.length;
            failedOperations.push(`Lote ${i + 1}: ${error.message}`);
          } else {
            successCount += batch.length;
          }
        } catch (batchError: any) {
          console.error(`Exceção no lote ${i + 1}:`, batchError);
          errorCount += batch.length;
          failedOperations.push(`Lote ${i + 1}: ${batchError.message || 'Erro desconhecido'}`);
        }

        // Atualizar progresso
        const currentProgress = Math.round(((i + 1) / batches) * 100);
        setProgress(currentProgress);

        // Pequeno delay entre batches para evitar sobrecarga
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setResults({ success: successCount, errors: errorCount });
      
      if (successCount > 0) {
        toast.success(`${successCount} operação(ões) importada(s) com sucesso!`);
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} operação(ões) falharam na importação`);
        setErrorList(prev => [...prev, ...failedOperations]);
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
    setErrorList([]);
    setShowErrors(false);
    setEditingCell(null);
    setProgress(0);
  };

  const handleCellEdit = (index: number, field: keyof ImportedOperation, value: any) => {
    const updatedPreview = [...previewData];
    const updatedPending = [...pendingOperations];
    
    // Encontrar índice no array completo
    const fullIndex = updatedPending.findIndex(op => op._index === previewData[index]._index);
    
    if (field === 'contracts' || field === 'costs' || field === 'result') {
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        updatedPreview[index] = { ...updatedPreview[index], [field]: numValue };
        if (fullIndex !== -1) {
          updatedPending[fullIndex] = { ...updatedPending[fullIndex], [field]: numValue };
        }
      }
    } else {
      updatedPreview[index] = { ...updatedPreview[index], [field]: value };
      if (fullIndex !== -1) {
        updatedPending[fullIndex] = { ...updatedPending[fullIndex], [field]: value };
      }
    }
    
    setPreviewData(updatedPreview);
    setPendingOperations(updatedPending);
    setEditingCell(null);
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
                      <TableRow key={index} className="hover:bg-accent/50">
                        <TableCell 
                          className="text-xs cursor-pointer hover:bg-accent p-1"
                          onClick={() => setEditingCell({ index, field: 'operation_date' })}
                        >
                          {editingCell?.index === index && editingCell?.field === 'operation_date' ? (
                            <input
                              type="date"
                              defaultValue={op.operation_date}
                              onBlur={(e) => handleCellEdit(index, 'operation_date', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellEdit(index, 'operation_date', e.currentTarget.value);
                                }
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-xs border rounded"
                            />
                          ) : (
                            formattedDate
                          )}
                        </TableCell>
                        <TableCell 
                          className="text-xs cursor-pointer hover:bg-accent p-1"
                          onClick={() => setEditingCell({ index, field: 'operation_time' })}
                        >
                          {editingCell?.index === index && editingCell?.field === 'operation_time' ? (
                            <input
                              type="time"
                              step="1"
                              defaultValue={op.operation_time}
                              onBlur={(e) => handleCellEdit(index, 'operation_time', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellEdit(index, 'operation_time', e.currentTarget.value);
                                }
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-xs border rounded"
                            />
                          ) : (
                            op.operation_time
                          )}
                        </TableCell>
                        <TableCell 
                          className="text-xs cursor-pointer hover:bg-accent p-1"
                          onClick={() => setEditingCell({ index, field: 'asset' })}
                        >
                          {editingCell?.index === index && editingCell?.field === 'asset' ? (
                            <input
                              type="text"
                              defaultValue={op.asset}
                              onBlur={(e) => handleCellEdit(index, 'asset', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellEdit(index, 'asset', e.currentTarget.value);
                                }
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-xs border rounded"
                            />
                          ) : (
                            op.asset
                          )}
                        </TableCell>
                        <TableCell 
                          className="text-xs text-right cursor-pointer hover:bg-accent p-1"
                          onClick={() => setEditingCell({ index, field: 'contracts' })}
                        >
                          {editingCell?.index === index && editingCell?.field === 'contracts' ? (
                            <input
                              type="number"
                              defaultValue={op.contracts}
                              onBlur={(e) => handleCellEdit(index, 'contracts', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellEdit(index, 'contracts', e.currentTarget.value);
                                }
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-xs border rounded text-right"
                            />
                          ) : (
                            op.contracts
                          )}
                        </TableCell>
                        <TableCell 
                          className={`text-xs text-right font-medium cursor-pointer hover:bg-accent p-1 ${op.result >= 0 ? 'text-success' : 'text-destructive'}`}
                          onClick={() => setEditingCell({ index, field: 'result' })}
                        >
                          {editingCell?.index === index && editingCell?.field === 'result' ? (
                            <input
                              type="number"
                              step="0.01"
                              defaultValue={op.result}
                              onBlur={(e) => handleCellEdit(index, 'result', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCellEdit(index, 'result', e.currentTarget.value);
                                }
                              }}
                              autoFocus
                              className="w-full px-2 py-1 text-xs border rounded text-right"
                            />
                          ) : (
                            `${op.result >= 0 ? '+' : ''}${op.result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                          )}
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

        {errorList.length > 0 && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowErrors(!showErrors)}
              className="w-full"
            >
              {showErrors ? 'Ocultar' : 'Ver'} Erros ({errorList.length})
            </Button>
            
            {showErrors && (
              <ScrollArea className="h-[200px] rounded-md border p-3">
                <div className="space-y-1">
                  {errorList.map((error, index) => (
                    <div key={index} className="text-xs text-destructive font-mono bg-destructive/10 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
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
          <p className="font-semibold">Formatos aceitos:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>data_operacao:</strong> DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, ou formato longo do Excel (ex: 15/01/2024, 2024-01-15)</li>
            <li><strong>horario:</strong> HH:MM, HH:MM:SS, HH:MM AM/PM (ex: 10:30, 14:30:00, 2:30 PM)</li>
            <li><strong>ativo:</strong> texto (ex: WIN, WDO, PETR4)</li>
            <li><strong>contratos:</strong> número inteiro (ex: 1, 2, 5)</li>
            <li><strong>custos:</strong> número decimal (opcional, ex: 2.50)</li>
            <li><strong>resultado:</strong> número decimal (ex: 150.00, -75.50)</li>
            <li><strong>observacoes:</strong> texto livre (opcional)</li>
            <li><strong>estrategia:</strong> nome do robô/estratégia (opcional, ex: Bot WIN v1.0)</li>
          </ul>
          <p className="text-xs text-primary mt-2">💡 Dica: Clique em qualquer célula do preview para editar antes de importar</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OperationImport;
