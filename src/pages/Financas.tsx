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
import { Progress } from "@/components/ui/progress";
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
  Edit,
  PieChart,
  Target,
  TrendingDown
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface Categoria {
  id: string;
  nome: string;
  tipo: string;
  cor: string;
  percentual_meta?: number;
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
    recorrente: false,
    data: format(new Date(), "yyyy-MM-dd")
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [salarioInput, setSalarioInput] = useState("");

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(null);

  // Filter states
  const [filtroCategoria, setFiltroCategoria] = useState<string>("all");
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>("");
  const [filtroDataFim, setFiltroDataFim] = useState<string>("");

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

    const valorGasto = parseFloat(novoGasto.valor);

    await supabase.from("lancamentos_financas").insert({
      user_id: userId,
      descricao: novoGasto.descricao,
      valor: valorGasto,
      categoria_id: novoGasto.categoria_id || null,
      recorrente: novoGasto.recorrente,
      data: novoGasto.data
    });

    // Check if daily budget exceeded
    const novoGastoHoje = gastoHoje + valorGasto;
    if (metaDiaria > 0 && novoGastoHoje > metaDiaria) {
      toast.warning("⚠️ Você ultrapassou o limite diário de gastos!", {
        description: `Gasto hoje: ${formatCurrency(novoGastoHoje)} / Meta: ${formatCurrency(metaDiaria)}`,
        duration: 5000
      });
    } else {
      toast.success(novoGasto.recorrente ? "Despesa recorrente adicionada!" : "Gasto registrado!");
    }

    // Check category budget exceeded
    if (novoGasto.categoria_id) {
      const categoria = categorias.find(c => c.id === novoGasto.categoria_id);
      if (categoria && categoria.percentual_meta && categoria.percentual_meta > 0) {
        const gastoCategoria = lancamentosMes
          .filter(l => l.categoria_id === categoria.id)
          .reduce((acc, l) => acc + Number(l.valor), 0) + valorGasto;
        const metaCategoria = sobraMensal * categoria.percentual_meta / 100;
        
        if (gastoCategoria > metaCategoria) {
          toast.error(`🚨 Orçamento de "${categoria.nome}" ultrapassado!`, {
            description: `Gasto: ${formatCurrency(gastoCategoria)} / Meta: ${formatCurrency(metaCategoria)}`,
            duration: 6000
          });
        } else if (gastoCategoria >= metaCategoria * 0.8) {
          toast.warning(`⚠️ "${categoria.nome}" está em 80% do orçamento!`, {
            description: `Gasto: ${formatCurrency(gastoCategoria)} / Meta: ${formatCurrency(metaCategoria)}`,
            duration: 5000
          });
        }
      }
    }

    setNovoGasto({ descricao: "", valor: "", categoria_id: "", recorrente: false, data: format(new Date(), "yyyy-MM-dd") });
    setDialogOpen(false);
    loadData();
  };

  const handleEditLancamento = (lancamento: Lancamento) => {
    setEditingLancamento(lancamento);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingLancamento) return;

    await supabase
      .from("lancamentos_financas")
      .update({
        descricao: editingLancamento.descricao,
        valor: editingLancamento.valor,
        categoria_id: editingLancamento.categoria_id || null,
        recorrente: editingLancamento.recorrente,
        data: editingLancamento.data
      })
      .eq("id", editingLancamento.id);

    toast.success("Lançamento atualizado!");
    setEditDialogOpen(false);
    setEditingLancamento(null);
    loadData();
  };

  const handleDeleteLancamento = async (id: string) => {
    await supabase.from("lancamentos_financas").delete().eq("id", id);
    toast.success("Lançamento removido!");
    loadData();
  };

  // Filtered lancamentos
  const lancamentosFiltrados = lancamentos.filter(l => {
    if (filtroCategoria && filtroCategoria !== "all" && l.categoria_id !== filtroCategoria) return false;
    if (filtroDataInicio && l.data < filtroDataInicio) return false;
    if (filtroDataFim && l.data > filtroDataFim) return false;
    return true;
  });

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
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
                <TabsTrigger value="dashboard">Resumo</TabsTrigger>
                <TabsTrigger value="diario">Controle Diário</TabsTrigger>
                <TabsTrigger value="categorias">Categorias</TabsTrigger>
                <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
              </TabsList>

              {/* Dashboard Tab */}
              <TabsContent value="dashboard" className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white border-0">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-indigo-200" />
                        <p className="text-indigo-100 text-sm">Salário Mensal</p>
                      </div>
                      <p className="text-3xl font-bold">{formatCurrency(metricas.salario_mensal)}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white border-0">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-emerald-200" />
                        <p className="text-emerald-100 text-sm">Sobra do Mês</p>
                      </div>
                      <p className="text-3xl font-bold">{formatCurrency(sobraMensal - gastoMes)}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-cyan-600 to-blue-600 text-white border-0">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-5 w-5 text-cyan-200" />
                        <p className="text-cyan-100 text-sm">Meta Diária</p>
                      </div>
                      <p className="text-3xl font-bold">{formatCurrency(metaDiaria > 0 ? metaDiaria : 0)}</p>
                      <p className="text-cyan-200 text-xs mt-1">{diasRestantes} dias restantes</p>
                    </CardContent>
                  </Card>

                  <Card className={`border-0 ${saldoHoje >= 0 ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-red-500 to-rose-600'} text-white`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Sun className="h-5 w-5 text-white/80" />
                        <p className="text-white/80 text-sm">Disponível Hoje</p>
                      </div>
                      <p className="text-3xl font-bold">{formatCurrency(saldoHoje)}</p>
                      <p className="text-white/70 text-xs mt-1">Gasto hoje: {formatCurrency(gastoHoje)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Pie Chart Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-indigo-600" />
                      Distribuição de Gastos (Mês Atual)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const gastosPorCategoria = lancamentosMes
                        .filter(l => {
                          const cat = categorias.find(c => c.id === l.categoria_id);
                          return cat && cat.tipo === "despesa";
                        })
                        .reduce((acc, l) => {
                          const cat = categorias.find(c => c.id === l.categoria_id);
                          if (cat) {
                            acc[cat.id] = {
                              nome: cat.nome,
                              cor: cat.cor,
                              valor: (acc[cat.id]?.valor || 0) + Number(l.valor)
                            };
                          }
                          return acc;
                        }, {} as Record<string, { nome: string; cor: string; valor: number }>);

                      const chartData = Object.entries(gastosPorCategoria).map(([id, data]) => ({
                        name: data.nome,
                        value: data.valor,
                        color: data.cor
                      }));

                      if (chartData.length === 0) {
                        return (
                          <div className="text-center py-12 text-muted-foreground">
                            <PieChart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>Nenhum gasto registrado este mês.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPie>
                              <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              >
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--card))', 
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }}
                              />
                              <Legend />
                            </RechartsPie>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Smart Indicators */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      Indicadores Inteligentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Categoria com maior gasto */}
                    {categoriaTop && (
                      <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900">
                        <div className="flex items-center gap-3">
                          <TrendingUp className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="text-sm text-muted-foreground">Categoria com maior gasto</p>
                            <p className="font-semibold flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: categoriaTop.cor }} />
                              {categoriaTop.nome}
                            </p>
                          </div>
                        </div>
                        <span className="text-xl font-bold text-red-600">{formatCurrency(categoriaTopId[1])}</span>
                      </div>
                    )}

                    {/* Categoria com menor gasto */}
                    {(() => {
                      const categoriaMinId = Object.entries(categoriaMaisPesada).sort((a, b) => a[1] - b[1])[0];
                      const categoriaMin = categoriaMinId ? categorias.find(c => c.id === categoriaMinId[0]) : null;
                      
                      if (categoriaMin && categoriaMinId) {
                        return (
                          <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900">
                            <div className="flex items-center gap-3">
                              <TrendingDown className="h-5 w-5 text-emerald-600" />
                              <div>
                                <p className="text-sm text-muted-foreground">Categoria com menor gasto</p>
                                <p className="font-semibold flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: categoriaMin.cor }} />
                                  {categoriaMin.nome}
                                </p>
                              </div>
                            </div>
                            <span className="text-xl font-bold text-emerald-600">{formatCurrency(categoriaMinId[1])}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Saldo Diário Recomendado */}
                    <div className="flex items-center justify-between p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900">
                      <div className="flex items-center gap-3">
                        <Target className="h-5 w-5 text-indigo-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Saldo Diário Recomendado</p>
                          <p className="text-xs text-muted-foreground">{diasRestantes} dias restantes no mês</p>
                        </div>
                      </div>
                      <span className="text-xl font-bold text-indigo-600">
                        {formatCurrency(diasRestantes > 0 ? (sobraMensal - gastoMes) / diasRestantes : 0)}
                      </span>
                    </div>
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

              {/* Categories Tab with Percentage Control */}
              <TabsContent value="categorias" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-indigo-600" />
                      Controle de Percentuais
                    </CardTitle>
                    <CardDescription>Defina o percentual máximo do orçamento para cada categoria</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const totalPercentual = categorias
                        .filter(c => c.tipo === "despesa")
                        .reduce((acc, c) => acc + (c.percentual_meta || 0), 0);

                      return (
                        <>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-muted">
                            <span className="font-medium">Total Alocado</span>
                            <span className={`font-bold ${totalPercentual > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {totalPercentual.toFixed(0)}%
                            </span>
                          </div>
                          {totalPercentual > 100 && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                              <p className="text-sm text-red-700 dark:text-red-300">
                                ⚠️ A soma dos percentuais ultrapassa 100%. Ajuste as categorias.
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {categorias.filter(c => c.tipo === "despesa").map(cat => {
                      const gastoCategoria = lancamentosMes
                        .filter(l => l.categoria_id === cat.id)
                        .reduce((acc, l) => acc + Number(l.valor), 0);
                      const metaValor = sobraMensal * (cat.percentual_meta || 0) / 100;
                      const percentualUsado = metaValor > 0 ? (gastoCategoria / metaValor) * 100 : 0;

                      return (
                        <div key={cat.id} className="p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.cor }} />
                              <span className="font-medium">{cat.nome}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                className="w-20 text-right"
                                value={cat.percentual_meta || 0}
                                onChange={async (e) => {
                                  const newValue = parseFloat(e.target.value) || 0;
                                  await supabase
                                    .from("categorias_financas")
                                    .update({ percentual_meta: newValue })
                                    .eq("id", cat.id);
                                  loadData();
                                }}
                              />
                              <span className="text-sm text-muted-foreground">%</span>
                            </div>
                          </div>
                          {cat.percentual_meta && cat.percentual_meta > 0 && (
                            <>
                              <Progress 
                                value={Math.min(percentualUsado, 100)} 
                                className={`h-2 ${percentualUsado > 100 ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`}
                              />
                              <div className="flex justify-between mt-2 text-sm">
                                <span className="text-muted-foreground">
                                  Gasto: {formatCurrency(gastoCategoria)}
                                </span>
                                <span className="text-muted-foreground">
                                  Meta: {formatCurrency(metaValor)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
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
                {/* Add New Transaction */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-indigo-600" />
                      Adicionar Lançamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                      <div className="space-y-2">
                        <Label>Data</Label>
                        <Input
                          type="date"
                          value={novoGasto.data}
                          onChange={(e) => setNovoGasto(prev => ({ ...prev, data: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor (R$)</Label>
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
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border z-50">
                            {categorias.map(cat => (
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
                      <div className="space-y-2 lg:col-span-2">
                        <Label>Descrição</Label>
                        <Input
                          placeholder="Ex.: Almoço"
                          value={novoGasto.descricao}
                          onChange={(e) => setNovoGasto(prev => ({ ...prev, descricao: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={novoGasto.recorrente}
                            onCheckedChange={(checked) => setNovoGasto(prev => ({ ...prev, recorrente: checked }))}
                          />
                          <Label className="text-sm">Recorrente</Label>
                        </div>
                      </div>
                    </div>
                    <Button onClick={handleAddGasto} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Salvar Lançamento
                    </Button>
                  </CardContent>
                </Card>

                {/* Filters */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Filtrar Lançamentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Categoria</Label>
                        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border z-50">
                            <SelectItem value="all">Todas as categorias</SelectItem>
                            {categorias.map(cat => (
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
                      <div className="space-y-2">
                        <Label>Data Inicial</Label>
                        <Input
                          type="date"
                          value={filtroDataInicio}
                          onChange={(e) => setFiltroDataInicio(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data Final</Label>
                        <Input
                          type="date"
                          value={filtroDataFim}
                          onChange={(e) => setFiltroDataFim(e.target.value)}
                        />
                      </div>
                    </div>
                    {(filtroCategoria !== "all" || filtroDataInicio || filtroDataFim) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          setFiltroCategoria("all");
                          setFiltroDataInicio("");
                          setFiltroDataFim("");
                        }}
                      >
                        Limpar Filtros
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Transactions List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Lista de Lançamentos</CardTitle>
                    <CardDescription>
                      {lancamentosFiltrados.length} lançamento(s) encontrado(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {lancamentosFiltrados.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Nenhum lançamento encontrado</p>
                    ) : (
                      <div className="space-y-3">
                        {lancamentosFiltrados.map(l => {
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
                                    <p className="font-medium">{l.descricao || "Sem descrição"}</p>
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
                                <Button variant="ghost" size="icon" onClick={() => handleEditLancamento(l)}>
                                  <Edit className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteLancamento(l.id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
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

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Lançamento</DialogTitle>
            </DialogHeader>
            {editingLancamento && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={editingLancamento.data}
                    onChange={(e) => setEditingLancamento(prev => prev ? { ...prev, data: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Descrição"
                    value={editingLancamento.descricao || ""}
                    onChange={(e) => setEditingLancamento(prev => prev ? { ...prev, descricao: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    value={editingLancamento.valor}
                    onChange={(e) => setEditingLancamento(prev => prev ? { ...prev, valor: parseFloat(e.target.value) || 0 } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={editingLancamento.categoria_id || "none"}
                    onValueChange={(value) => setEditingLancamento(prev => prev ? { ...prev, categoria_id: value === "none" ? null : value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border z-50">
                      <SelectItem value="none">Sem categoria</SelectItem>
                      {categorias.map(cat => (
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
                    checked={editingLancamento.recorrente}
                    onCheckedChange={(checked) => setEditingLancamento(prev => prev ? { ...prev, recorrente: checked } : null)}
                  />
                </div>
                <Button onClick={handleSaveEdit} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  Salvar Alterações
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
};

export default Financas;