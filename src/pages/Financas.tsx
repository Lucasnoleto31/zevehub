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
  TrendingDown,
  BarChart3,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  PieChart as RechartsPie, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar
} from "recharts";

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

// Budget model options
const BUDGET_MODELS = [
  { id: "50/30/20", label: "50/30/20", description: "50% Necessidades, 30% Desejos, 20% Poupança" },
  { id: "60/20/20", label: "60/20/20", description: "60% Necessidades, 20% Desejos, 20% Poupança" },
  { id: "70/20/10", label: "70/20/10", description: "70% Necessidades, 20% Desejos, 10% Poupança" },
  { id: "personalizado", label: "Personalizado", description: "Defina seus próprios percentuais" },
];

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

  // Category management states
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"despesa" | "receita">("despesa");
  const [newCategoryColor, setNewCategoryColor] = useState("#4F46E5");
  const [newCategoryPercentual, setNewCategoryPercentual] = useState("");
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [budgetModel, setBudgetModel] = useState("personalizado");

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

  // Calculate total percentual for validation
  const calcularTotalPercentual = (excludeCategoryId?: string) => {
    return categorias
      .filter(c => c.tipo === "despesa" && c.id !== excludeCategoryId)
      .reduce((acc, c) => acc + (c.percentual_meta || 0), 0);
  };

  // Category management functions
  const handleAddCategory = async () => {
    if (!userId || !newCategoryName.trim()) {
      toast.error("Preencha o nome da categoria");
      return;
    }

    const novoPercentual = parseFloat(newCategoryPercentual) || 0;
    
    // Validate percentage total only for expense categories
    if (newCategoryType === "despesa" && novoPercentual > 0) {
      const totalAtual = calcularTotalPercentual();
      if (totalAtual + novoPercentual > 100) {
        toast.error(`A soma dos percentuais das categorias ultrapassaria 100%. Disponível: ${(100 - totalAtual).toFixed(1)}%`);
        return;
      }
    }

    await supabase.from("categorias_financas").insert({
      user_id: userId,
      nome: newCategoryName.trim(),
      tipo: newCategoryType,
      cor: newCategoryColor,
      percentual_meta: novoPercentual
    });

    toast.success("Categoria criada!");
    setNewCategoryName("");
    setNewCategoryType("despesa");
    setNewCategoryColor("#4F46E5");
    setNewCategoryPercentual("");
    setCategoryDialogOpen(false);
    loadData();
  };

  const handleEditCategory = async () => {
    if (!editingCategory) return;

    const novoPercentual = editingCategory.percentual_meta || 0;
    
    // Validate percentage total only for expense categories
    if (editingCategory.tipo === "despesa" && novoPercentual > 0) {
      const totalAtual = calcularTotalPercentual(editingCategory.id);
      if (totalAtual + novoPercentual > 100) {
        toast.error(`A soma dos percentuais das categorias ultrapassaria 100%. Disponível: ${(100 - totalAtual).toFixed(1)}%`);
        return;
      }
    }

    await supabase
      .from("categorias_financas")
      .update({
        nome: editingCategory.nome,
        tipo: editingCategory.tipo,
        cor: editingCategory.cor,
        percentual_meta: novoPercentual
      })
      .eq("id", editingCategory.id);

    toast.success("Categoria atualizada!");
    setEditingCategory(null);
    loadData();
  };

  const handleDeleteCategory = async (id: string) => {
    // Check if category has lancamentos
    const hasLancamentos = lancamentos.some(l => l.categoria_id === id);
    if (hasLancamentos) {
      toast.error("Remova os lançamentos desta categoria primeiro");
      return;
    }

    await supabase.from("categorias_financas").delete().eq("id", id);
    toast.success("Categoria removida!");
    loadData();
  };

  // Reports data
  const getMonthlyData = () => {
    const last6Months: { month: string; gastos: number; sobra: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(today, i);
      const monthKey = format(date, "yyyy-MM");
      const monthLabel = format(date, "MMM/yy", { locale: ptBR });
      
      const gastosMes = lancamentos
        .filter(l => l.data.startsWith(monthKey))
        .filter(l => {
          const cat = categorias.find(c => c.id === l.categoria_id);
          return !cat || cat.tipo === "despesa";
        })
        .reduce((acc, l) => acc + Number(l.valor), 0);
      
      const sobraMes = metricas.salario_mensal - gastosMes;
      
      last6Months.push({
        month: monthLabel,
        gastos: gastosMes,
        sobra: Math.max(sobraMes, 0)
      });
    }
    
    return last6Months;
  };

  // Smart alerts check
  const checkSmartAlerts = () => {
    const alerts: { type: "warning" | "danger" | "success"; message: string }[] = [];
    
    // Alert 70% monthly budget
    const percentualGasto = metricas.salario_mensal > 0 
      ? (gastoMes / metricas.salario_mensal) * 100 
      : 0;
    
    if (percentualGasto >= 70 && percentualGasto < 100) {
      alerts.push({
        type: "warning",
        message: `Você já gastou ${percentualGasto.toFixed(0)}% do orçamento mensal`
      });
    } else if (percentualGasto >= 100) {
      alerts.push({
        type: "danger",
        message: `Orçamento mensal ultrapassado! (${percentualGasto.toFixed(0)}%)`
      });
    }
    
    // Risk prediction
    const diasPassados = today.getDate();
    if (diasPassados >= 7 && diasRestantes > 0) {
      const mediaDiaria = gastoMes / diasPassados;
      const projecaoFimMes = mediaDiaria * (diasPassados + diasRestantes);
      
      if (projecaoFimMes > metricas.salario_mensal) {
        alerts.push({
          type: "danger",
          message: "Se continuar assim, você fechará o mês no vermelho"
        });
      }
    }
    
    // Daily average above target
    if (metaDiaria > 0 && gastoMes > 0) {
      const mediaDiaria = gastoMes / today.getDate();
      if (mediaDiaria > metaDiaria * 1.2) {
        alerts.push({
          type: "warning",
          message: `Média diária (${formatCurrency(mediaDiaria)}) acima da meta`
        });
      }
    }
    
    return alerts;
  };

  const smartAlerts = checkSmartAlerts();
  const monthlyData = getMonthlyData();

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
              <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-flex">
                <TabsTrigger value="dashboard">Resumo</TabsTrigger>
                <TabsTrigger value="diario">Diário</TabsTrigger>
                <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
                <TabsTrigger value="categorias">Categorias</TabsTrigger>
                <TabsTrigger value="setup">Setup</TabsTrigger>
                <TabsTrigger value="config">Configurações</TabsTrigger>
                <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
              </TabsList>

              {/* Smart Alerts */}
              {smartAlerts.length > 0 && activeTab === "dashboard" && (
                <div className="mt-4 space-y-2">
                  {smartAlerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        alert.type === "danger"
                          ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                          : alert.type === "warning"
                          ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                          : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                      }`}
                    >
                      <AlertTriangle
                        className={`h-5 w-5 ${
                          alert.type === "danger"
                            ? "text-red-600"
                            : alert.type === "warning"
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      />
                      <p
                        className={`text-sm font-medium ${
                          alert.type === "danger"
                            ? "text-red-700 dark:text-red-300"
                            : alert.type === "warning"
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {alert.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}

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

              {/* Setup Tab */}
              <TabsContent value="setup" className="space-y-6">
                {/* Salary Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-indigo-600" />
                      Configurações Iniciais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Salário Mensal (R$)</Label>
                        <Input
                          type="number"
                          placeholder="Ex.: 3500"
                          value={salarioInput}
                          onChange={(e) => setSalarioInput(e.target.value)}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button onClick={handleSaveConfig} className="bg-indigo-600 hover:bg-indigo-700">
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Salvar Configurações
                        </Button>
                      </div>
                    </div>
                    
                    {/* Recurring expenses summary */}
                    <div className="p-4 bg-slate-100 dark:bg-muted rounded-lg">
                      <h4 className="font-medium mb-3">Despesas Recorrentes</h4>
                      {despesasRecorrentes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma despesa recorrente cadastrada</p>
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
                            <span className="text-indigo-600">{formatCurrency(totalRecorrentes)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Category Management */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-indigo-600" />
                        Gerenciar Categorias
                      </CardTitle>
                      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Categoria
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Nova Categoria</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Nome</Label>
                              <Input
                                placeholder="Ex.: Alimentação"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Tipo</Label>
                              <Select value={newCategoryType} onValueChange={(v) => setNewCategoryType(v as "despesa" | "receita")}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border z-50">
                                  <SelectItem value="despesa">Despesa</SelectItem>
                                  <SelectItem value="receita">Receita</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Cor</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="color"
                                  value={newCategoryColor}
                                  onChange={(e) => setNewCategoryColor(e.target.value)}
                                  className="w-16 h-10 p-1"
                                />
                                <Input
                                  value={newCategoryColor}
                                  onChange={(e) => setNewCategoryColor(e.target.value)}
                                  className="flex-1"
                                />
                              </div>
                            </div>
                            {newCategoryType === "despesa" && (
                              <div className="space-y-2">
                                <Label>Percentual Meta (%)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="Ex.: 15"
                                  value={newCategoryPercentual}
                                  onChange={(e) => setNewCategoryPercentual(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                  Disponível: {(100 - calcularTotalPercentual()).toFixed(1)}%
                                </p>
                              </div>
                            )}
                            <Button onClick={handleAddCategory} className="w-full bg-indigo-600 hover:bg-indigo-700">
                              Criar Categoria
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Total percentual summary */}
                    <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Total de Percentuais Alocados</span>
                        <span className={`text-sm font-bold ${calcularTotalPercentual() > 100 ? 'text-red-600' : 'text-indigo-600'}`}>
                          {calcularTotalPercentual().toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={calcularTotalPercentual()} className="h-2" />
                      {calcularTotalPercentual() > 100 && (
                        <p className="text-xs text-red-600 mt-1">⚠️ Total excede 100%. Ajuste os percentuais.</p>
                      )}
                    </div>
                    
                    {categorias.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Nenhuma categoria cadastrada</p>
                    ) : (
                      <div className="space-y-3">
                        {categorias.map(cat => {
                          // Calculate category spending for progress
                          const gastoCategoria = lancamentosMes
                            .filter(l => l.categoria_id === cat.id)
                            .reduce((acc, l) => acc + Number(l.valor), 0);
                          const metaCategoria = cat.percentual_meta ? (sobraMensal * cat.percentual_meta / 100) : 0;
                          const progressoCategoria = metaCategoria > 0 ? (gastoCategoria / metaCategoria) * 100 : 0;
                          
                          return (
                            <div key={cat.id} className="p-3 rounded-lg border hover:bg-slate-50 dark:hover:bg-muted transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.cor }} />
                                  <div>
                                    <p className="font-medium">{cat.nome}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span className="capitalize">{cat.tipo}</span>
                                      {cat.tipo === "despesa" && cat.percentual_meta && cat.percentual_meta > 0 && (
                                        <>
                                          <span>•</span>
                                          <span>{cat.percentual_meta}% do orçamento</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {cat.tipo === "despesa" && cat.percentual_meta && cat.percentual_meta > 0 && (
                                    <span className={`text-xs font-medium ${progressoCategoria >= 100 ? 'text-red-600' : progressoCategoria >= 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                      {formatCurrency(gastoCategoria)} / {formatCurrency(metaCategoria)}
                                    </span>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditingCategory(cat)}
                                  >
                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteCategory(cat.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                              {/* Progress bar for expense categories with budget */}
                              {cat.tipo === "despesa" && cat.percentual_meta && cat.percentual_meta > 0 && (
                                <div className="mt-2">
                                  <Progress 
                                    value={Math.min(progressoCategoria, 100)} 
                                    className={`h-1.5 ${progressoCategoria >= 100 ? '[&>div]:bg-red-500' : progressoCategoria >= 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Config Tab - Advanced Budget Settings */}
              <TabsContent value="config" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-indigo-600" />
                      Configurações do Orçamento
                    </CardTitle>
                    <CardDescription>
                      Configure seu modelo de orçamento e preferências financeiras
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Budget Model Selection */}
                    <div className="space-y-4">
                      <Label className="text-base font-medium">Modelo de Orçamento</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {BUDGET_MODELS.map((model) => (
                          <div
                            key={model.id}
                            onClick={() => setBudgetModel(model.id)}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              budgetModel === model.id
                                ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/20"
                                : "border-muted hover:border-indigo-300"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-3 h-3 rounded-full ${budgetModel === model.id ? 'bg-indigo-600' : 'bg-muted'}`} />
                              <span className="font-semibold">{model.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{model.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Setup Info */}
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-800 dark:text-amber-200">Dica sobre Modelos</h4>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            O modelo 50/30/20 é recomendado para iniciantes. Você pode personalizar os percentuais 
                            de cada categoria na aba "Categorias" para criar seu próprio modelo.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Current Budget Summary */}
                    <div className="p-4 bg-slate-100 dark:bg-muted rounded-lg">
                      <h4 className="font-medium mb-3">Resumo do Orçamento Atual</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Salário Mensal</span>
                          <span className="font-medium">{formatCurrency(metricas.salario_mensal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Despesas Recorrentes</span>
                          <span className="font-medium text-red-600">-{formatCurrency(totalRecorrentes)}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t pt-2">
                          <span>Disponível para Orçamentar</span>
                          <span className="font-bold text-indigo-600">{formatCurrency(sobraMensal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total Alocado em Categorias</span>
                          <span className={`font-medium ${calcularTotalPercentual() > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {calcularTotalPercentual().toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={() => setActiveTab("categorias")} 
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Categorias e Percentuais
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reports Tab */}
              <TabsContent value="relatorios" className="space-y-6">
                {/* Monthly Expenses Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-indigo-600" />
                      Gastos por Mês (Últimos 6 meses)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                          <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                          <Tooltip
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px"
                            }}
                          />
                          <Legend />
                          <Bar dataKey="gastos" name="Gastos" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Monthly Balance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                      Sobra Mensal (Últimos 6 meses)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                          <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `R$${v}`} />
                          <Tooltip
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px"
                            }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="sobra"
                            name="Sobra"
                            stroke="#10B981"
                            strokeWidth={3}
                            dot={{ fill: "#10B981", strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Expenses by Category (current month) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-indigo-600" />
                      Gastos por Categoria ({format(today, "MMMM/yyyy", { locale: ptBR })})
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
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px"
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

        {/* Edit Category Dialog */}
        <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Categoria</DialogTitle>
            </DialogHeader>
            {editingCategory && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Nome da categoria"
                    value={editingCategory.nome}
                    onChange={(e) => setEditingCategory(prev => prev ? { ...prev, nome: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={editingCategory.tipo}
                    onValueChange={(value) => setEditingCategory(prev => prev ? { ...prev, tipo: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border z-50">
                      <SelectItem value="despesa">Despesa</SelectItem>
                      <SelectItem value="receita">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={editingCategory.cor}
                      onChange={(e) => setEditingCategory(prev => prev ? { ...prev, cor: e.target.value } : null)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={editingCategory.cor}
                      onChange={(e) => setEditingCategory(prev => prev ? { ...prev, cor: e.target.value } : null)}
                      className="flex-1"
                    />
                  </div>
                </div>
                {editingCategory.tipo === "despesa" && (
                  <div className="space-y-2">
                    <Label>Percentual Meta (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Ex.: 15"
                      value={editingCategory.percentual_meta || ""}
                      onChange={(e) => setEditingCategory(prev => prev ? { ...prev, percentual_meta: parseFloat(e.target.value) || 0 } : null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Disponível: {(100 - calcularTotalPercentual(editingCategory.id)).toFixed(1)}%
                    </p>
                  </div>
                )}
                <Button onClick={handleEditCategory} className="w-full bg-indigo-600 hover:bg-indigo-700">
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