import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, Trash2, Database, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface ApolloDataReplacerProps {
  userId?: string;
}

interface ParsedOperation {
  operation_date: string;
  operation_time: string;
  asset: string;
  contracts: number;
  costs: number;
  result: number;
  notes: string | null;
}

type Step = "idle" | "parsing" | "deleting" | "inserting" | "done" | "error";

const ApolloDataReplacer = ({ userId }: ApolloDataReplacerProps) => {
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [totalOperations, setTotalOperations] = useState(0);
  const [deletedCount, setDeletedCount] = useState(0);
  const [insertedCount, setInsertedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseDateTime = (value: string): { date: string; time: string } => {
    // Formato esperado: "2024.12.12 16:38:04"
    if (!value) return { date: new Date().toISOString().split("T")[0], time: "00:00:00" };
    
    const parts = value.split(" ");
    const datePart = parts[0]?.replace(/\./g, "-") || new Date().toISOString().split("T")[0];
    const timePart = parts[1] || "00:00:00";
    
    return { date: datePart, time: timePart };
  };

  const parseExcelFile = async (file: File): Promise<ParsedOperation[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          // Pular cabeçalho
          const operations: ParsedOperation[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const dataOperacao = row[0]?.toString() || "";
            const horario = row[1]?.toString() || dataOperacao;
            const { date, time } = parseDateTime(dataOperacao);
            const timeFromHorario = parseDateTime(horario).time;

            operations.push({
              operation_date: date,
              operation_time: timeFromHorario || time,
              asset: row[2]?.toString() || "WIN",
              contracts: Number(row[3]) || 1,
              costs: Number(row[4]) || 0,
              result: Number(row[5]) || 0,
              notes: row[6]?.toString() || null,
            });
          }

          resolve(operations);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsArrayBuffer(file);
    });
  };

  const deleteApolloData = async (): Promise<number> => {
    setStatusMessage("Deletando dados antigos do Apollo...");
    
    const { data, error } = await supabase.functions.invoke("replace-apollo-data", {
      body: { action: "delete" },
    });

    if (error) throw error;
    return data?.deleted || 0;
  };

  const insertOperations = async (operations: ParsedOperation[]): Promise<number> => {
    const chunkSize = 200; // Enviar 200 por vez para a Edge Function (ela divide em lotes de 10)
    let totalInserted = 0;
    let totalErrors = 0;

    for (let i = 0; i < operations.length; i += chunkSize) {
      const chunk = operations.slice(i, i + chunkSize);
      
      setStatusMessage(`Inserindo operações ${i + 1} a ${Math.min(i + chunkSize, operations.length)} de ${operations.length}...`);
      setProgress(Math.round(((i + chunk.length) / operations.length) * 100));

      try {
        const { data, error } = await supabase.functions.invoke("replace-apollo-data", {
          body: { 
            action: "insert", 
            operations: chunk,
            userId 
          },
        });

        if (error) {
          console.error("Erro ao inserir lote:", error);
          totalErrors++;
          // Tentar continuar mesmo com erro
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        totalInserted += data?.inserted || 0;
        setInsertedCount(totalInserted);
        console.log(`Chunk ${i / chunkSize + 1}: +${data?.inserted || 0} (total: ${totalInserted})`);
      } catch (err) {
        console.error("Erro na chamada:", err);
        totalErrors++;
      }

      // Delay maior entre chunks para evitar sobrecarga
      await new Promise(r => setTimeout(r, 500));
    }

    console.log(`Import finalizado: ${totalInserted} inseridas, ${totalErrors} erros`);
    return totalInserted;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    try {
      // 1. Parse do arquivo
      setStep("parsing");
      setStatusMessage("Lendo planilha...");
      setProgress(0);

      const operations = await parseExcelFile(file);
      setTotalOperations(operations.length);
      
      toast({
        title: "Planilha processada",
        description: `${operations.length} operações encontradas`,
      });

      // 2. Deletar dados antigos
      setStep("deleting");
      setProgress(0);
      
      const deleted = await deleteApolloData();
      setDeletedCount(deleted);
      setProgress(100);

      toast({
        title: "Dados antigos removidos",
        description: `${deleted} operações do Apollo deletadas`,
      });

      // 3. Inserir novos dados
      setStep("inserting");
      setProgress(0);

      const inserted = await insertOperations(operations);
      setInsertedCount(inserted);
      setProgress(100);

      // 4. Concluído
      setStep("done");
      setStatusMessage("Substituição concluída com sucesso!");

      toast({
        title: "✅ Substituição concluída!",
        description: `${deleted} removidas, ${inserted} inseridas`,
      });

    } catch (error) {
      console.error("Erro na substituição:", error);
      setStep("error");
      setStatusMessage(error instanceof Error ? error.message : "Erro desconhecido");
      
      toast({
        title: "Erro na substituição",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const reset = () => {
    setStep("idle");
    setProgress(0);
    setStatusMessage("");
    setTotalOperations(0);
    setDeletedCount(0);
    setInsertedCount(0);
  };

  const isProcessing = step === "parsing" || step === "deleting" || step === "inserting";

  return (
    <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
          <Database className="h-5 w-5" />
          Substituir Dados do Apollo
        </CardTitle>
        <CardDescription>
          Remove todos os dados antigos do Apollo e importa a nova planilha
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "idle" && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="hidden"
              id="apollo-file-input"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-orange-600 hover:bg-orange-700"
              disabled={!userId}
            >
              <Upload className="mr-2 h-4 w-4" />
              Selecionar Planilha do Apollo
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              ⚠️ Esta ação irá DELETAR todos os dados atuais do Apollo e substituir pelos novos
            </p>
          </>
        )}

        {isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
              <span className="text-sm font-medium">{statusMessage}</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {step === "deleting" && "Deletando..."}
                {step === "inserting" && `Inseridos: ${insertedCount}`}
              </span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Substituição concluída!</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-red-500" />
                <span>{deletedCount} removidas</span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-green-500" />
                <span>{insertedCount} inseridas</span>
              </div>
            </div>
            <Button variant="outline" onClick={reset} className="w-full">
              Nova Substituição
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Erro na substituição</span>
            </div>
            <p className="text-sm text-muted-foreground">{statusMessage}</p>
            <Button variant="outline" onClick={reset} className="w-full">
              Tentar Novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApolloDataReplacer;
