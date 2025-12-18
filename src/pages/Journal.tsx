import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, BookOpen, TrendingUp, TrendingDown, Target, Calendar, Clock, Trash2, Edit2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";

interface JournalTrade {
  id: string;
  user_id: string;
  asset: string;
  trade_date: string;
  entry_time: string | null;
  exit_time: string | null;
  market: string;
  side: string;
  status: string;
  entry_price: number | null;
  stop_loss: number | null;
  target: number | null;
  contracts: number | null;
  result_value: number | null;
  result_r: number | null;
  followed_plan: boolean | null;
  emotion_before: string | null;
  emotion_after: string | null;
  notes: string | null;
  timeframe: string | null;
  strategy_id: string | null;
}

const emotions = [
  "Confiante",
  "Ansioso", 
  "Calmo",
  "Frustrado",
  "Focado",
  "Impaciente",
  "Neutro",
  "Eufórico"
];

const timeframes = ["1min", "5min", "15min", "30min", "1h", "4h", "Diário", "Semanal"];
const markets = ["Day Trade", "Swing Trade", "Position"];
const sides = ["Compra", "Venda"];
const statuses = ["Gain", "Loss", "Zero", "Em aberto"];

export default function Journal() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<JournalTrade | null>(null);
  
  const [formData, setFormData] = useState({
    asset: "",
    trade_date: format(new Date(), "yyyy-MM-dd"),
    entry_time: "",
    exit_time: "",
    market: "Day Trade",
    side: "Compra",
    status: "Em aberto",
    entry_price: "",
    stop_loss: "",
    target: "",
    contracts: "",
    result_value: "",
    result_r: "",
    followed_plan: true,
    emotion_before: "",
    emotion_after: "",
    notes: "",
    timeframe: ""
  });

  const { data: trades, isLoading } = useQuery({
    queryKey: ["journal-trades"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("journal_trades")
        .select("*")
        .eq("user_id", user.id)
        .order("trade_date", { ascending: false })
        .order("entry_time", { ascending: false });

      if (error) throw error;
      return data as JournalTrade[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newTrade: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("journal_trades")
        .insert([{
          user_id: user.id,
          asset: newTrade.asset,
          trade_date: newTrade.trade_date,
          entry_time: newTrade.entry_time || null,
          exit_time: newTrade.exit_time || null,
          market: newTrade.market,
          side: newTrade.side,
          status: newTrade.status,
          entry_price: newTrade.entry_price ? parseFloat(newTrade.entry_price) : null,
          stop_loss: newTrade.stop_loss ? parseFloat(newTrade.stop_loss) : null,
          target: newTrade.target ? parseFloat(newTrade.target) : null,
          contracts: newTrade.contracts ? parseFloat(newTrade.contracts) : null,
          result_value: newTrade.result_value ? parseFloat(newTrade.result_value) : null,
          result_r: newTrade.result_r ? parseFloat(newTrade.result_r) : null,
          followed_plan: newTrade.followed_plan,
          emotion_before: newTrade.emotion_before || null,
          emotion_after: newTrade.emotion_after || null,
          notes: newTrade.notes || null,
          timeframe: newTrade.timeframe || null
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-trades"] });
      toast.success("Operação registrada com sucesso!");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error("Erro ao registrar operação");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<JournalTrade> & { id: string }) => {
      const { error } = await supabase
        .from("journal_trades")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-trades"] });
      toast.success("Operação atualizada com sucesso!");
      resetForm();
      setIsDialogOpen(false);
      setEditingTrade(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar operação");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("journal_trades")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal-trades"] });
      toast.success("Operação excluída!");
    },
    onError: () => {
      toast.error("Erro ao excluir operação");
    }
  });

  const resetForm = () => {
    setFormData({
      asset: "",
      trade_date: format(new Date(), "yyyy-MM-dd"),
      entry_time: "",
      exit_time: "",
      market: "Day Trade",
      side: "Compra",
      status: "Em aberto",
      entry_price: "",
      stop_loss: "",
      target: "",
      contracts: "",
      result_value: "",
      result_r: "",
      followed_plan: true,
      emotion_before: "",
      emotion_after: "",
      notes: "",
      timeframe: ""
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingTrade) {
      updateMutation.mutate({ 
        id: editingTrade.id,
        asset: formData.asset,
        trade_date: formData.trade_date,
        entry_time: formData.entry_time || null,
        exit_time: formData.exit_time || null,
        market: formData.market,
        side: formData.side,
        status: formData.status,
        entry_price: formData.entry_price ? parseFloat(formData.entry_price) : null,
        stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
        target: formData.target ? parseFloat(formData.target) : null,
        contracts: formData.contracts ? parseFloat(formData.contracts) : null,
        result_value: formData.result_value ? parseFloat(formData.result_value) : null,
        result_r: formData.result_r ? parseFloat(formData.result_r) : null,
        followed_plan: formData.followed_plan,
        emotion_before: formData.emotion_before || null,
        emotion_after: formData.emotion_after || null,
        notes: formData.notes || null,
        timeframe: formData.timeframe || null
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (trade: JournalTrade) => {
    setEditingTrade(trade);
    setFormData({
      asset: trade.asset,
      trade_date: trade.trade_date,
      entry_time: trade.entry_time || "",
      exit_time: trade.exit_time || "",
      market: trade.market,
      side: trade.side,
      status: trade.status,
      entry_price: trade.entry_price?.toString() || "",
      stop_loss: trade.stop_loss?.toString() || "",
      target: trade.target?.toString() || "",
      contracts: trade.contracts?.toString() || "",
      result_value: trade.result_value?.toString() || "",
      result_r: trade.result_r?.toString() || "",
      followed_plan: trade.followed_plan ?? true,
      emotion_before: trade.emotion_before || "",
      emotion_after: trade.emotion_after || "",
      notes: trade.notes || "",
      timeframe: trade.timeframe || ""
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      "Gain": "bg-success/20 text-success border-success/30",
      "Loss": "bg-destructive/20 text-destructive border-destructive/30",
      "Zero": "bg-muted text-muted-foreground border-muted",
      "Em aberto": "bg-warning/20 text-warning border-warning/30"
    };
    return variants[status] || "bg-muted text-muted-foreground";
  };

  const stats = trades ? {
    total: trades.length,
    gains: trades.filter(t => t.status === "Gain").length,
    losses: trades.filter(t => t.status === "Loss").length,
    totalResult: trades.reduce((sum, t) => sum + (t.result_value || 0), 0)
  } : { total: 0, gains: 0, losses: 0, totalResult: 0 };

  const formatDateBR = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background">
      <Navbar />
      
      {/* Particles effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      <main className="container mx-auto px-4 py-8 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Diário de Trading
              </h1>
              <p className="text-muted-foreground">
                Registre e acompanhe suas operações manuais
              </p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingTrade(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Nova Operação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {editingTrade ? "Editar Operação" : "Registrar Nova Operação"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="asset">Ativo *</Label>
                    <Input
                      id="asset"
                      value={formData.asset}
                      onChange={(e) => setFormData({ ...formData, asset: e.target.value.toUpperCase() })}
                      placeholder="WIN, WDO, PETR4..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trade_date">Data *</Label>
                    <Input
                      id="trade_date"
                      type="date"
                      value={formData.trade_date}
                      onChange={(e) => setFormData({ ...formData, trade_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="market">Mercado</Label>
                    <Select value={formData.market} onValueChange={(v) => setFormData({ ...formData, market: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {markets.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entry_time">Hora Entrada</Label>
                    <Input
                      id="entry_time"
                      type="time"
                      value={formData.entry_time}
                      onChange={(e) => setFormData({ ...formData, entry_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exit_time">Hora Saída</Label>
                    <Input
                      id="exit_time"
                      type="time"
                      value={formData.exit_time}
                      onChange={(e) => setFormData({ ...formData, exit_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="side">Lado</Label>
                    <Select value={formData.side} onValueChange={(v) => setFormData({ ...formData, side: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sides.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeframe">Timeframe</Label>
                    <Select value={formData.timeframe} onValueChange={(v) => setFormData({ ...formData, timeframe: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeframes.map(tf => (
                          <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Prices */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entry_price">Preço Entrada</Label>
                    <Input
                      id="entry_price"
                      type="number"
                      step="0.01"
                      value={formData.entry_price}
                      onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="stop_loss">Stop Loss</Label>
                    <Input
                      id="stop_loss"
                      type="number"
                      step="0.01"
                      value={formData.stop_loss}
                      onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target">Alvo</Label>
                    <Input
                      id="target"
                      type="number"
                      step="0.01"
                      value={formData.target}
                      onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contracts">Contratos</Label>
                    <Input
                      id="contracts"
                      type="number"
                      step="1"
                      value={formData.contracts}
                      onChange={(e) => setFormData({ ...formData, contracts: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                </div>

                {/* Results */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="result_value">Resultado (R$)</Label>
                    <Input
                      id="result_value"
                      type="number"
                      step="0.01"
                      value={formData.result_value}
                      onChange={(e) => setFormData({ ...formData, result_value: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="result_r">Resultado (R)</Label>
                    <Input
                      id="result_r"
                      type="number"
                      step="0.01"
                      value={formData.result_r}
                      onChange={(e) => setFormData({ ...formData, result_r: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Emotions */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emotion_before">Emoção Antes</Label>
                    <Select value={formData.emotion_before} onValueChange={(v) => setFormData({ ...formData, emotion_before: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {emotions.map(e => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emotion_after">Emoção Depois</Label>
                    <Select value={formData.emotion_after} onValueChange={(v) => setFormData({ ...formData, emotion_after: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {emotions.map(e => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Plan & Notes */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="followed_plan"
                      checked={formData.followed_plan}
                      onCheckedChange={(checked) => setFormData({ ...formData, followed_plan: checked })}
                    />
                    <Label htmlFor="followed_plan">Seguiu o plano de trading?</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Anote suas observações sobre a operação..."
                      rows={3}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingTrade ? "Salvar Alterações" : "Registrar Operação"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gains</p>
                  <p className="text-2xl font-bold text-success">{stats.gains}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Losses</p>
                  <p className="text-2xl font-bold text-destructive">{stats.losses}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stats.totalResult >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resultado</p>
                  <p className={`text-2xl font-bold ${stats.totalResult >= 0 ? 'text-success' : 'text-destructive'}`}>
                    R$ {stats.totalResult.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trades Table */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Histórico de Operações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : trades && trades.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Mercado</TableHead>
                      <TableHead>Lado</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell className="font-medium">{formatDateBR(trade.trade_date)}</TableCell>
                        <TableCell>{trade.asset}</TableCell>
                        <TableCell>{trade.market}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={trade.side === "Compra" ? "text-success border-success/30" : "text-destructive border-destructive/30"}>
                            {trade.side}
                          </Badge>
                        </TableCell>
                        <TableCell>{trade.entry_time || "-"}</TableCell>
                        <TableCell className={trade.result_value && trade.result_value >= 0 ? "text-success" : "text-destructive"}>
                          {trade.result_value ? `R$ ${trade.result_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(trade.status)}>{trade.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {trade.followed_plan ? (
                            <Badge className="bg-success/20 text-success border-success/30">Sim</Badge>
                          ) : (
                            <Badge className="bg-destructive/20 text-destructive border-destructive/30">Não</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(trade)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Deseja excluir esta operação?")) {
                                  deleteMutation.mutate(trade.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma operação registrada ainda.</p>
                <p className="text-sm">Clique em "Nova Operação" para começar.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
