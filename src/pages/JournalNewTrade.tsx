import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Strategy {
  id: string;
  name: string;
}

export default function JournalNewTrade() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    asset: "",
    market: "Day Trade",
    trade_date: new Date().toISOString().split('T')[0],
    entry_time: "",
    exit_time: "",
    side: "Compra",
    strategy_id: "",
    timeframe: "",
    entry_price: "",
    stop_loss: "",
    target: "",
    risk_value: "",
    contracts: "",
    result_value: "",
    result_r: "",
    status: "Zero",
    emotion_before: "",
    emotion_after: "",
    followed_plan: true,
    notes: ""
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUserId(user.id);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    setIsAdmin(roles?.some(r => r.role === "admin") || false);
    await loadStrategies(user.id);
  };

  const loadStrategies = async (uid: string) => {
    const { data } = await supabase
      .from("strategies")
      .select("id, name")
      .eq("user_id", uid)
      .eq("is_active", true);
    
    if (data) setStrategies(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!formData.asset) {
      toast.error("Preencha o ativo");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("journal_trades")
        .insert({
          user_id: userId,
          asset: formData.asset,
          market: formData.market,
          trade_date: formData.trade_date,
          entry_time: formData.entry_time || null,
          exit_time: formData.exit_time || null,
          side: formData.side,
          strategy_id: formData.strategy_id || null,
          timeframe: formData.timeframe || null,
          entry_price: formData.entry_price ? parseFloat(formData.entry_price) : null,
          stop_loss: formData.stop_loss ? parseFloat(formData.stop_loss) : null,
          target: formData.target ? parseFloat(formData.target) : null,
          risk_value: formData.risk_value ? parseFloat(formData.risk_value) : null,
          contracts: formData.contracts ? parseFloat(formData.contracts) : null,
          result_value: formData.result_value ? parseFloat(formData.result_value) : null,
          result_r: formData.result_r ? parseFloat(formData.result_r) : null,
          status: formData.status,
          emotion_before: formData.emotion_before || null,
          emotion_after: formData.emotion_after || null,
          followed_plan: formData.followed_plan,
          notes: formData.notes || null
        });

      if (error) throw error;

      toast.success("Operação registrada com sucesso!");
      navigate("/journal");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar operação");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-accent/5 to-background">
        <AppSidebar isAdmin={isAdmin} />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header */}
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4"
              >
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate("/journal")}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Nova Operação</h1>
                    <p className="text-muted-foreground text-sm">
                      Registre sua operação no diário
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                  <CardHeader>
                    <CardTitle>Detalhes da Operação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Basic Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="asset">Ativo *</Label>
                          <Input
                            id="asset"
                            value={formData.asset}
                            onChange={(e) => handleChange("asset", e.target.value)}
                            placeholder="WIN, WDO, PETR4..."
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="market">Mercado</Label>
                          <Select value={formData.market} onValueChange={(v) => handleChange("market", v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Day Trade">Day Trade</SelectItem>
                              <SelectItem value="Swing Trade">Swing Trade</SelectItem>
                              <SelectItem value="Position">Position</SelectItem>
                              <SelectItem value="Cripto">Cripto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="trade_date">Data</Label>
                          <Input
                            id="trade_date"
                            type="date"
                            value={formData.trade_date}
                            onChange={(e) => handleChange("trade_date", e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Time and Direction */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="entry_time">Horário de Entrada</Label>
                          <Input
                            id="entry_time"
                            type="time"
                            value={formData.entry_time}
                            onChange={(e) => handleChange("entry_time", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="exit_time">Horário de Saída</Label>
                          <Input
                            id="exit_time"
                            type="time"
                            value={formData.exit_time}
                            onChange={(e) => handleChange("exit_time", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="side">Compra/Venda</Label>
                          <Select value={formData.side} onValueChange={(v) => handleChange("side", v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Compra">Compra</SelectItem>
                              <SelectItem value="Venda">Venda</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="timeframe">Timeframe</Label>
                          <Input
                            id="timeframe"
                            value={formData.timeframe}
                            onChange={(e) => handleChange("timeframe", e.target.value)}
                            placeholder="5min, 15min, 1h..."
                          />
                        </div>
                      </div>

                      {/* Strategy */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="strategy">Estratégia</Label>
                          <Select value={formData.strategy_id} onValueChange={(v) => handleChange("strategy_id", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma estratégia" />
                            </SelectTrigger>
                            <SelectContent>
                              {strategies.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Gain">Gain</SelectItem>
                              <SelectItem value="Loss">Loss</SelectItem>
                              <SelectItem value="Zero">Zero</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Prices */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="entry_price">Preço de Entrada</Label>
                          <Input
                            id="entry_price"
                            type="number"
                            step="0.01"
                            value={formData.entry_price}
                            onChange={(e) => handleChange("entry_price", e.target.value)}
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
                            onChange={(e) => handleChange("stop_loss", e.target.value)}
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
                            onChange={(e) => handleChange("target", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Risk and Result */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="risk_value">Risco (R$)</Label>
                          <Input
                            id="risk_value"
                            type="number"
                            step="0.01"
                            value={formData.risk_value}
                            onChange={(e) => handleChange("risk_value", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contracts">Contratos/Lotes</Label>
                          <Input
                            id="contracts"
                            type="number"
                            step="1"
                            value={formData.contracts}
                            onChange={(e) => handleChange("contracts", e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="result_value">Resultado (R$)</Label>
                          <Input
                            id="result_value"
                            type="number"
                            step="0.01"
                            value={formData.result_value}
                            onChange={(e) => handleChange("result_value", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="result_r">Resultado em R</Label>
                          <Input
                            id="result_r"
                            type="number"
                            step="0.01"
                            value={formData.result_r}
                            onChange={(e) => handleChange("result_r", e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Emotions */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="emotion_before">Emoção Antes</Label>
                          <Select value={formData.emotion_before} onValueChange={(v) => handleChange("emotion_before", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Calmo">Calmo</SelectItem>
                              <SelectItem value="Ansioso">Ansioso</SelectItem>
                              <SelectItem value="Confiante">Confiante</SelectItem>
                              <SelectItem value="Com Medo">Com Medo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="emotion_after">Emoção Após</Label>
                          <Select value={formData.emotion_after} onValueChange={(v) => handleChange("emotion_after", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Satisfeito">Satisfeito</SelectItem>
                              <SelectItem value="Frustrado">Frustrado</SelectItem>
                              <SelectItem value="Neutro">Neutro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Seguiu o Plano?</Label>
                          <div className="flex items-center gap-3 pt-2">
                            <Switch
                              checked={formData.followed_plan}
                              onCheckedChange={(v) => handleChange("followed_plan", v)}
                            />
                            <span className="text-sm text-muted-foreground">
                              {formData.followed_plan ? "Sim" : "Não"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => handleChange("notes", e.target.value)}
                          placeholder="Anote detalhes importantes sobre a operação..."
                          rows={4}
                        />
                      </div>

                      {/* Submit */}
                      <div className="flex justify-end gap-4">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => navigate("/journal")}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          type="submit"
                          disabled={loading}
                          className="gap-2 bg-gradient-to-r from-primary to-primary/80"
                        >
                          <Save className="w-4 h-4" />
                          {loading ? "Salvando..." : "Salvar Operação"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
