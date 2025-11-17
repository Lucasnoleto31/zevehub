import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { z } from "zod";

interface ImportTransactionsProps {
  onImportComplete: () => void;
}

// Schema de validação para CSV
const transactionSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(200),
  amount: z.number().positive("Valor deve ser positivo"),
  type: z.enum(["income", "expense"]),
  category: z.string().trim().min(1, "Categoria obrigatória").max(100),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use YYYY-MM-DD)"),
  description: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).optional(),
});

export default function ImportTransactions({ onImportComplete }: ImportTransactionsProps) {
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("Arquivo CSV vazio ou inválido");
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const requiredHeaders = ["title", "amount", "type", "category", "transaction_date"];
    
    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Colunas obrigatórias faltando: ${missingHeaders.join(", ")}`);
    }

    const transactions = [];
    const validationErrors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length !== headers.length) {
        validationErrors.push(`Linha ${i + 1}: número incorreto de colunas`);
        continue;
      }

      const transaction: any = {};
      headers.forEach((header, index) => {
        transaction[header] = values[index];
      });

      // Converter valores
      transaction.amount = parseFloat(transaction.amount);
      
      // Parse tags se existir
      if (transaction.tags) {
        transaction.tags = transaction.tags.split(";").map((t: string) => t.trim()).filter(Boolean);
      }

      // Validar com zod
      try {
        const validated = transactionSchema.parse(transaction);
        transactions.push(validated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          validationErrors.push(
            `Linha ${i + 1}: ${error.errors.map((e) => e.message).join(", ")}`
          );
        }
      }
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
    }

    return transactions;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.name.endsWith(".csv")) {
      toast.error("Por favor, selecione um arquivo CSV");
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB");
      return;
    }

    setImporting(true);
    setErrors([]);

    try {
      const text = await file.text();
      const transactions = parseCSV(text);

      if (transactions.length === 0) {
        toast.error("Nenhuma transação válida encontrada");
        setImporting(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Adicionar user_id a todas as transações
      const transactionsWithUser = transactions.map((t) => ({
        ...t,
        user_id: user.id,
      }));

      const { error } = await supabase
        .from("personal_finances")
        .insert(transactionsWithUser);

      if (error) throw error;

      toast.success(
        `${transactions.length} transação(ões) importada(s) com sucesso!`
      );
      
      if (errors.length > 0) {
        toast.warning(`${errors.length} linha(s) com erro foram ignoradas`);
      }

      onImportComplete();
    } catch (error: any) {
      console.error("Erro ao importar transações:", error);
      toast.error(error.message || "Erro ao importar transações");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const downloadTemplate = () => {
    const template = `title,amount,type,category,transaction_date,description,tags
Salário Janeiro,5000.00,income,Salário,2024-01-05,Salário do mês,trabalho;principal
Supermercado,350.50,expense,Alimentação,2024-01-10,Compras mensais,mercado;essencial
Aluguel,1200.00,expense,Moradia,2024-01-01,Aluguel mensal,fixo;moradia`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_importacao.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Modelo baixado com sucesso!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Transações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Importe suas transações via arquivo CSV. O arquivo deve conter as colunas:
            title, amount, type, category, transaction_date. Opcionais: description, tags
            (separadas por ponto e vírgula).
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Baixar Modelo CSV
          </Button>

          <Button
            className="w-full"
            disabled={importing}
            onClick={() => document.getElementById("csv-upload")?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {importing ? "Importando..." : "Selecionar Arquivo CSV"}
          </Button>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Erros encontrados:</p>
              <ul className="list-disc list-inside space-y-1 text-sm max-h-40 overflow-y-auto">
                {errors.slice(0, 10).map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
                {errors.length > 10 && (
                  <li>... e mais {errors.length - 10} erro(s)</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
