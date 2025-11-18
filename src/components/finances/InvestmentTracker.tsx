import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { toast } from "sonner";

interface Investment {
  id: string;
  name: string;
  type: 'stocks' | 'fixed_income';
  amount: number;
  currentValue: number;
  acquisitionDate: string;
  ticker?: string;
  broker?: string;
}

const COLORS = {
  stocks: 'hsl(var(--primary))',
  fixed_income: 'hsl(var(--secondary))',
};

export const InvestmentTracker = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'stocks' as 'stocks' | 'fixed_income',
    amount: '',
    currentValue: '',
    ticker: '',
    broker: '',
    acquisitionDate: new Date().toISOString().split('T')[0],
  });

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('investments');
    if (stored) {
      setInvestments(JSON.parse(stored));
    }
  }, []);

  // Save to localStorage whenever investments change
  useEffect(() => {
    if (investments.length > 0) {
      localStorage.setItem('investments', JSON.stringify(investments));
    }
  }, [investments]);

  const handleAddInvestment = () => {
    if (!formData.name || !formData.amount || !formData.currentValue) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const newInvestment: Investment = {
      id: crypto.randomUUID(),
      name: formData.name,
      type: formData.type,
      amount: parseFloat(formData.amount),
      currentValue: parseFloat(formData.currentValue),
      acquisitionDate: formData.acquisitionDate,
      ticker: formData.ticker,
      broker: formData.broker,
    };

    setInvestments([...investments, newInvestment]);
    setIsDialogOpen(false);
    setFormData({
      name: '',
      type: 'stocks',
      amount: '',
      currentValue: '',
      ticker: '',
      broker: '',
      acquisitionDate: new Date().toISOString().split('T')[0],
    });
    toast.success('Investimento adicionado com sucesso!');
  };

  const handleDeleteInvestment = (id: string) => {
    setInvestments(investments.filter(inv => inv.id !== id));
    toast.success('Investimento removido');
  };

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const currentTotalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalProfit = currentTotalValue - totalInvested;
  const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  const stocksTotal = investments
    .filter(inv => inv.type === 'stocks')
    .reduce((sum, inv) => sum + inv.currentValue, 0);
  
  const fixedIncomeTotal = investments
    .filter(inv => inv.type === 'fixed_income')
    .reduce((sum, inv) => sum + inv.currentValue, 0);

  const chartData = [
    { name: 'Bolsa', value: stocksTotal, color: COLORS.stocks },
    { name: 'Renda Fixa', value: fixedIncomeTotal, color: COLORS.fixed_income },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Acompanhamento de Investimentos</h2>
          <p className="text-muted-foreground">Consolidado de Bolsa e Renda Fixa</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Investimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Investimento</DialogTitle>
              <DialogDescription>
                Adicione um novo investimento ao seu portfólio
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Investimento *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Tesouro Selic 2029"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select value={formData.type} onValueChange={(v: any) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stocks">Bolsa de Valores</SelectItem>
                    <SelectItem value="fixed_income">Renda Fixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor Investido (R$) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currentValue">Valor Atual (R$) *</Label>
                  <Input
                    id="currentValue"
                    type="number"
                    step="0.01"
                    value={formData.currentValue}
                    onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticker">Ticker/Código</Label>
                <Input
                  id="ticker"
                  value={formData.ticker}
                  onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
                  placeholder="Ex: PETR4, VALE3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="broker">Corretora</Label>
                <Input
                  id="broker"
                  value={formData.broker}
                  onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                  placeholder="Ex: XP, Rico, Nu Invest"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="acquisitionDate">Data de Aquisição</Label>
                <Input
                  id="acquisitionDate"
                  type="date"
                  value={formData.acquisitionDate}
                  onChange={(e) => setFormData({ ...formData, acquisitionDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddInvestment}>
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Investido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalInvested.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {currentTotalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {totalProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              Lucro/Prejuízo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rentabilidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {profitPercentage.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribuição do Patrimônio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum investimento cadastrado
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Bolsa de Valores</p>
                <p className="text-2xl font-bold">
                  {stocksTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <Badge variant="secondary">
                {currentTotalValue > 0 ? ((stocksTotal / currentTotalValue) * 100).toFixed(1) : 0}%
              </Badge>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Renda Fixa</p>
                <p className="text-2xl font-bold">
                  {fixedIncomeTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <Badge variant="secondary">
                {currentTotalValue > 0 ? ((fixedIncomeTotal / currentTotalValue) * 100).toFixed(1) : 0}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seus Investimentos</CardTitle>
          <CardDescription>
            Lista completa de investimentos cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {investments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Investido</TableHead>
                  <TableHead>Valor Atual</TableHead>
                  <TableHead>Rentabilidade</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investments.map((investment) => {
                  const profit = investment.currentValue - investment.amount;
                  const profitPercent = (profit / investment.amount) * 100;
                  
                  return (
                    <TableRow key={investment.id}>
                      <TableCell className="font-medium">{investment.name}</TableCell>
                      <TableCell>
                        <Badge variant={investment.type === 'stocks' ? 'default' : 'secondary'}>
                          {investment.type === 'stocks' ? 'Bolsa' : 'Renda Fixa'}
                        </Badge>
                      </TableCell>
                      <TableCell>{investment.ticker || '-'}</TableCell>
                      <TableCell>
                        {investment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell>
                        {investment.currentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell>
                        <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({profitPercent.toFixed(2)}%)
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteInvestment(investment.id)}
                        >
                          Remover
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum investimento cadastrado. Clique em "Adicionar Investimento" para começar.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
