import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { TransactionDialog } from "@/components/finances/TransactionDialog";
import { TransactionsTable } from "@/components/finances/TransactionsTable";
import { FinancialSummary } from "@/components/finances/FinancialSummary";
import { toast } from "sonner";

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description?: string;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const PersonalFinances = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    await loadTransactions();
  };

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("personal_finances")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as Transaction[]);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
      toast.error("Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("personal_finances")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Transação excluída com sucesso");
      loadTransactions();
    } catch (error) {
      console.error("Erro ao excluir transação:", error);
      toast.error("Erro ao excluir transação");
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTransaction(null);
  };

  const handleSaveTransaction = () => {
    loadTransactions();
    handleCloseDialog();
  };

  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Finanças Pessoais
            </h1>
            <p className="text-muted-foreground mt-2">
              Controle suas receitas e despesas
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        </div>

        <FinancialSummary 
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          balance={balance}
        />

        <Card>
          <CardHeader>
            <CardTitle>Todas as Transações</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionsTable
              transactions={transactions}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>

        <TransactionDialog
          open={isDialogOpen}
          onOpenChange={handleCloseDialog}
          transaction={editingTransaction}
          onSave={handleSaveTransaction}
        />
      </div>
    </div>
  );
};

export default PersonalFinances;
