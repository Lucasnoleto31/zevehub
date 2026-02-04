import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TableResult {
  table: string;
  deleted: number;
  error?: string;
}

interface CleanerResult {
  success: boolean;
  totalDeleted: number;
  tablesProcessed: number;
  errors: number;
  details: TableResult[];
}

const DatabaseCleaner = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [confirmStep, setConfirmStep] = useState(0);
  const [confirmText, setConfirmText] = useState("");
  const [results, setResults] = useState<CleanerResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleClearDatabase = async () => {
    if (confirmText !== "EXCLUIR TUDO PERMANENTEMENTE") {
      toast.error("Digite a frase de confirmação corretamente");
      return;
    }

    setIsLoading(true);
    setProgress(10);

    try {
      setProgress(30);

      const { data, error } = await supabase.functions.invoke('clear-all-data');

      setProgress(90);

      if (error) {
        throw error;
      }

      setResults(data as CleanerResult);
      setProgress(100);

      if (data.success) {
        toast.success(`Banco de dados limpo! ${data.totalDeleted} registros excluídos.`);
      } else {
        toast.error("Houve erros durante a limpeza");
      }
    } catch (error: any) {
      console.error("Erro ao limpar banco:", error);
      toast.error(error.message || "Erro ao limpar banco de dados");
    } finally {
      setIsLoading(false);
      setConfirmStep(0);
      setConfirmText("");
    }
  };

  const resetDialog = () => {
    setConfirmStep(0);
    setConfirmText("");
  };

  return (
    <Card className="border-destructive bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Limpar Banco de Dados
        </CardTitle>
        <CardDescription>
          Exclui TODOS os dados do sistema permanentemente. Esta ação é IRREVERSÍVEL.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Limpando banco de dados...
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{results.totalDeleted} registros excluídos</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{results.tablesProcessed} tabelas processadas</span>
              </div>
              {results.errors > 0 && (
                <div className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span>{results.errors} erros</span>
                </div>
              )}
            </div>

            <ScrollArea className="h-48 rounded border p-2">
              <div className="space-y-1 text-xs font-mono">
                {results.details.map((result, index) => (
                  <div 
                    key={index} 
                    className={`flex justify-between ${result.error && !result.error.includes('Reset') ? 'text-destructive' : 'text-muted-foreground'}`}
                  >
                    <span>{result.table}</span>
                    <span>
                      {result.error && !result.error.includes('Reset') 
                        ? `❌ ${result.error.slice(0, 30)}...` 
                        : `✓ ${result.deleted} excluídos`}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <AlertDialog onOpenChange={(open) => !open && resetDialog()}>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive" 
              className="w-full gap-2"
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4" />
              Limpar Todo o Banco de Dados
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            {confirmStep === 0 && (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    ⚠️ ATENÇÃO - Primeira Confirmação
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p className="font-bold text-destructive">
                      Esta ação irá EXCLUIR PERMANENTEMENTE todos os dados do sistema:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Todas as operações de trading</li>
                      <li>Todos os dados financeiros</li>
                      <li>Todas as postagens da comunidade</li>
                      <li>Todas as mensagens e notificações</li>
                      <li>Todas as configurações de usuários</li>
                    </ul>
                    <p className="font-bold">Esta ação NÃO pode ser desfeita!</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <Button 
                    variant="destructive" 
                    onClick={() => setConfirmStep(1)}
                  >
                    Entendo, continuar
                  </Button>
                </AlertDialogFooter>
              </>
            )}

            {confirmStep === 1 && (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    ⚠️ Segunda Confirmação
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <p className="mb-4">
                      Você tem CERTEZA ABSOLUTA? Todos os usuários perderão seus dados.
                    </p>
                    <div>
                      <label className="text-sm font-medium">
                        Digite "EXCLUIR TUDO PERMANENTEMENTE" para confirmar:
                      </label>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="EXCLUIR TUDO PERMANENTEMENTE"
                        className="w-full mt-2 px-3 py-2 border rounded-md bg-background"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={resetDialog}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearDatabase}
                    disabled={confirmText !== "EXCLUIR TUDO PERMANENTEMENTE"}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    EXCLUIR TUDO
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            )}
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default DatabaseCleaner;
