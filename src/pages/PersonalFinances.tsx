import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Download } from "lucide-react";
import { TransactionDialog } from "@/components/finances/TransactionDialog";
import { TransactionsTable } from "@/components/finances/TransactionsTable";
import { FinancialSummary } from "@/components/finances/FinancialSummary";
import { FinancialCharts } from "@/components/finances/FinancialCharts";
import { FinancialGoals } from "@/components/finances/FinancialGoals";
import { PeriodFilter } from "@/components/finances/PeriodFilter";
import { AdvancedMetrics } from "@/components/finances/AdvancedMetrics";
import { AdvancedFilters } from "@/components/finances/AdvancedFilters";
import { ImportTransactions } from "@/components/finances/ImportTransactions";
import { BudgetManager } from "@/components/finances/BudgetManager";
import { CategoryDrilldown } from "@/components/finances/CategoryDrilldown";
import { AccountManager } from "@/components/finances/AccountManager";
import { RecurringManager } from "@/components/finances/RecurringManager";
import { CashflowPrediction } from "@/components/finances/CashflowPrediction";
import { PDFExport } from "@/components/finances/PDFExport";
import { useGoalNotifications } from "@/hooks/useGoalNotifications";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

import { Transaction } from "@/types/finances";

const PersonalFinances = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [displayTransactions, setDisplayTransactions] = useState<Transaction[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<'month' | 'quarter' | 'year' | 'all'>('month');
  const [categories, setCategories] = useState<string[]>([]);
  
  useGoalNotifications();

  useEffect(() => {
    checkUser();
    loadCategories();
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
      setFilteredTransactions((data || []) as Transaction[]);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
      toast.error("Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    filterTransactionsByPeriod();
  }, [periodFilter, transactions]);

  useEffect(() => {
    setDisplayTransactions(filteredTransactions);
  }, [filteredTransactions]);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("finance_categories")
        .select("name")
        .eq("type", "expense")
        .order("name");

      if (error) throw error;
      setCategories(data?.map(c => c.name) || []);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  const filterTransactionsByPeriod = () => {
    const now = new Date();
    let startDate = new Date();

    switch (periodFilter) {
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
        setFilteredTransactions(transactions);
        return;
    }

    const filtered = transactions.filter(t => 
      new Date(t.transaction_date) >= startDate
    );
    setFilteredTransactions(filtered);
  };

  const exportToExcel = () => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = filteredTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const balance = totalIncome - totalExpense;

    const summaryData = [
      { Tipo: 'Total de Receitas', Valor: totalIncome.toFixed(2) },
      { Tipo: 'Total de Despesas', Valor: totalExpense.toFixed(2) },
      { Tipo: 'Saldo', Valor: balance.toFixed(2) }
    ];

    const transactionsData = filteredTransactions.map(t => ({
      Data: new Date(t.transaction_date).toLocaleDateString('pt-BR'),
      Título: t.title,
      Tipo: t.type === 'income' ? 'Receita' : 'Despesa',
      Categoria: t.category,
      Valor: Number(t.amount).toFixed(2),
      Descrição: t.description || ''
    }));

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsTransactions = XLSX.utils.json_to_sheet(transactionsData);

    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");
    XLSX.utils.book_append_sheet(wb, wsTransactions, "Transações");

    XLSX.writeFile(wb, `financas_pessoais_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Relatório exportado com sucesso!");
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

  const totalIncome = filteredTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const balance = totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Finanças Pessoais
            </h1>
            <p className="text-muted-foreground mt-2">
              Controle completo com IA e automação
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setIsDialogOpen(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Nova Transação
            </Button>
            <Button onClick={exportToExcel} variant="outline" size="lg">
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </div>

        <PeriodFilter 
          value={periodFilter}
          onChange={setPeriodFilter}
        />

        <FinancialSummary 
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          balance={balance}
        />

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="overview">Geral</TabsTrigger>
            <TabsTrigger value="analytics">Análise</TabsTrigger>
            <TabsTrigger value="prediction">IA</TabsTrigger>
            <TabsTrigger value="drilldown">Categorias</TabsTrigger>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="accounts">Contas</TabsTrigger>
            <TabsTrigger value="recurring">Recorrentes</TabsTrigger>
            <TabsTrigger value="goals">Metas</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <FinancialCharts transactions={filteredTransactions} />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <AdvancedMetrics transactions={filteredTransactions} />
          </TabsContent>

          <TabsContent value="prediction" className="space-y-4">
            <CashflowPrediction />
            <PDFExport transactions={filteredTransactions} />
          </TabsContent>

          <TabsContent value="drilldown" className="space-y-4">
            <CategoryDrilldown transactions={filteredTransactions} />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <AdvancedFilters
              transactions={filteredTransactions}
              onFilterChange={setDisplayTransactions}
              categories={categories}
            />
            <ImportTransactions onImportComplete={loadTransactions} />
            <Card>
              <CardHeader>
                <CardTitle>Todas as Transações</CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionsTable
                  transactions={displayTransactions}
                  loading={loading}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts">
            <AccountManager />
          </TabsContent>

          <TabsContent value="recurring">
            <RecurringManager />
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <FinancialGoals />
            <BudgetManager categories={categories} />
          </TabsContent>
        </Tabs>

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
