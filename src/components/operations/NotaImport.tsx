import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface NotaImportProps {
  userId: string;
  onSuccess?: () => void;
}

export const NotaImport = ({ userId, onSuccess }: NotaImportProps) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/vnd.ms-excel",
    ];

    if (!validTypes.includes(file.type)) {
      toast.error("Formato não suportado. Use PDF, XLSX ou TXT.");
      return;
    }

    setLoading(true);
    setProgress(10);
    setResult(null);

    try {
      // Ler conteúdo do arquivo
      setProgress(30);
      const text = await file.text();
      
      setProgress(50);
      
      // Chamar edge function para processar
      const { data, error } = await supabase.functions.invoke("parse-nota-corretagem", {
        body: { fileContent: text, userId },
      });

      setProgress(80);

      if (error) throw error;

      if (data.success && data.count > 0) {
        setResult(data);
        setProgress(100);
        toast.success(`${data.count} operações importadas com sucesso!`);
        if (onSuccess) onSuccess();
      } else {
        toast.warning(data.message || "Nenhuma operação encontrada no arquivo");
        setResult({ ...data, success: false });
      }
    } catch (error: any) {
      console.error("Erro ao importar:", error);
      toast.error(error.message || "Erro ao processar arquivo");
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp className="w-5 h-5" />
          Importar Nota de Corretagem
        </CardTitle>
        <CardDescription>
          Upload de PDF, XLSX ou TXT para extração automática com IA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.xlsx,.xls,.txt"
              onChange={handleFileUpload}
              disabled={loading}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <FileUp className="w-12 h-12 text-muted-foreground" />
                <div className="text-sm font-medium">
                  {loading ? "Processando..." : "Clique para selecionar arquivo"}
                </div>
                <div className="text-xs text-muted-foreground">
                  PDF, XLSX ou TXT até 10MB
                </div>
              </div>
            </label>
          </div>

          {loading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando com IA...</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {result && (
            <div className={`p-4 rounded-lg border ${
              result.success 
                ? "bg-green-50 border-green-200" 
                : "bg-yellow-50 border-yellow-200"
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-medium">
                    {result.success 
                      ? `${result.count} operações importadas` 
                      : "Nenhuma operação encontrada"}
                  </div>
                  {result.message && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {result.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div className="font-medium">Como funciona:</div>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Upload do arquivo da sua corretora</li>
            <li>IA extrai automaticamente as operações</li>
            <li>Operações são salvas no seu histórico</li>
            <li>Classificação de estratégia pode ser feita depois</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};