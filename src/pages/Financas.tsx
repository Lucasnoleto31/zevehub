import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Wallet, 
  Calendar, 
  Sun, 
  TrendingUp, 
  Plus, 
  Settings, 
  Lightbulb,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Trash2,
  Edit
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Categoria {
  id: string;
  nome: string;
  tipo: string;
  cor: string;
}

interface Lancamento {
  id: string;
  data: string;
  valor: number;
  categoria_id: string | null;
  descricao: string | null;
  recorrente: boolean;
  categoria?: Categoria;
}

interface Metricas {
  id?: string;
  salario_mensal: number;
  mes_referencia: string | null;
  sobra_calculada: number;
  valor_diario_meta: number;
}

const Financas = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Data states
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [metricas, setMetricas] = useState<Metricas>({
    salario_mensal: 0,
    mes_referencia: null,
    sobra_calculada: 0,
    valor_diario_meta: 0
  });

  // Form states
  const [novoGasto, setNovoGasto] = useState({
    descricao: "",
    valor: "",
    categoria_id: "",
    recorrente: false
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [salarioInput, setSalarioInput] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);

    // Check admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!roleData);
  };

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // Load categorias
      const { data: catData } = await supabase
        .from("categorias_financas")
        .select("*")
        .eq("user_id", userId);
      
      if (catData) setCategorias(catData);

      // Load lancamentos with categoria
      const { data: lancData } = await supabase
        .from("lancamentos_financas")
        .select("*, categoria:categorias_financas(*)")
        .eq("user_id", userId)
        .order("data", { ascending: false });
      
      if (lancData) setLancamentos(lancData as any);

      // Load metricas
      const { data: metData } = await supabase
        .from("usuario_metricas_financas")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (metData) {
        setMetricas(metData);
        setSalarioInput(metData.salario_mensal.toString());
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular métricas
  const today = new Date();
  const mesAtual = format(today, "yyyy-MM");
  
  const lancamentosMes = lancamentos.filter(l => l.data.startsWith(mesAtual));
  const lancamentosHoje = lancamentos.filter(l => l.data === format(today, "yyyy-MM-dd"));
  const despesasRecorrentes = lancamentos.filter(l => l.recorrente);

  const gastoMes = lancamentosMes
    .filter(l => {
      const cat = categorias.find(c => c.id === l.categoria_id);
      return !cat || cat.tipo === "despesa";
    })
    .reduce((acc, l) => acc + Number(l.valor), 0);

  const gastoHoje = lancamentosHoje
    .filter(l => {
      const cat = categorias.find(c => c.id === l.categoria_id);
      return !cat || cat.tipo === "despesa";
    })
    .reduce((acc, l) => acc + Number(l.valor), 0);

  const totalRecorrentes = despesasRecorrentes.reduce((acc, l) => acc + Number(l.valor), 0);
  
  const sobraMensal = metricas.salario_mensal - totalRecorrentes;
  const diasRestantes = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate() + 1;
  const metaDiaria = diasRestantes > 0 ? (sobraMensal - gastoMes) / diasRestantes : 0;
  const saldoHoje = metaDiaria - gastoHoje;

  // Insights
  const categoriaMaisPesada = lancamentosMes.reduce((acc, l) => {
    if (!l.categoria_id) return acc;
    acc[l.categoria_id] = (acc[l.categoria_id] || 0) + Number(l.valor);
    return acc;
  }, {} as Record<string, number>);

  const categoriaTopId = Object.entries(categoriaMaisPesada).sort((a, b) => b[1] - a[1])[0];
  const categoriaTop = categoriaTopId ? categorias.find(c => c.id === categoriaTopId[0]) : null;

  const handleSaveConfig = async () => {
    if (!userId) return;

    const salario = parseFloat(salarioInput) || 0;
    const sobraCalc = salario - totalRecorrentes;
    const diasNoMes = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const valorDiario = sobraCalc / diasNoMes;

    const metricasData = {
      user_id: userId,
      salario_mensal: salario,
      mes_referencia: mesAtual,
      sobra_calculada: sobraCalc,
      valor_diario_meta: valorDiario,
      updated_at: new Date().toISOString()
    };

    if (metricas.id) {
      await supabase
        .from("usuario_metricas_financas")
        .update(metricasData)
        .eq("id", metricas.id);
    } else {
      await supabase
        .from("usuario_metricas_financas")
        .insert(metricasData);
    }

    toast.success("Configurações salvas!");
    setConfigDialogOpen(false);
    loadData();
  };

  const handleAddGasto = async () => {
    if (!userId || !novoGasto.descricao || !novoGasto.valor) {
      toast.error("Preencha todos os campos");
      return;
    }

    await supabase.from("lancamentos_financas").insert({
      user_id: userId,
      descricao: novoGasto.descricao,
      valor: parseFloat(novoGasto.valor),
      categoria_id: novoGasto.categoria_id || null,
      recorrente: novoGasto.recorrente,
      data: format(today, "yyyy-MM-dd")
    });

    toast.success(novoGasto.recorrente ? "Despesa recorrente adicionada!" : "Gasto registrado!");
    setNovoGasto({ descricao: "", valor: "", categoria_id: "", recorrente: false });
    setDialogOpen(false);
    loadData();
  };

  const handleDeleteLancamento = async (id: string) => {
    await supabase.from("lancamentos_financas").delete().eq("id", id);
    toast.success("Lançamento removido!");
    loadData();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const needsSetup = metricas.salario_mensal === 0;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 dark:from-background dark:via-accent/10 dark:to-background">
        <AppSidebar isAdmin={isAdmin} />
        
        <main className="flex-1 overflow-auto">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b bg-white/80 dark:bg-card/80 backdrop-blur-md">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <div className="flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-indigo-600" />
                  <h1 className="text-xl font-bold text-slate-900 dark:text-foreground">SmartBudget</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Configurar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Configuração Inicial</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Salário Mensal</Label>
                        <Input
                          type="number"
                          placeholder="Ex.: 3500"
                          value={salarioInput}
                          onChange={(e) => setSalarioInput(e.target.value)}
                        />
                      </div>
                      <div className="p-4 bg-slate-100 dark:bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">Despesas Recorrentes</h4>
                        {despesasRecorrentes.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Nenhuma despesa recorrente</p>
                        ) : (
                          <div className="space-y-2">
                            {despesasRecorrentes.map(d => (
                              <div key={d.id} className="flex justify-between items-center text-sm">
                                <span>{d.descricao}</span>
                                <span className="font-medium">{formatCurrency(Number(d.valor))}</span>
                              </div>
                            ))}
                            <div className="pt-2 border-t flex justify-between font-medium">
                              <span>Total</span>
                              <span>{formatCurrency(totalRecorrentes)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <Button onClick={handleSaveConfig} className="w-full bg-indigo-600 hover:bg-indigo-700">
                        Salvar Configurações
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </header>

          <div className="p-4 md:p-6 space-y-6">
            {/* Setup Alert */}
            {needsSetup && (
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Lightbulb className="h-6 w-6 text-amber-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-amber-800 dark:text-amber-200">Configure seu orçamento</h3>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Para começar, informe seu salário mensal e suas despesas recorrentes.
                      </p>
                      <Button 
                        onClick={() => setConfigDialogOpen(true)} 
                        className="mt-3 bg-amber-600 hover:bg-amber-700"
                        size="sm"
                      >
                        Configurar Agora
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
                <TabsTrigger value="dashboard">Resumo</TabsTrigger>
                <TabsTrigger value="diario">Controle Diário</TabsTrigger>
                <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
              </TabsList>

              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="space-y-6">
                {/* Hero Card */}
                <Card className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-0">
                  <CardContent className="pt-6">
                    <p className="text-indigo-100 text-sm">Saldo Mensal Disponível</p>
                    <p className="text-4xl font-bold mt-1">{formatCurrency(sobraMensal - gastoMes)}</p>
                    <p className="text-indigo-200 text-sm mt-2">Quanto resta do seu orçamento</p>
                  </CardContent>
                </Card>

                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950">
                          <Calendar className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Meta Diária</p>
                          <p className="text-xl font-bold">{formatCurrency(metaDiaria > 0 ? metaDiaria : 0)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
                          <Sun className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Gasto Hoje</p>
                          <p className="text-xl font-bold">{formatCurrency(gastoHoje)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950">
                          <TrendingUp className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Gasto no Mês</p>
                          <p className="text-xl font-bold">{formatCurrency(gastoMes)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {metaDiaria > 0 && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-muted">
                        <p className="text-sm">
                          📊 Se o gasto médio diário continuar neste ritmo, você vai terminar o mês com{" "}
                          <span className="font-semibold">{formatCurrency(sobraMensal - (gastoMes / today.getDate()) * diasRestantes)}</span>
                        </p>
                      </div>
                    )}
                    {categoriaTop && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-muted">
                        <p className="text-sm">
                          💰 Sua maior categoria no mês é{" "}
                          <Badge style={{ backgroundColor: categoriaTop.cor }}>{categoriaTop.nome}</Badge>{" "}
                          com <span className="font-semibold">{formatCurrency(categoriaTopId[1])}</span>
                        </p>
                      </div>
                    )}
                    {gastoHoje > metaDiaria && metaDiaria > 0 && (
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
                        <p className="text-sm text-red-700 dark:text-red-300">
                          ⚠️ Você ultrapassou sua meta diária em{" "}
                          <span className="font-semibold">{formatCurrency(gastoHoje - metaDiaria)}</span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Add Expense Button */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-lg">
                      <Plus className="h-5 w-5 mr-2" />
                      Registrar Gasto
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Lançamento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Input
                          placeholder="Ex.: Almoço"
                          value={novoGasto.descricao}
                          onChange={(e) => setNovoGasto(prev => ({ ...prev, descricao: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor</Label>
                        <Input
                          type="number"
                          placeholder="0,00"
                          value={novoGasto.valor}
                          onChange={(e) => setNovoGasto(prev => ({ ...prev, valor: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select
                          value={novoGasto.categoria_id}
                          onValueChange={(value) => setNovoGasto(prev => ({ ...prev, categoria_id: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {categorias.filter(c => c.tipo === "despesa").map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.cor }} />
                                  {cat.nome}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Despesa Recorrente</Label>
                        <Switch
                          checked={novoGasto.recorrente}
                          onCheckedChange={(checked) => setNovoGasto(prev => ({ ...prev, recorrente: checked }))}
                        />
                      </div>
                      <Button onClick={handleAddGasto} className="w-full bg-indigo-600 hover:bg-indigo-700">
                        Salvar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              {/* Daily Control Tab */}
              <TabsContent value="diario" className="space-y-6">
                <Card className={`border-2 ${saldoHoje >= 0 ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20' : 'border-red-200 bg-red-50 dark:bg-red-950/20'}`}>
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm text-muted-foreground">Saldo de Hoje</p>
                    <p className={`text-4xl font-bold mt-1 ${saldoHoje >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(saldoHoje)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Meta: {formatCurrency(metaDiaria > 0 ? metaDiaria : 0)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Gastos de Hoje</CardTitle>
                    <CardDescription>{format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {lancamentosHoje.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Nenhum gasto registrado hoje</p>
                    ) : (
                      <div className="space-y-3">
                        {lancamentosHoje.map(l => (
                          <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-muted">
                            <div className="flex items-center gap-3">
                              {l.categoria && (
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.categoria.cor }} />
                              )}
                              <div>
                                <p className="font-medium">{l.descricao}</p>
                                <p className="text-xs text-muted-foreground">{l.categoria?.nome || "Sem categoria"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-red-600">-{formatCurrency(Number(l.valor))}</span>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteLancamento(l.id)}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button onClick={() => setDialogOpen(true)} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Gasto
                </Button>
              </TabsContent>

              {/* Transactions Tab */}
              <TabsContent value="lancamentos" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Todos os Lançamentos</CardTitle>
                    <CardDescription>Histórico completo de gastos e receitas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {lancamentos.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Nenhum lançamento encontrado</p>
                    ) : (
                      <div className="space-y-3">
                        {lancamentos.map(l => {
                          const isReceita = l.categoria?.tipo === "receita";
                          return (
                            <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-muted transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${isReceita ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-red-100 dark:bg-red-950'}`}>
                                  {isReceita ? (
                                    <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                                  ) : (
                                    <ArrowDownCircle className="h-4 w-4 text-red-600" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{l.descricao}</p>
                                    {l.recorrente && (
                                      <Badge variant="outline" className="text-xs">Recorrente</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{format(new Date(l.data + "T12:00:00"), "dd/MM/yyyy")}</span>
                                    {l.categoria && (
                                      <>
                                        <span>•</span>
                                        <span style={{ color: l.categoria.cor }}>{l.categoria.nome}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`font-semibold ${isReceita ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {isReceita ? '+' : '-'}{formatCurrency(Number(l.valor))}
                                </span>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteLancamento(l.id)}>
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Financas;