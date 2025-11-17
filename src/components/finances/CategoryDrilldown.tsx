import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction } from "@/types/finances";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface CategoryDrilldownProps {
  transactions: Transaction[];
}

export const CategoryDrilldown = ({ transactions }: CategoryDrilldownProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categoryData = useMemo(() => {
    const expensesByCategory: { [key: string]: number } = {};

    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        expensesByCategory[t.category] =
          (expensesByCategory[t.category] || 0) + Number(t.amount);
      });

    return Object.entries(expensesByCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage:
          (amount /
            Object.values(expensesByCategory).reduce((a, b) => a + b, 0)) *
          100,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  const categoryTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return transactions
      .filter((t) => t.category === selectedCategory && t.type === "expense")
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
  }, [transactions, selectedCategory]);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
  };

  const categoryTotal = useMemo(() => {
    return categoryTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  }, [categoryTransactions]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Despesas por Categoria</CardTitle>
          <p className="text-sm text-muted-foreground">
            Clique em uma categoria para ver detalhes
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ percentage }) => `${percentage.toFixed(1)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                  onClick={(data) => handleCategoryClick(data.category)}
                  className="cursor-pointer"
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  }
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-3">
              {categoryData.map((item, index) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleCategoryClick(item.category)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <p className="font-medium">{item.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.percentage.toFixed(1)}% do total
                      </p>
                    </div>
                  </div>
                  <p className="font-bold">
                    R$ {item.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Transações - {selectedCategory}</span>
              <span className="text-lg font-bold text-primary">
                Total: R$ {categoryTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {new Date(transaction.transaction_date).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.title}
                    </TableCell>
                    <TableCell className="text-destructive font-semibold">
                      R$ {Number(transaction.amount).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {((transaction as any).tags || []).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
