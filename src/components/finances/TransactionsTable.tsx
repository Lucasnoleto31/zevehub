import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, TrendingUp, TrendingDown, ArrowUpDown, Search } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Transaction } from "@/types/finances";

type SortField = "date" | "amount" | "category" | null;
type SortOrder = "asc" | "desc";

interface TransactionsTableProps {
  transactions: Transaction[];
  loading: boolean;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export const TransactionsTable = ({
  transactions,
  loading,
  onEdit,
  onDelete,
}: TransactionsTableProps) => {
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  let filteredTransactions = [...transactions];

  // Filtro de busca por título
  if (searchTerm) {
    filteredTransactions = filteredTransactions.filter((t) =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Filtro de valor
  if (minValue) {
    filteredTransactions = filteredTransactions.filter(
      (t) => Number(t.amount) >= Number(minValue)
    );
  }
  if (maxValue) {
    filteredTransactions = filteredTransactions.filter(
      (t) => Number(t.amount) <= Number(maxValue)
    );
  }

  // Filtro de data
  if (startDate) {
    filteredTransactions = filteredTransactions.filter(
      (t) => t.transaction_date >= startDate
    );
  }
  if (endDate) {
    filteredTransactions = filteredTransactions.filter(
      (t) => t.transaction_date <= endDate
    );
  }

  // Ordenação
  if (sortField) {
    filteredTransactions.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "date":
          comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
          break;
        case "amount":
          comparison = Number(a.amount) - Number(b.amount);
          break;
        case "category":
          comparison = a.category.localeCompare(b.category);
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }

  if (loading) {
    return <div className="text-center py-8">Carregando transações...</div>;
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma transação encontrada
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Input
          type="number"
          placeholder="Valor mínimo"
          value={minValue}
          onChange={(e) => setMinValue(e.target.value)}
        />
        <Input
          type="number"
          placeholder="Valor máximo"
          value={maxValue}
          onChange={(e) => setMaxValue(e.target.value)}
        />
        <Input
          type="date"
          placeholder="Data inicial"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input
          type="date"
          placeholder="Data final"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSort("date")}
              className="flex items-center gap-1 hover:bg-transparent"
            >
              Data
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </TableHead>
          <TableHead>Título</TableHead>
          <TableHead>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSort("category")}
              className="flex items-center gap-1 hover:bg-transparent"
            >
              Categoria
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSort("amount")}
              className="flex items-center gap-1 hover:bg-transparent"
            >
              Valor
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredTransactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell className="font-medium">
              {format(new Date(transaction.transaction_date), "dd/MM/yyyy", {
                locale: ptBR,
              })}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {transaction.type === "income" ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span>{transaction.title}</span>
              </div>
            </TableCell>
            <TableCell>{transaction.category}</TableCell>
            <TableCell>
              <Badge
                variant={transaction.type === "income" ? "default" : "secondary"}
                className={
                  transaction.type === "income"
                    ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                    : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                }
              >
                {transaction.type === "income" ? "Receita" : "Despesa"}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-semibold">
              <span
                className={
                  transaction.type === "income" ? "text-green-500" : "text-red-500"
                }
              >
                {transaction.type === "income" ? "+" : "-"}R${" "}
                {Number(transaction.amount).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(transaction)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir esta transação? Esta ação não
                        pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(transaction.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
};
