import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, TrendingUp, AlertTriangle, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BankrollData {
  id?: string;
  initial_capital: number;
  current_capital: number;
  risk_percentage: number;
  max_daily_loss_percentage: number;
}

interface CalculatorResult {
  position_size: number;
  risk_amount: number;
  contracts: number;
}

const BankrollManager = ({ userId }: { userId: string }) => {
  const [bankroll, setBankroll] = useState<BankrollData>({
    initial_capital: 0,
    current_capital: 0,
    risk_percentage: 2.0,
    max_daily_loss_percentage: 5.0,
  });
  const [loading, setLoading] = useState(true);
  const [calculator, setCalculator] = useState({
    stop_loss_points: 0,
    point_value: 0.2,
  });
  const [calculatorResult, setCalculatorResult] = useState<CalculatorResult | null>(null);

  useEffect(() => {
    loadBankroll();
  }, [userId]);

  const loadBankroll = async () => {
    try {
      const { data, error } = await supabase
        .from("bankroll_management")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setBankroll(data);
      }
    } catch (error) {
      console.error("Erro ao carregar gestão de banca:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveBankroll = async () => {
    try {
      if (bankroll.id) {
        const { error } = await supabase
          .from("bankroll_management")
          .update({
            initial_capital: bankroll.initial_capital,
            current_capital: bankroll.current_capital,
            risk_percentage: bankroll.risk_percentage,
            max_daily_loss_percentage: bankroll.max_daily_loss_percentage,
          })
          .eq("id", bankroll.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("bankroll_management")
          .insert({
            user_id: userId,
            ...bankroll,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) setBankroll(data);
      }

      toast.success("Gestão de banca salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar gestão de banca:", error);
      toast.error("Erro ao salvar gestão de banca");
    }
  };

  const calculatePosition = () => {
    const risk_amount = (bankroll.current_capital * bankroll.risk_percentage) / 100;
    const contracts = Math.floor(risk_amount / (calculator.stop_loss_points * calculator.point_value));
    const position_size = contracts * calculator.point_value * calculator.stop_loss_points;

    setCalculatorResult({
      position_size,
      risk_amount,
      contracts,
    });
  };

  const profit_loss = bankroll.current_capital - bankroll.initial_capital;
  const profit_loss_percentage = bankroll.initial_capital > 0 
    ? ((profit_loss / bankroll.initial_capital) * 100).toFixed(2)
    : "0.00";
  const daily_loss_limit = (bankroll.current_capital * bankroll.max_daily_loss_percentage) / 100;

  if (loading) {
    return <Card className="animate-fade-in"><CardContent className="p-6">Carregando...</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {/* Status da Banca */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capital Atual</CardTitle>
            <Wallet className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {bankroll.current_capital.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Inicial: R$ {bankroll.initial_capital.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profit_loss >= 0 ? 'text-success' : 'text-destructive'}`}>
              R$ {profit_loss >= 0 ? '+' : ''}{profit_loss.toFixed(2)}
            </div>
            <Badge variant={profit_loss >= 0 ? "default" : "destructive"} className="mt-1">
              {profit_loss >= 0 ? '+' : ''}{profit_loss_percentage}%
            </Badge>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Limite Perda Diária</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              R$ {daily_loss_limit.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {bankroll.max_daily_loss_percentage}% do capital
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuração da Banca */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Configuração da Banca</CardTitle>
          <CardDescription>Configure seu capital e regras de gestão de risco</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initial_capital">Capital Inicial (R$)</Label>
              <Input
                id="initial_capital"
                type="number"
                step="0.01"
                value={bankroll.initial_capital}
                onChange={(e) => setBankroll({ ...bankroll, initial_capital: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_capital">Capital Atual (R$)</Label>
              <Input
                id="current_capital"
                type="number"
                step="0.01"
                value={bankroll.current_capital}
                onChange={(e) => setBankroll({ ...bankroll, current_capital: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="risk_percentage">Risco por Operação (%)</Label>
              <Input
                id="risk_percentage"
                type="number"
                step="0.1"
                value={bankroll.risk_percentage}
                onChange={(e) => setBankroll({ ...bankroll, risk_percentage: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_daily_loss">Perda Máxima Diária (%)</Label>
              <Input
                id="max_daily_loss"
                type="number"
                step="0.1"
                value={bankroll.max_daily_loss_percentage}
                onChange={(e) => setBankroll({ ...bankroll, max_daily_loss_percentage: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <Button onClick={saveBankroll} className="w-full">Salvar Configuração</Button>
        </CardContent>
      </Card>

      {/* Calculadora de Posição */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Calculadora de Tamanho de Posição
          </CardTitle>
          <CardDescription>Calcule quantos contratos operar baseado no seu stop loss</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stop_loss_points">Stop Loss (pontos)</Label>
              <Input
                id="stop_loss_points"
                type="number"
                step="1"
                value={calculator.stop_loss_points}
                onChange={(e) => setCalculator({ ...calculator, stop_loss_points: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="point_value">Valor do Ponto (R$)</Label>
              <Input
                id="point_value"
                type="number"
                step="0.01"
                value={calculator.point_value}
                onChange={(e) => setCalculator({ ...calculator, point_value: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <Button onClick={calculatePosition} className="w-full">Calcular</Button>

          {calculatorResult && (
            <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Valor em Risco:</span>
                <span className="text-sm font-bold text-destructive">
                  R$ {calculatorResult.risk_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Contratos Recomendados:</span>
                <span className="text-sm font-bold text-primary">
                  {calculatorResult.contracts} contratos
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Tamanho da Posição:</span>
                <span className="text-sm font-bold">
                  R$ {calculatorResult.position_size.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BankrollManager;
