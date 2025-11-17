import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Wallet, CreditCard, Banknote, TrendingUp, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
  is_active: boolean;
}

export const AccountManager = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "bank",
    color: "hsl(210, 70%, 50%)",
  });
  const [transfer, setTransfer] = useState({
    from: "",
    to: "",
    amount: "",
    description: "",
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("financial_accounts")
        .select("*")
        .eq("is_active", true)
        .order("created_at");

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
      toast.error("Erro ao carregar contas");
    }
  };

  const handleSaveAccount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("financial_accounts").insert([{
        user_id: user.id,
        ...newAccount,
      }]);

      if (error) throw error;

      toast.success("Conta criada com sucesso!");
      setIsDialogOpen(false);
      setNewAccount({ name: "", type: "bank", color: "hsl(210, 70%, 50%)" });
      loadAccounts();
    } catch (error: any) {
      console.error("Erro ao criar conta:", error);
      toast.error(error.message || "Erro ao criar conta");
    }
  };

  const handleTransfer = async () => {
    try {
      if (!transfer.from || !transfer.to || !transfer.amount) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const amount = parseFloat(transfer.amount);
      const today = new Date().toISOString().split("T")[0];

      // Criar registro de transferência
      const { error: transferError } = await supabase
        .from("account_transfers")
        .insert([{
          user_id: user.id,
          from_account_id: transfer.from,
          to_account_id: transfer.to,
          amount,
          transfer_date: today,
          description: transfer.description,
        }]);

      if (transferError) throw transferError;

      // Atualizar saldos
      const { error: updateFromError } = await supabase.rpc("update_account_balance", {
        account_id: transfer.from,
        delta: -amount,
      });

      const { error: updateToError } = await supabase.rpc("update_account_balance", {
        account_id: transfer.to,
        delta: amount,
      });

      if (updateFromError || updateToError) {
        throw new Error("Erro ao atualizar saldos");
      }

      toast.success("Transferência realizada com sucesso!");
      setIsTransferOpen(false);
      setTransfer({ from: "", to: "", amount: "", description: "" });
      loadAccounts();
    } catch (error: any) {
      console.error("Erro ao fazer transferência:", error);
      toast.error(error.message || "Erro ao fazer transferência");
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "bank": return Wallet;
      case "credit_card": return CreditCard;
      case "cash": return Banknote;
      case "investment": return TrendingUp;
      default: return Wallet;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bank: "Conta Bancária",
      credit_card: "Cartão de Crédito",
      cash: "Dinheiro",
      investment: "Investimento",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Gerenciar Contas</h3>
        <div className="flex gap-2">
          <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ArrowRight className="mr-2 h-4 w-4" />
                Transferir
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Transferência Entre Contas</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Conta de Origem</Label>
                  <Select value={transfer.from} onValueChange={(v) => setTransfer({ ...transfer, from: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} - R$ {acc.balance.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Conta de Destino</Label>
                  <Select value={transfer.to} onValueChange={(v) => setTransfer({ ...transfer, to: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.filter(a => a.id !== transfer.from).map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name} - R$ {acc.balance.toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={transfer.amount}
                    onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input
                    placeholder="Ex: Transferência para poupança"
                    value={transfer.description}
                    onChange={(e) => setTransfer({ ...transfer, description: e.target.value })}
                  />
                </div>

                <Button onClick={handleTransfer} className="w-full">
                  Confirmar Transferência
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Conta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da Conta</Label>
                  <Input
                    placeholder="Ex: Conta Corrente Banco X"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={newAccount.type} onValueChange={(v) => setNewAccount({ ...newAccount, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">Conta Bancária</SelectItem>
                      <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="investment">Investimento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newAccount.color}
                      onChange={(e) => setNewAccount({ ...newAccount, color: e.target.value })}
                      placeholder="hsl(210, 70%, 50%)"
                    />
                    <div
                      className="w-12 h-10 rounded border"
                      style={{ backgroundColor: newAccount.color }}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveAccount} className="w-full">
                  Criar Conta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => {
          const Icon = getAccountIcon(account.type);
          return (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: account.color + "20" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: account.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{account.name}</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">
                        {getAccountTypeLabel(account.type)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  R$ {account.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Saldo disponível</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
