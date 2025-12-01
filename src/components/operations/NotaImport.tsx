import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp, Loader2, CheckCircle2, AlertCircle, Check, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NotaImportProps {
  userId: string;
  onSuccess?: () => void;
}

interface PreviewOperation {
  ticker: string;
  type: string;
  qty: number;
  price: number;
  result: number;
  date: string;
  time: string;
  broker: string;
  costs: number;
  risk_level: string;
  notes: string;
}

export const NotaImport = ({ userId, onSuccess }: NotaImportProps) => {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [previewOperations, setPreviewOperations] = useState<PreviewOperation[]>([]);
  const [rawFileContent, setRawFileContent] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);

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

      if (data.success && data.count > 0 && data.preview) {
        // Modo preview - mostrar operações para confirmação
        setPreviewOperations(data.operations);
        setRawFileContent(text);
        setShowPreview(true);
        setProgress(100);
        toast.success(`${data.count} operações extraídas. Revise antes de confirmar.`);
      } else if (data.success && data.count > 0) {
        // Importação direta (sem preview)
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

  const handleConfirmImport = async () => {
    setConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-import", {
        body: {
          operations: previewOperations,
          userId,
          rawNote: rawFileContent,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`${data.count} operações confirmadas e salvas!`);
        setShowPreview(false);
        setPreviewOperations([]);
        setResult(data);
        if (onSuccess) onSuccess();
      }
    } catch (error: any) {
      console.error("Erro ao confirmar:", error);
      toast.error(error.message || "Erro ao confirmar importação");
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreviewOperations([]);
    setProgress(0);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  if (showPreview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Preview da Importação
          </CardTitle>
          <CardDescription>
            {previewOperations.length} operações encontradas - Revise antes de confirmar
            {previewOperations[0]?.broker && (
              <Badge variant="outline" className="ml-2">
                {previewOperations[0].broker.toUpperCase()}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Resultado</TableHead>
                  <TableHead>Risco</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewOperations.map((op, index) => (
                  <TableRow key={index}>
                    <TableCell>{formatDate(op.date)}</TableCell>
                    <TableCell>{op.time}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{op.ticker}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={op.type === "C" ? "default" : "secondary"}>
                        {op.type === "C" ? "Compra" : "Venda"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{op.qty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(op.price)}</TableCell>
                    <TableCell className="text-right">
                      <span className={op.result >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                        {op.result >= 0 ? "+" : ""}{formatCurrency(op.result)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          op.risk_level === "ALTO" ? "destructive" : 
                          op.risk_level === "BAIXO" ? "default" : 
                          "secondary"
                        }
                        className="text-xs"
                      >
                        {op.risk_level}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="flex gap-2">
            <Button
              onClick={handleConfirmImport}
              disabled={confirming}
              className="flex-1 gap-2"
            >
              {confirming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirmar e Salvar ({previewOperations.length} ops)
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelPreview}
              disabled={confirming}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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

        <div className="text-xs text-muted-foreground space-y-2">
          <div>
            <div className="font-medium mb-1">📋 Como funciona:</div>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>Upload do arquivo da sua corretora</li>
              <li>IA extrai automaticamente as operações</li>
              <li>Preview para revisar antes de salvar</li>
              <li>Operações confirmadas são salvas no seu histórico</li>
            </ul>
          </div>
          
          <div>
            <div className="font-medium mb-1">🏦 Corretoras suportadas:</div>
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge variant="outline" className="text-xs">Clear</Badge>
              <Badge variant="outline" className="text-xs">XP</Badge>
              <Badge variant="outline" className="text-xs">BTG</Badge>
              <Badge variant="outline" className="text-xs">Modal</Badge>
              <Badge variant="outline" className="text-xs">Rico</Badge>
              <Badge variant="outline" className="text-xs">Inter</Badge>
              <Badge variant="outline" className="text-xs">Ativa</Badge>
              <Badge variant="outline" className="text-xs">Genial</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};