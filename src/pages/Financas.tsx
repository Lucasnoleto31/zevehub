import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area, BarChart, Bar } from "recharts";
import { format, startOfMonth, endOfMonth, getDaysInMonth, differenceInDays, subDays, parseISO, getDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Wallet, Plus, Pencil, Trash2, Download, FileText, AlertTriangle, 
  TrendingUp, TrendingDown, Calendar, Target, DollarSign, PiggyBank,
  LayoutDashboard, ListChecks, Settings, FileDown, AlertCircle, CheckCircle2, Upload, FileSpreadsheet, Filter, Bell, RefreshCw, Goal
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Categoria {
  id: string;
  nome: string;
  tipo: string;
  cor: string;
  percentual_meta: number;
  meta_valor: number;
  natureza: 'receita' | 'despesa';
}

interface Lancamento {
  id: string;
  data: string;
  valor: number;
  categoria_id: string;
  descricao: string;
  recorrente: boolean;
  tipo_transacao: 'receita' | 'despesa';
  frequencia_recorrencia: 'semanal' | 'quinzenal' | 'mensal' | 'anual' | null;
  categoria?: Categoria;
}

interface UsuarioMetricas {
  id: string;
  salario_mensal: number;
  sobra_calculada: number;
  valor_diario_meta: number;
  media_7_dias: number;
  previsao_fim_mes: number;
  desvio_padrao_14: number;
  modelo_orcamento: string;
  mes_referencia: string;
}

interface MetaFinanceira {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa' | 'reserva' | 'investimento';
  valor_alvo: number;
  valor_atual: number;
  data_inicio: string;
  data_fim: string | null;
  descricao: string | null;
  cor: string;
  is_active: boolean;
}

const CORES_CATEGORIAS = [
  "#06B6D4", "#8B5CF6", "#EC4899", "#F97316", "#22C55E", 
  "#EAB308", "#EF4444", "#3B82F6", "#14B8A6", "#A855F7"
];

const TIPOS_CATEGORIA_PADRAO = [
  { value: "essencial", label: "Essencial" },
  { value: "nao_essencial", label: "Não Essencial" },
  { value: "metas", label: "Metas" },
];

const TIPOS_META = [
  { value: "receita", label: "Receita", icon: TrendingUp, color: "text-green-500" },
  { value: "despesa", label: "Despesa", icon: TrendingDown, color: "text-red-500" },
  { value: "reserva", label: "Reserva Financeira", icon: PiggyBank, color: "text-blue-500" },
  { value: "investimento", label: "Investimento", icon: Target, color: "text-purple-500" },
];

export default function Financas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Data states
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [metricas, setMetricas] = useState<UsuarioMetricas | null>(null);
  const [metasFinanceiras, setMetasFinanceiras] = useState<MetaFinanceira[]>([]);

  // Form states
  const [categoriaDialog, setCategoriaDialog] = useState(false);
  const [lancamentoDialog, setLancamentoDialog] = useState(false);
  const [metaDialog, setMetaDialog] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(null);
  const [editingMeta, setEditingMeta] = useState<MetaFinanceira | null>(null);

  // Form fields - Categoria
  const [categoriaNome, setCategoriaNome] = useState("");
  const [categoriaTipo, setCategoriaTipo] = useState("essencial");
  const [categoriaTipoCustom, setCategoriaTipoCustom] = useState("");
  const [categoriaCor, setCategoriaCor] = useState("#06B6D4");
  const [categoriaPercentual, setCategoriaPercentual] = useState(0);
  const [categoriaMetaValor, setCategoriaMetaValor] = useState(0);
  const [categoriaNatureza, setCategoriaNatureza] = useState<'receita' | 'despesa'>('despesa');

  // Form fields - Lancamento
  const [lancamentoData, setLancamentoData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [lancamentoValor, setLancamentoValor] = useState(0);
  const [lancamentoCategoriaId, setLancamentoCategoriaId] = useState("");
  const [lancamentoDescricao, setLancamentoDescricao] = useState("");
  const [lancamentoRecorrente, setLancamentoRecorrente] = useState(false);
  const [lancamentoTipoTransacao, setLancamentoTipoTransacao] = useState<'receita' | 'despesa'>('despesa');
  const [lancamentoFrequencia, setLancamentoFrequencia] = useState<'semanal' | 'quinzenal' | 'mensal' | 'anual' | ''>('');

  // Form fields - Meta Financeira
  const [metaNome, setMetaNome] = useState("");
  const [metaTipo, setMetaTipo] = useState<'receita' | 'despesa' | 'reserva' | 'investimento'>('receita');
  const [metaValorAlvo, setMetaValorAlvo] = useState(0);
  const [metaValorAtual, setMetaValorAtual] = useState(0);
  const [metaDataInicio, setMetaDataInicio] = useState(format(new Date(), "yyyy-MM-dd"));
  const [metaDataFim, setMetaDataFim] = useState("");
  const [metaDescricao, setMetaDescricao] = useState("");
  const [metaCor, setMetaCor] = useState("#06B6D4");

  const [salarioMensal, setSalarioMensal] = useState(0);
  const [modeloOrcamento, setModeloOrcamento] = useState("50/30/20");

  // Dashboard period filter
  const [dashboardPeriodo, setDashboardPeriodo] = useState<'7dias' | '14dias' | 'mensal'>('mensal');

  // Filter states
  const [filtroTipoLancamento, setFiltroTipoLancamento] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
  const [filtroDataInicio, setFiltroDataInicio] = useState<string>('');
  const [filtroDataFim, setFiltroDataFim] = useState<string>('');

  // Bulk selection states
  const [selectedLancamentos, setSelectedLancamentos] = useState<string[]>([]);

  // Import states
  const [importDialog, setImportDialog] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Reset categoria ao mudar natureza
  useEffect(() => {
    setLancamentoCategoriaId("");
  }, [lancamentoTipoTransacao]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!adminRole);
    setLoading(false);
  };

  const loadData = async () => {
    if (!user) return;

    // Load categorias
    const { data: categoriasData } = await supabase
      .from("categorias_financas")
      .select("*")
      .eq("user_id", user.id)
      .order("nome");

    if (categoriasData) {
      setCategorias(categoriasData as any);
    }

    // Load lancamentos do mês atual
    const inicioMes = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const fimMes = format(endOfMonth(new Date()), "yyyy-MM-dd");

    const { data: lancamentosData } = await supabase
      .from("lancamentos_financas")
      .select("*")
      .eq("user_id", user.id)
      .gte("data", inicioMes)
      .lte("data", fimMes)
      .order("data", { ascending: false });

    if (lancamentosData && categoriasData) {
      const lancamentosComCategoria = lancamentosData.map((l: any) => ({
        ...l,
        categoria: categoriasData.find((c: any) => c.id === l.categoria_id),
      }));
      setLancamentos(lancamentosComCategoria);
    }

    // Load metas financeiras
    const { data: metasData } = await supabase
      .from("metas_financeiras")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (metasData) {
      setMetasFinanceiras(metasData as any);
    }

    // Load or create metricas
    const mesAtual = format(new Date(), "yyyy-MM");
    const { data: metricasData } = await supabase
      .from("usuario_metricas_financas")
      .select("*")
      .eq("user_id", user.id)
      .eq("mes_referencia", mesAtual)
      .maybeSingle();

    if (metricasData) {
      setMetricas(metricasData as any);
      setSalarioMensal(metricasData.salario_mensal || 0);
      setModeloOrcamento(metricasData.modelo_orcamento || "50/30/20");
    } else {
      // Create default metrics
      const { data: newMetricas } = await supabase
        .from("usuario_metricas_financas")
        .insert({
          user_id: user.id,
          mes_referencia: mesAtual,
          salario_mensal: 0,
          sobra_calculada: 0,
          valor_diario_meta: 0,
        })
        .select()
        .single();

      if (newMetricas) {
        setMetricas(newMetricas as any);
      }
    }
  };

  // Cálculos baseados no período selecionado do Dashboard
  const lancamentosDashboard = useMemo(() => {
    const hoje = new Date();
    let dataInicio: Date;
    
    switch (dashboardPeriodo) {
      case '7dias':
        dataInicio = subDays(hoje, 7);
        break;
      case '14dias':
        dataInicio = subDays(hoje, 14);
        break;
      case 'mensal':
      default:
        dataInicio = startOfMonth(hoje);
        break;
    }
    
    const dataInicioStr = format(dataInicio, "yyyy-MM-dd");
    return lancamentos.filter(l => l.data >= dataInicioStr);
  }, [lancamentos, dashboardPeriodo]);

  // Cálculos - APENAS DESPESAS para gastos
  const totalGastoHoje = useMemo(() => {
    const hoje = format(new Date(), "yyyy-MM-dd");
    return lancamentos
      .filter((l) => l.data === hoje && l.tipo_transacao === 'despesa')
      .reduce((sum, l) => sum + l.valor, 0);
  }, [lancamentos]);

  const totalGastoPeriodo = useMemo(() => {
    return lancamentosDashboard
      .filter(l => l.tipo_transacao === 'despesa')
      .reduce((sum, l) => sum + l.valor, 0);
  }, [lancamentosDashboard]);

  const sobraParaGastarHoje = useMemo(() => {
    return (metricas?.valor_diario_meta || 0) - totalGastoHoje;
  }, [metricas, totalGastoHoje]);

  const gastosPorCategoria = useMemo(() => {
    const gastos: Record<string, { nome: string; valor: number; cor: string }> = {};
    // Apenas despesas no gráfico de gastos por categoria
    lancamentosDashboard
      .filter(l => l.tipo_transacao === 'despesa')
      .forEach((l) => {
        const cat = l.categoria;
        if (cat) {
          if (!gastos[cat.id]) {
            gastos[cat.id] = { nome: cat.nome, valor: 0, cor: cat.cor };
          }
          gastos[cat.id].valor += l.valor;
        }
      });
    return Object.values(gastos);
  }, [lancamentosDashboard]);

  const gastosDiarios = useMemo(() => {
    const hoje = new Date();
    let dataInicio: Date;
    
    switch (dashboardPeriodo) {
      case '7dias':
        dataInicio = subDays(hoje, 6);
        break;
      case '14dias':
        dataInicio = subDays(hoje, 13);
        break;
      case 'mensal':
      default:
        dataInicio = startOfMonth(hoje);
        break;
    }
    
    const gastos: Record<string, { receitas: number; despesas: number }> = {};
    
    let currentDate = dataInicio;
    while (currentDate <= hoje) {
      const dia = format(currentDate, "yyyy-MM-dd");
      gastos[dia] = { receitas: 0, despesas: 0 };
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }

    lancamentosDashboard.forEach((l) => {
      if (gastos[l.data] !== undefined) {
        if (l.tipo_transacao === 'receita') {
          gastos[l.data].receitas += l.valor;
        } else {
          gastos[l.data].despesas += l.valor;
        }
      }
    });

    return Object.entries(gastos).map(([data, valores]) => ({
      data: format(parseISO(data), "dd/MM"),
      receitas: valores.receitas,
      despesas: valores.despesas,
    }));
  }, [lancamentosDashboard, dashboardPeriodo]);

  // Totais separados por tipo no período (receitas inclui salário mensal se mensal)
  const totalReceitasPeriodo = useMemo(() => {
    const receitasLancamentos = lancamentosDashboard
      .filter(l => l.tipo_transacao === 'receita')
      .reduce((sum, l) => sum + l.valor, 0);
    
    // Adiciona salário mensal automaticamente se for visualização mensal
    const salarioAdicional = dashboardPeriodo === 'mensal' ? salarioMensal : 0;
    return receitasLancamentos + salarioAdicional;
  }, [lancamentosDashboard, salarioMensal, dashboardPeriodo]);

  const totalDespesasPeriodo = useMemo(() => {
    return lancamentosDashboard.filter(l => l.tipo_transacao === 'despesa').reduce((sum, l) => sum + l.valor, 0);
  }, [lancamentosDashboard]);

  // Totais do mês completo (para previsões e cálculos de saldo)
  const totalReceitas = useMemo(() => {
    const receitasLancamentos = lancamentos.filter(l => l.tipo_transacao === 'receita').reduce((sum, l) => sum + l.valor, 0);
    // Sempre adiciona salário mensal nas receitas totais do mês
    return receitasLancamentos + salarioMensal;
  }, [lancamentos, salarioMensal]);

  const totalDespesas = useMemo(() => {
    return lancamentos.filter(l => l.tipo_transacao === 'despesa').reduce((sum, l) => sum + l.valor, 0);
  }, [lancamentos]);

  // Categorias filtradas por natureza para o form de lançamento
  const categoriasParaLancamento = useMemo(() => {
    return categorias.filter(c => c.natureza === lancamentoTipoTransacao);
  }, [categorias, lancamentoTipoTransacao]);

  // Total de percentual usado nas categorias
  const totalPercentualUsado = useMemo(() => {
    return categorias.reduce((sum, cat) => sum + (cat.percentual_meta || 0), 0);
  }, [categorias]);

  // Percentual disponível para nova categoria
  const percentualDisponivel = useMemo(() => {
    const usado = editingCategoria 
      ? totalPercentualUsado - (editingCategoria.percentual_meta || 0)
      : totalPercentualUsado;
    return Math.max(0, 100 - usado);
  }, [totalPercentualUsado, editingCategoria]);

  // Lançamentos filtrados
  const lancamentosFiltrados = useMemo(() => {
    let resultado = lancamentos;
    
    if (filtroTipoLancamento !== 'todos') {
      resultado = resultado.filter(l => l.tipo_transacao === filtroTipoLancamento);
    }
    
    if (filtroCategoria !== 'todas') {
      resultado = resultado.filter(l => l.categoria_id === filtroCategoria);
    }
    
    if (filtroDataInicio) {
      resultado = resultado.filter(l => l.data >= filtroDataInicio);
    }
    
    if (filtroDataFim) {
      resultado = resultado.filter(l => l.data <= filtroDataFim);
    }
    
    return resultado;
  }, [lancamentos, filtroTipoLancamento, filtroCategoria, filtroDataInicio, filtroDataFim]);

  // Cálculos corrigidos de previsão (baseados apenas em despesas)
  const previsaoFimMes = useMemo(() => {
    const hoje = new Date();
    const diaAtual = getDate(hoje);
    const diasNoMes = getDaysInMonth(hoje);
    const diasRestantes = diasNoMes - diaAtual;
    
    // Média de despesas por dia (apenas dias passados)
    const mediaDespesasDiaria = diaAtual > 0 ? totalDespesas / diaAtual : 0;
    
    // Previsão = despesas atuais + (média × dias restantes)
    return totalDespesas + (mediaDespesasDiaria * diasRestantes);
  }, [totalDespesas]);

  const saldoPrevisto = useMemo(() => {
    // Saldo = receitas totais - previsão de despesas
    return totalReceitas - previsaoFimMes;
  }, [totalReceitas, previsaoFimMes]);

  // Alertas de recorrências
  const recorrenciasHoje = useMemo(() => {
    const hoje = format(new Date(), "yyyy-MM-dd");
    return lancamentos.filter(l => l.recorrente && l.data === hoje);
  }, [lancamentos]);

  // Lista dinâmica de tipos (padrão + customizados do usuário)
  const tiposCategoria = useMemo(() => {
    const tiposCustomizados = categorias
      .map(c => c.tipo)
      .filter(tipo => !TIPOS_CATEGORIA_PADRAO.some(t => t.value === tipo))
      .filter((tipo, index, self) => self.indexOf(tipo) === index);
    
    const listaPadrao = [...TIPOS_CATEGORIA_PADRAO];
    tiposCustomizados.forEach(tipo => {
      listaPadrao.push({ value: tipo, label: tipo });
    });
    
    return listaPadrao;
  }, [categorias]);

  // Funções CRUD - Categoria
  const handleSaveCategoria = async () => {
    if (!user || !categoriaNome) return;

    const tipoFinal = categoriaTipo === "custom" ? categoriaTipoCustom.trim() : categoriaTipo;
    if (!tipoFinal) {
      toast({ title: "Digite o nome do tipo", variant: "destructive" });
      return;
    }

    // Validar percentual máximo de 100%
    const percentualAtualSemEdicao = editingCategoria 
      ? totalPercentualUsado - (editingCategoria.percentual_meta || 0)
      : totalPercentualUsado;
    
    if (percentualAtualSemEdicao + categoriaPercentual > 100) {
      toast({ 
        title: "Percentual excede 100%", 
        description: `O máximo disponível é ${percentualDisponivel}%`,
        variant: "destructive" 
      });
      return;
    }

    const categoriaData = {
      nome: categoriaNome,
      tipo: tipoFinal,
      cor: categoriaCor,
      percentual_meta: categoriaPercentual,
      meta_valor: categoriaMetaValor,
      natureza: categoriaNatureza,
      user_id: user.id,
    };

    if (editingCategoria) {
      await supabase
        .from("categorias_financas")
        .update(categoriaData)
        .eq("id", editingCategoria.id);
      toast({ title: "Categoria atualizada" });
    } else {
      await supabase.from("categorias_financas").insert(categoriaData);
      toast({ title: "Categoria criada" });
    }

    resetCategoriaForm();
    loadData();
  };

  const handleDeleteCategoria = async (id: string) => {
    await supabase.from("categorias_financas").delete().eq("id", id);
    toast({ title: "Categoria excluída" });
    loadData();
  };

  // Funções CRUD - Lancamento
  const handleSaveLancamento = async () => {
    if (!user || !lancamentoCategoriaId || lancamentoValor <= 0) return;

    const lancamentoPayload = {
      data: lancamentoData,
      valor: lancamentoValor,
      categoria_id: lancamentoCategoriaId,
      descricao: lancamentoDescricao,
      recorrente: lancamentoRecorrente,
      tipo_transacao: lancamentoTipoTransacao,
      frequencia_recorrencia: lancamentoRecorrente && lancamentoFrequencia ? lancamentoFrequencia : null,
      user_id: user.id,
    };

    if (editingLancamento) {
      await supabase
        .from("lancamentos_financas")
        .update(lancamentoPayload)
        .eq("id", editingLancamento.id);
      toast({ title: "Lançamento atualizado" });
    } else {
      await supabase.from("lancamentos_financas").insert(lancamentoPayload);
      toast({ title: "Lançamento criado" });
    }

    // Recalcular métricas
    await recalcularMetricas();

    resetLancamentoForm();
    loadData();
  };

  const handleDeleteLancamento = async (id: string) => {
    await supabase.from("lancamentos_financas").delete().eq("id", id);
    toast({ title: "Lançamento excluído" });
    await recalcularMetricas();
    loadData();
  };

  // Bulk delete
  const handleBulkDeleteLancamentos = async () => {
    if (selectedLancamentos.length === 0) return;

    for (const id of selectedLancamentos) {
      await supabase.from("lancamentos_financas").delete().eq("id", id);
    }
    
    toast({ title: `${selectedLancamentos.length} lançamentos excluídos` });
    setSelectedLancamentos([]);
    await recalcularMetricas();
    loadData();
  };

  const toggleSelectLancamento = (id: string) => {
    setSelectedLancamentos(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLancamentos.length === lancamentosFiltrados.length) {
      setSelectedLancamentos([]);
    } else {
      setSelectedLancamentos(lancamentosFiltrados.map(l => l.id));
    }
  };

  // Funções CRUD - Meta Financeira
  const handleSaveMeta = async () => {
    if (!user || !metaNome || metaValorAlvo <= 0) return;

    const metaData = {
      nome: metaNome,
      tipo: metaTipo,
      valor_alvo: metaValorAlvo,
      valor_atual: metaValorAtual,
      data_inicio: metaDataInicio,
      data_fim: metaDataFim || null,
      descricao: metaDescricao || null,
      cor: metaCor,
      user_id: user.id,
    };

    if (editingMeta) {
      await supabase
        .from("metas_financeiras")
        .update(metaData)
        .eq("id", editingMeta.id);
      toast({ title: "Meta atualizada" });
    } else {
      await supabase.from("metas_financeiras").insert(metaData);
      toast({ title: "Meta criada" });
    }

    resetMetaForm();
    loadData();
  };

  const handleDeleteMeta = async (id: string) => {
    await supabase.from("metas_financeiras").delete().eq("id", id);
    toast({ title: "Meta excluída" });
    loadData();
  };

  const recalcularMetricas = async () => {
    if (!user || !metricas) return;

    const inicioMes = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const fimMes = format(endOfMonth(new Date()), "yyyy-MM-dd");

    const { data: lancamentosData } = await supabase
      .from("lancamentos_financas")
      .select("*")
      .eq("user_id", user.id)
      .gte("data", inicioMes)
      .lte("data", fimMes);

    // Calcular totais separados
    const totalDespesasMes = lancamentosData?.filter(l => l.tipo_transacao === 'despesa').reduce((sum, l) => sum + l.valor, 0) || 0;
    const totalReceitasMes = lancamentosData?.filter(l => l.tipo_transacao === 'receita').reduce((sum, l) => sum + l.valor, 0) || 0;
    
    // Saldo = receitas - despesas
    const sobra = totalReceitasMes - totalDespesasMes;
    
    const diasRestantes = differenceInDays(endOfMonth(new Date()), new Date()) + 1;
    const metaDiaria = diasRestantes > 0 ? sobra / diasRestantes : 0;

    // Média últimos 7 dias (apenas despesas)
    const seteDiasAtras = format(subDays(new Date(), 7), "yyyy-MM-dd");
    const { data: lancamentos7Dias } = await supabase
      .from("lancamentos_financas")
      .select("*")
      .eq("user_id", user.id)
      .eq("tipo_transacao", "despesa")
      .gte("data", seteDiasAtras);

    const media7Dias = lancamentos7Dias && lancamentos7Dias.length > 0
      ? lancamentos7Dias.reduce((sum, l) => sum + l.valor, 0) / 7
      : 0;

    // Previsão de despesas para o mês inteiro
    const diaAtual = getDate(new Date());
    const diasNoMes = getDaysInMonth(new Date());
    const mediaDespesasDiaria = diaAtual > 0 ? totalDespesasMes / diaAtual : 0;
    const previsaoFimMes = totalDespesasMes + (mediaDespesasDiaria * (diasNoMes - diaAtual));

    await supabase
      .from("usuario_metricas_financas")
      .update({
        sobra_calculada: sobra,
        valor_diario_meta: Math.max(0, metaDiaria),
        media_7_dias: media7Dias,
        previsao_fim_mes: previsaoFimMes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", metricas.id);
  };

  const handleSaveConfig = async () => {
    if (!user || !metricas) return;

    await supabase
      .from("usuario_metricas_financas")
      .update({
        salario_mensal: salarioMensal,
        modelo_orcamento: modeloOrcamento,
        updated_at: new Date().toISOString(),
      })
      .eq("id", metricas.id);

    await recalcularMetricas();
    toast({ title: "Configurações salvas" });
    loadData();
  };

  const handleApplyBudgetModel = async () => {
    if (!user || categorias.length === 0) return;

    let distribuicao: Record<string, number> = {};

    switch (modeloOrcamento) {
      case "50/30/20":
        distribuicao = { essencial: 50, nao_essencial: 30, lazer: 10, educacao: 5, saude: 3, outros: 2 };
        break;
      case "30/30/40":
        distribuicao = { essencial: 30, nao_essencial: 30, lazer: 15, educacao: 10, saude: 10, outros: 5 };
        break;
      default:
        return;
    }

    for (const cat of categorias) {
      const percentual = distribuicao[cat.tipo] || 0;
      const metaValor = salarioMensal * (percentual / 100);

      await supabase
        .from("categorias_financas")
        .update({ percentual_meta: percentual, meta_valor: metaValor })
        .eq("id", cat.id);
    }

    toast({ title: "Modelo de orçamento aplicado" });
    loadData();
  };

  const handleExportCSV = () => {
    const headers = ["Tipo", "Data", "Valor", "Categoria", "Descrição", "Recorrente", "Frequência"];
    const rows = lancamentos.map((l) => [
      l.tipo_transacao === 'receita' ? 'Receita' : 'Despesa',
      format(parseISO(l.data), "dd/MM/yyyy"),
      l.valor.toFixed(2),
      l.categoria?.nome || "",
      l.descricao || "",
      l.recorrente ? "Sim" : "Não",
      l.frequencia_recorrencia || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `lancamentos_${format(new Date(), "yyyy-MM")}.csv`;
    link.click();

    toast({ title: "CSV exportado" });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const mesAtual = format(new Date(), "MMMM yyyy", { locale: ptBR });

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138);
    doc.text("Relatório Financeiro - Zeve Hub", 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Período: ${mesAtual}`, 14, 28);

    // Resumo
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Resumo do Mês", 14, 40);
    doc.setFontSize(10);
    doc.text(`Total Gasto: R$ ${totalDespesas.toFixed(2)}`, 14, 48);
    doc.text(`Média Diária: R$ ${(metricas?.media_7_dias || 0).toFixed(2)}`, 14, 54);
    doc.text(`Previsão Fim de Mês: R$ ${(metricas?.previsao_fim_mes || 0).toFixed(2)}`, 14, 60);
    doc.text(`Saldo Previsto: R$ ${((metricas?.sobra_calculada || 0) - (metricas?.previsao_fim_mes || 0)).toFixed(2)}`, 14, 66);

    // Tabela
    autoTable(doc, {
      startY: 75,
      head: [["Tipo", "Data", "Categoria", "Descrição", "Valor", "Recorrência"]],
      body: lancamentos.map((l) => [
        l.tipo_transacao === 'receita' ? 'Receita' : 'Despesa',
        format(parseISO(l.data), "dd/MM/yyyy"),
        l.categoria?.nome || "",
        l.descricao || "",
        `${l.tipo_transacao === 'receita' ? '+' : '-'}R$ ${l.valor.toFixed(2)}`,
        l.recorrente ? (l.frequencia_recorrencia || "Sim") : "-",
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 58, 138] },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Gerado por Zeve Hub - ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, doc.internal.pageSize.height - 10);
      doc.text(`Página ${i}/${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }

    doc.save(`relatorio_${format(new Date(), "yyyy-MM")}.pdf`);
    toast({ title: "PDF exportado" });
  };

  const handleDownloadTemplate = () => {
    const template = [
      { Data: "2024-01-15", Valor: 150.00, Tipo: "despesa", Categoria: "Alimentação", Descricao: "Supermercado", Recorrente: "Não", Frequencia: "" },
      { Data: "2024-01-16", Valor: 50.00, Tipo: "despesa", Categoria: "Transporte", Descricao: "Uber", Recorrente: "Não", Frequencia: "" },
      { Data: "2024-01-01", Valor: 5000.00, Tipo: "receita", Categoria: "Salário", Descricao: "Salário mensal", Recorrente: "Sim", Frequencia: "mensal" },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    
    // Set column widths
    ws["!cols"] = [
      { wch: 12 }, // Data
      { wch: 12 }, // Valor
      { wch: 10 }, // Tipo
      { wch: 15 }, // Categoria
      { wch: 25 }, // Descricao
      { wch: 12 }, // Recorrente
      { wch: 12 }, // Frequencia
    ];

    XLSX.writeFile(wb, "modelo_importacao_financas.xlsx");
    toast({ title: "Modelo baixado" });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Validate and transform data
        const transformedData = jsonData.map((row: any, index: number) => {
          const dataStr = row.Data?.toString() || "";
          let formattedDate = "";
          
          // Handle Excel date serial number
          if (typeof row.Data === "number") {
            const excelDate = new Date((row.Data - 25569) * 86400 * 1000);
            formattedDate = format(excelDate, "yyyy-MM-dd");
          } else if (dataStr.includes("/")) {
            const [day, month, year] = dataStr.split("/");
            formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
          } else {
            formattedDate = dataStr;
          }

          return {
            index,
            data: formattedDate,
            valor: parseFloat(row.Valor) || 0,
            tipo: (row.Tipo || "despesa").toLowerCase(),
            categoria: row.Categoria || "Outros",
            descricao: row.Descricao || "",
            recorrente: row.Recorrente?.toLowerCase() === "sim" || row.Recorrente === true,
            frequencia: (row.Frequencia || "").toLowerCase(),
            valid: formattedDate && parseFloat(row.Valor) > 0,
          };
        });

        setImportData(transformedData);
        setImportDialog(true);
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        toast({ title: "Erro ao processar arquivo", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleConfirmImport = async () => {
    if (!user || importData.length === 0) return;

    setImportLoading(true);
    let imported = 0;
    let errors = 0;

    for (const item of importData.filter(d => d.valid)) {
      // Find or create category
      let categoriaId = categorias.find(c => 
        c.nome.toLowerCase() === item.categoria.toLowerCase()
      )?.id;

      if (!categoriaId) {
        // Create new category with correct natureza
        const { data: newCat } = await supabase
          .from("categorias_financas")
          .insert({
            nome: item.categoria,
            tipo: "essencial",
            cor: CORES_CATEGORIAS[Math.floor(Math.random() * CORES_CATEGORIAS.length)],
            natureza: item.tipo === 'receita' ? 'receita' : 'despesa',
            user_id: user.id,
          })
          .select()
          .single();
        
        if (newCat) {
          categoriaId = newCat.id;
        }
      }

      if (categoriaId) {
        const frequenciaValida = ['semanal', 'quinzenal', 'mensal', 'anual'].includes(item.frequencia) ? item.frequencia : null;
        const { error } = await supabase.from("lancamentos_financas").insert({
          data: item.data,
          valor: item.valor,
          categoria_id: categoriaId,
          descricao: item.descricao,
          recorrente: item.recorrente,
          tipo_transacao: item.tipo === 'receita' ? 'receita' : 'despesa',
          frequencia_recorrencia: item.recorrente ? frequenciaValida : null,
          user_id: user.id,
        });

        if (error) {
          errors++;
        } else {
          imported++;
        }
      } else {
        errors++;
      }
    }

    await recalcularMetricas();
    setImportLoading(false);
    setImportDialog(false);
    setImportData([]);
    loadData();

    toast({
      title: `Importação concluída`,
      description: `${imported} lançamentos importados${errors > 0 ? `, ${errors} erros` : ""}`,
    });
  };

  const resetCategoriaForm = () => {
    setCategoriaDialog(false);
    setEditingCategoria(null);
    setCategoriaNome("");
    setCategoriaTipo("essencial");
    setCategoriaTipoCustom("");
    setCategoriaCor("#06B6D4");
    setCategoriaPercentual(0);
    setCategoriaMetaValor(0);
    setCategoriaNatureza('despesa');
  };

  const resetLancamentoForm = () => {
    setLancamentoDialog(false);
    setEditingLancamento(null);
    setLancamentoData(format(new Date(), "yyyy-MM-dd"));
    setLancamentoValor(0);
    setLancamentoCategoriaId("");
    setLancamentoDescricao("");
    setLancamentoRecorrente(false);
    setLancamentoTipoTransacao('despesa');
    setLancamentoFrequencia('');
  };

  const resetMetaForm = () => {
    setMetaDialog(false);
    setEditingMeta(null);
    setMetaNome("");
    setMetaTipo('receita');
    setMetaValorAlvo(0);
    setMetaValorAtual(0);
    setMetaDataInicio(format(new Date(), "yyyy-MM-dd"));
    setMetaDataFim("");
    setMetaDescricao("");
    setMetaCor("#06B6D4");
  };

  const openEditCategoria = (cat: Categoria) => {
    setEditingCategoria(cat);
    setCategoriaNome(cat.nome);
    
    const isPredefinedType = TIPOS_CATEGORIA_PADRAO.some(t => t.value === cat.tipo);
    if (isPredefinedType) {
      setCategoriaTipo(cat.tipo);
      setCategoriaTipoCustom("");
    } else {
      setCategoriaTipo(cat.tipo);
      setCategoriaTipoCustom("");
    }
    
    setCategoriaCor(cat.cor);
    setCategoriaPercentual(cat.percentual_meta);
    setCategoriaMetaValor(cat.meta_valor);
    setCategoriaNatureza(cat.natureza || 'despesa');
    setCategoriaDialog(true);
  };

  const openEditLancamento = (lanc: Lancamento) => {
    setEditingLancamento(lanc);
    setLancamentoData(lanc.data);
    setLancamentoValor(lanc.valor);
    setLancamentoTipoTransacao(lanc.tipo_transacao || 'despesa');
    setLancamentoCategoriaId(lanc.categoria_id);
    setLancamentoDescricao(lanc.descricao || "");
    setLancamentoRecorrente(lanc.recorrente);
    setLancamentoFrequencia(lanc.frequencia_recorrencia || '');
    setLancamentoDialog(true);
  };

  const openEditMeta = (meta: MetaFinanceira) => {
    setEditingMeta(meta);
    setMetaNome(meta.nome);
    setMetaTipo(meta.tipo);
    setMetaValorAlvo(meta.valor_alvo);
    setMetaValorAtual(meta.valor_atual);
    setMetaDataInicio(meta.data_inicio);
    setMetaDataFim(meta.data_fim || "");
    setMetaDescricao(meta.descricao || "");
    setMetaCor(meta.cor);
    setMetaDialog(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const clearFilters = () => {
    setFiltroTipoLancamento('todos');
    setFiltroCategoria('todas');
    setFiltroDataInicio('');
    setFiltroDataFim('');
    setSelectedLancamentos([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar isAdmin={isAdmin} />
        <main className="flex-1 p-6 overflow-auto">
          <div className="flex items-center gap-4 mb-6">
            <SidebarTrigger />
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Wallet className="h-8 w-8 text-yellow-500" />
                Finanças Pessoais
              </h1>
              <p className="text-muted-foreground">
                Controle seu orçamento e alcance suas metas financeiras
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-7 w-full max-w-5xl">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="categorias" className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                <span className="hidden sm:inline">Categorias</span>
              </TabsTrigger>
              <TabsTrigger value="lancamentos" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Lançamentos</span>
              </TabsTrigger>
              <TabsTrigger value="metas" className="flex items-center gap-2">
                <Goal className="h-4 w-4" />
                <span className="hidden sm:inline">Metas</span>
              </TabsTrigger>
              <TabsTrigger value="projecao" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Projeção</span>
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
              <TabsTrigger value="exportar" className="flex items-center gap-2">
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </TabsTrigger>
            </TabsList>

            {/* DASHBOARD TAB */}
            <TabsContent value="dashboard" className="space-y-6">
              {/* Filtro de Período */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <Label className="text-muted-foreground">Período:</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={dashboardPeriodo === '7dias' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDashboardPeriodo('7dias')}
                      >
                        Últimos 7 dias
                      </Button>
                      <Button
                        variant={dashboardPeriodo === '14dias' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDashboardPeriodo('14dias')}
                      >
                        Últimos 14 dias
                      </Button>
                      <Button
                        variant={dashboardPeriodo === 'mensal' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDashboardPeriodo('mensal')}
                      >
                        Mês Atual
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Alertas */}
              {sobraParaGastarHoje < 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Limite diário ultrapassado!</AlertTitle>
                  <AlertDescription>
                    Você gastou {formatCurrency(Math.abs(sobraParaGastarHoje))} além da sua meta diária.
                  </AlertDescription>
                </Alert>
              )}

              {sobraParaGastarHoje >= 0 && sobraParaGastarHoje <= (metricas?.valor_diario_meta || 0) * 0.25 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Atenção!</AlertTitle>
                  <AlertDescription>
                    Você está próximo de atingir sua meta diária. Restam apenas {formatCurrency(sobraParaGastarHoje)}.
                  </AlertDescription>
                </Alert>
              )}

              {/* Cards de métricas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-cyan-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Meta Diária</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-cyan-500">
                      {formatCurrency(metricas?.valor_diario_meta || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total Gasto Hoje</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-500">
                      {formatCurrency(totalGastoHoje)}
                    </div>
                  </CardContent>
                </Card>

                <Card className={`border-l-4 ${sobraParaGastarHoje < 0 ? "border-l-red-500" : "border-l-green-500"}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Sobra Hoje</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${sobraParaGastarHoje < 0 ? "text-red-500" : "text-green-500"}`}>
                      {formatCurrency(sobraParaGastarHoje)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Média 7 dias</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-500">
                      {formatCurrency(metricas?.media_7_dias || 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cards de Receitas e Despesas por Período */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Receitas ({dashboardPeriodo === '7dias' ? '7 dias' : dashboardPeriodo === '14dias' ? '14 dias' : 'Mês'})
                    </CardTitle>
                    {dashboardPeriodo === 'mensal' && salarioMensal > 0 && (
                      <CardDescription className="text-xs">
                        Inclui salário de {formatCurrency(salarioMensal)}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                      +{formatCurrency(totalReceitasPeriodo)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      Despesas ({dashboardPeriodo === '7dias' ? '7 dias' : dashboardPeriodo === '14dias' ? '14 dias' : 'Mês'})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-500">
                      -{formatCurrency(totalDespesasPeriodo)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-orange-500" />
                      Previsão Despesas (Mês)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Com base na média diária
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-500">
                      {formatCurrency(previsaoFimMes)}
                    </div>
                  </CardContent>
                </Card>

                <Card className={`border-l-4 ${saldoPrevisto >= 0 ? "border-l-emerald-500" : "border-l-red-500"}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <PiggyBank className={`h-4 w-4 ${saldoPrevisto >= 0 ? "text-emerald-500" : "text-red-500"}`} />
                      Saldo Previsto
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Receitas - Previsão despesas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${saldoPrevisto >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {formatCurrency(saldoPrevisto)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Saldo do Período ({dashboardPeriodo === '7dias' ? '7 dias' : dashboardPeriodo === '14dias' ? '14 dias' : 'Mês'})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${(totalReceitasPeriodo - totalDespesasPeriodo) >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {formatCurrency(totalReceitasPeriodo - totalDespesasPeriodo)}
                  </div>
                  <Progress 
                    value={totalReceitasPeriodo > 0 ? Math.min((totalDespesasPeriodo / totalReceitasPeriodo) * 100, 100) : 0} 
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalReceitasPeriodo > 0 ? ((totalDespesasPeriodo / totalReceitasPeriodo) * 100).toFixed(1) : 0}% das receitas gastas
                  </p>
                </CardContent>
              </Card>

              {/* Alerta de Recorrências */}
              {recorrenciasHoje.length > 0 && (
                <Alert className="border-cyan-500/50 bg-cyan-500/10">
                  <Bell className="h-4 w-4 text-cyan-500" />
                  <AlertTitle className="text-cyan-500">Lançamentos Recorrentes Hoje</AlertTitle>
                  <AlertDescription>
                    {recorrenciasHoje.length} lançamento(s) recorrente(s) programado(s) para hoje: {recorrenciasHoje.map(l => l.descricao || l.categoria?.nome).join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Gastos por Categoria ({dashboardPeriodo === '7dias' ? '7 dias' : dashboardPeriodo === '14dias' ? '14 dias' : 'Mês'})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={gastosPorCategoria}
                            dataKey="valor"
                            nameKey="nome"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ nome, percent }) => `${nome} ${(percent * 100).toFixed(0)}%`}
                          >
                            {gastosPorCategoria.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.cor || CORES_CATEGORIAS[index % CORES_CATEGORIAS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Receitas vs Despesas ({dashboardPeriodo === '7dias' ? '7 dias' : dashboardPeriodo === '14dias' ? '14 dias' : 'Mês'})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={gastosDiarios}>
                          <XAxis 
                            dataKey="data" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={(value) => `R$${value}`}
                          />
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--background))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="receitas" 
                            stroke="#22C55E"
                            fill="#22C55E"
                            fillOpacity={0.2}
                            strokeWidth={2}
                            name="Receitas"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="despesas" 
                            stroke="#EF4444"
                            fill="#EF4444"
                            fillOpacity={0.2}
                            strokeWidth={2}
                            name="Despesas"
                          />
                          <Legend />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* CATEGORIAS TAB */}
            <TabsContent value="categorias" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Categorias</h2>
                  <p className="text-sm text-muted-foreground">
                    Total de metas: {totalPercentualUsado}% / 100%
                  </p>
                </div>
                <Dialog open={categoriaDialog} onOpenChange={setCategoriaDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => resetCategoriaForm()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Categoria
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingCategoria ? "Editar" : "Nova"} Categoria</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Natureza</Label>
                        <Select value={categoriaNatureza} onValueChange={(v: 'receita' | 'despesa') => setCategoriaNatureza(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="receita">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-green-500" />
                                Receita
                              </div>
                            </SelectItem>
                            <SelectItem value="despesa">
                              <div className="flex items-center gap-2">
                                <TrendingDown className="h-4 w-4 text-red-500" />
                                Despesa
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Nome</Label>
                        <Input
                          value={categoriaNome}
                          onChange={(e) => setCategoriaNome(e.target.value)}
                          placeholder={categoriaNatureza === 'receita' ? "Ex: Salário, 13º, Dividendos" : "Ex: Alimentação, Transporte"}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={categoriaTipo} onValueChange={setCategoriaTipo}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {tiposCategoria.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">+ Criar novo tipo</SelectItem>
                          </SelectContent>
                        </Select>
                        {categoriaTipo === "custom" && (
                          <Input
                            value={categoriaTipoCustom}
                            onChange={(e) => setCategoriaTipoCustom(e.target.value)}
                            placeholder="Digite o nome do novo tipo"
                          />
                        )}
                      </div>
                      <div>
                        <Label>Cor</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="color"
                            value={categoriaCor}
                            onChange={(e) => setCategoriaCor(e.target.value)}
                            className="w-16 h-10 p-1"
                          />
                          <Input
                            value={categoriaCor}
                            onChange={(e) => setCategoriaCor(e.target.value)}
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Percentual da Meta (%) - Disponível: {percentualDisponivel}%</Label>
                        <Input
                          type="number"
                          min={0}
                          max={percentualDisponivel}
                          value={categoriaPercentual}
                          onChange={(e) => setCategoriaPercentual(Math.min(Number(e.target.value), percentualDisponivel))}
                        />
                        {categoriaPercentual > percentualDisponivel && (
                          <p className="text-xs text-destructive mt-1">Máximo disponível: {percentualDisponivel}%</p>
                        )}
                      </div>
                      <div>
                        <Label>Meta em Valor (R$)</Label>
                        <Input
                          type="number"
                          value={categoriaMetaValor}
                          onChange={(e) => setCategoriaMetaValor(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={resetCategoriaForm}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveCategoria}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Separar categorias por natureza */}
              <div className="space-y-6">
                {/* Categorias de Receita */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-500">
                      <TrendingUp className="h-5 w-5" />
                      Categorias de Receita
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Cor</TableHead>
                          <TableHead>Meta %</TableHead>
                          <TableHead>Meta Valor</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categorias.filter(c => c.natureza === 'receita').map((cat) => (
                          <TableRow key={cat.id}>
                            <TableCell className="font-medium">{cat.nome}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {tiposCategoria.find((t) => t.value === cat.tipo)?.label || cat.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div
                                className="w-6 h-6 rounded"
                                style={{ backgroundColor: cat.cor }}
                              />
                            </TableCell>
                            <TableCell>{cat.percentual_meta}%</TableCell>
                            <TableCell>{formatCurrency(cat.meta_valor || 0)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEditCategoria(cat)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteCategoria(cat.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {categorias.filter(c => c.natureza === 'receita').length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Nenhuma categoria de receita cadastrada
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Categorias de Despesa */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-500">
                      <TrendingDown className="h-5 w-5" />
                      Categorias de Despesa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Cor</TableHead>
                          <TableHead>Meta %</TableHead>
                          <TableHead>Meta Valor</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categorias.filter(c => c.natureza === 'despesa').map((cat) => (
                          <TableRow key={cat.id}>
                            <TableCell className="font-medium">{cat.nome}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {tiposCategoria.find((t) => t.value === cat.tipo)?.label || cat.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div
                                className="w-6 h-6 rounded"
                                style={{ backgroundColor: cat.cor }}
                              />
                            </TableCell>
                            <TableCell>{cat.percentual_meta}%</TableCell>
                            <TableCell>{formatCurrency(cat.meta_valor || 0)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEditCategoria(cat)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteCategoria(cat.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {categorias.filter(c => c.natureza === 'despesa').length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Nenhuma categoria de despesa cadastrada
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* LANCAMENTOS TAB */}
            <TabsContent value="lancamentos" className="space-y-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h2 className="text-xl font-semibold">Lançamentos do Mês</h2>
                  <Dialog open={lancamentoDialog} onOpenChange={setLancamentoDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => resetLancamentoForm()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Lançamento
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingLancamento ? "Editar" : "Novo"} Lançamento</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Tipo</Label>
                          <Select value={lancamentoTipoTransacao} onValueChange={(v: 'receita' | 'despesa') => setLancamentoTipoTransacao(v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="receita">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-green-500" />
                                  Receita
                                </div>
                              </SelectItem>
                              <SelectItem value="despesa">
                                <div className="flex items-center gap-2">
                                  <TrendingDown className="h-4 w-4 text-red-500" />
                                  Despesa
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Data</Label>
                          <Input
                            type="date"
                            value={lancamentoData}
                            onChange={(e) => setLancamentoData(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Valor (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={lancamentoValor}
                            onChange={(e) => setLancamentoValor(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Categoria ({lancamentoTipoTransacao === 'receita' ? 'Receita' : 'Despesa'})</Label>
                          <Select value={lancamentoCategoriaId} onValueChange={setLancamentoCategoriaId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                            <SelectContent>
                              {categoriasParaLancamento.length === 0 ? (
                                <SelectItem value="" disabled>
                                  Nenhuma categoria de {lancamentoTipoTransacao} cadastrada
                                </SelectItem>
                              ) : (
                                categoriasParaLancamento.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.cor }} />
                                      {cat.nome}
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {categoriasParaLancamento.length === 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Crie uma categoria de {lancamentoTipoTransacao} primeiro
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>Descrição</Label>
                          <Input
                            value={lancamentoDescricao}
                            onChange={(e) => setLancamentoDescricao(e.target.value)}
                            placeholder="Ex: Almoço no restaurante"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="recorrente"
                            checked={lancamentoRecorrente}
                            onChange={(e) => {
                              setLancamentoRecorrente(e.target.checked);
                              if (!e.target.checked) setLancamentoFrequencia('');
                            }}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="recorrente">Lançamento recorrente</Label>
                        </div>
                        {lancamentoRecorrente && (
                          <div>
                            <Label>Frequência da Recorrência</Label>
                            <Select value={lancamentoFrequencia} onValueChange={(v: 'semanal' | 'quinzenal' | 'mensal' | 'anual') => setLancamentoFrequencia(v)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a frequência" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="semanal">Semanal</SelectItem>
                                <SelectItem value="quinzenal">Quinzenal</SelectItem>
                                <SelectItem value="mensal">Mensal</SelectItem>
                                <SelectItem value="anual">Anual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={resetLancamentoForm}>
                          Cancelar
                        </Button>
                        <Button onClick={handleSaveLancamento} disabled={categoriasParaLancamento.length === 0}>
                          Salvar
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Filtros */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filtros
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <Label>Tipo</Label>
                        <Select value={filtroTipoLancamento} onValueChange={(v: 'todos' | 'receita' | 'despesa') => setFiltroTipoLancamento(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="receita">Receitas</SelectItem>
                            <SelectItem value="despesa">Despesas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Categoria</Label>
                        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">Todas</SelectItem>
                            {categorias.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Data Início</Label>
                        <Input
                          type="date"
                          value={filtroDataInicio}
                          onChange={(e) => setFiltroDataInicio(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Data Fim</Label>
                        <Input
                          type="date"
                          value={filtroDataFim}
                          onChange={(e) => setFiltroDataFim(e.target.value)}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button variant="outline" onClick={clearFilters} className="w-full">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Limpar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Ações em massa */}
                {selectedLancamentos.length > 0 && (
                  <Alert className="border-yellow-500/50 bg-yellow-500/10">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <AlertTitle className="text-yellow-500">
                      {selectedLancamentos.length} lançamento(s) selecionado(s)
                    </AlertTitle>
                    <AlertDescription className="flex gap-2 mt-2">
                      <Button variant="destructive" size="sm" onClick={handleBulkDeleteLancamentos}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Selecionados
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedLancamentos([])}>
                        Cancelar
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Resumo dos filtros */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{lancamentosFiltrados.length} lançamento(s)</span>
                  <span>|</span>
                  <span className="text-green-500">
                    Receitas: {formatCurrency(lancamentosFiltrados.filter(l => l.tipo_transacao === 'receita').reduce((sum, l) => sum + l.valor, 0))}
                  </span>
                  <span>|</span>
                  <span className="text-red-500">
                    Despesas: {formatCurrency(lancamentosFiltrados.filter(l => l.tipo_transacao === 'despesa').reduce((sum, l) => sum + l.valor, 0))}
                  </span>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedLancamentos.length === lancamentosFiltrados.length && lancamentosFiltrados.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Recorrência</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lancamentosFiltrados.map((lanc) => (
                        <TableRow key={lanc.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedLancamentos.includes(lanc.id)}
                              onCheckedChange={() => toggleSelectLancamento(lanc.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant={lanc.tipo_transacao === 'receita' ? 'default' : 'secondary'} className={lanc.tipo_transacao === 'receita' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}>
                              {lanc.tipo_transacao === 'receita' ? 'Receita' : 'Despesa'}
                            </Badge>
                          </TableCell>
                          <TableCell>{format(parseISO(lanc.data), "dd/MM/yyyy")}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: lanc.categoria?.cor }}
                              />
                              {lanc.categoria?.nome}
                            </div>
                          </TableCell>
                          <TableCell>{lanc.descricao || "-"}</TableCell>
                          <TableCell className={`font-medium ${lanc.tipo_transacao === 'receita' ? 'text-green-500' : ''}`}>
                            {lanc.tipo_transacao === 'receita' ? '+' : '-'}{formatCurrency(lanc.valor)}
                          </TableCell>
                          <TableCell>
                            {lanc.recorrente ? (
                              <Badge variant="outline">
                                {lanc.frequencia_recorrencia 
                                  ? lanc.frequencia_recorrencia.charAt(0).toUpperCase() + lanc.frequencia_recorrencia.slice(1)
                                  : 'Sim'}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEditLancamento(lanc)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteLancamento(lanc.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {lancamentosFiltrados.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            {filtroTipoLancamento === 'todos' 
                              ? 'Nenhum lançamento neste mês'
                              : `Nenhuma ${filtroTipoLancamento === 'receita' ? 'receita' : 'despesa'} neste mês`}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* METAS FINANCEIRAS TAB */}
            <TabsContent value="metas" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Metas Financeiras</h2>
                  <p className="text-sm text-muted-foreground">
                    Defina e acompanhe suas metas de receitas, despesas, reservas e investimentos
                  </p>
                </div>
                <Dialog open={metaDialog} onOpenChange={setMetaDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => resetMetaForm()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Meta
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingMeta ? "Editar" : "Nova"} Meta Financeira</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Tipo de Meta</Label>
                        <Select value={metaTipo} onValueChange={(v: 'receita' | 'despesa' | 'reserva' | 'investimento') => setMetaTipo(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_META.map((tipo) => (
                              <SelectItem key={tipo.value} value={tipo.value}>
                                <div className="flex items-center gap-2">
                                  <tipo.icon className={`h-4 w-4 ${tipo.color}`} />
                                  {tipo.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Nome da Meta</Label>
                        <Input
                          value={metaNome}
                          onChange={(e) => setMetaNome(e.target.value)}
                          placeholder="Ex: Reserva de emergência"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Valor Alvo (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={metaValorAlvo}
                            onChange={(e) => setMetaValorAlvo(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <Label>Valor Atual (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={metaValorAtual}
                            onChange={(e) => setMetaValorAtual(Number(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Data Início</Label>
                          <Input
                            type="date"
                            value={metaDataInicio}
                            onChange={(e) => setMetaDataInicio(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Data Fim (opcional)</Label>
                          <Input
                            type="date"
                            value={metaDataFim}
                            onChange={(e) => setMetaDataFim(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Descrição (opcional)</Label>
                        <Input
                          value={metaDescricao}
                          onChange={(e) => setMetaDescricao(e.target.value)}
                          placeholder="Ex: Acumular 6 meses de despesas"
                        />
                      </div>
                      <div>
                        <Label>Cor</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="color"
                            value={metaCor}
                            onChange={(e) => setMetaCor(e.target.value)}
                            className="w-16 h-10 p-1"
                          />
                          <Input
                            value={metaCor}
                            onChange={(e) => setMetaCor(e.target.value)}
                            placeholder="#000000"
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={resetMetaForm}>
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveMeta}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Cards de resumo por tipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {TIPOS_META.map((tipo) => {
                  const metasDoTipo = metasFinanceiras.filter(m => m.tipo === tipo.value && m.is_active);
                  const totalAlvo = metasDoTipo.reduce((sum, m) => sum + m.valor_alvo, 0);
                  const totalAtual = metasDoTipo.reduce((sum, m) => sum + m.valor_atual, 0);
                  const progresso = totalAlvo > 0 ? (totalAtual / totalAlvo) * 100 : 0;
                  
                  return (
                    <Card key={tipo.value} className="border-l-4" style={{ borderLeftColor: tipo.color.includes('green') ? '#22C55E' : tipo.color.includes('red') ? '#EF4444' : tipo.color.includes('blue') ? '#3B82F6' : '#A855F7' }}>
                      <CardHeader className="pb-2">
                        <CardTitle className={`text-sm flex items-center gap-2 ${tipo.color}`}>
                          <tipo.icon className="h-4 w-4" />
                          {tipo.label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg font-bold">
                          {formatCurrency(totalAtual)} / {formatCurrency(totalAlvo)}
                        </div>
                        <Progress value={Math.min(progresso, 100)} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {metasDoTipo.length} meta(s) - {progresso.toFixed(1)}%
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Lista de metas */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Progresso</TableHead>
                        <TableHead>Valor Atual</TableHead>
                        <TableHead>Valor Alvo</TableHead>
                        <TableHead>Prazo</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metasFinanceiras.map((meta) => {
                        const tipoInfo = TIPOS_META.find(t => t.value === meta.tipo);
                        const progresso = meta.valor_alvo > 0 ? (meta.valor_atual / meta.valor_alvo) * 100 : 0;
                        
                        return (
                          <TableRow key={meta.id}>
                            <TableCell>
                              <Badge variant="outline" className={tipoInfo?.color}>
                                {tipoInfo?.label || meta.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded" style={{ backgroundColor: meta.cor }} />
                                <span className="font-medium">{meta.nome}</span>
                              </div>
                              {meta.descricao && (
                                <p className="text-xs text-muted-foreground">{meta.descricao}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="w-24">
                                <Progress value={Math.min(progresso, 100)} />
                                <p className="text-xs text-muted-foreground mt-1">{progresso.toFixed(1)}%</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">{formatCurrency(meta.valor_atual)}</TableCell>
                            <TableCell>{formatCurrency(meta.valor_alvo)}</TableCell>
                            <TableCell>
                              {meta.data_fim ? format(parseISO(meta.data_fim), "dd/MM/yyyy") : "Sem prazo"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEditMeta(meta)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteMeta(meta.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {metasFinanceiras.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhuma meta financeira cadastrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* PROJEÇÃO TAB */}
            <TabsContent value="projecao" className="space-y-6">
              <h2 className="text-xl font-semibold">Projeção Mensal</h2>

              {(metricas?.sobra_calculada || 0) - (metricas?.previsao_fim_mes || 0) < 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Alerta: Saldo Negativo Previsto</AlertTitle>
                  <AlertDescription>
                    Com base nos seus gastos atuais, você pode terminar o mês com saldo negativo.
                    Considere reduzir gastos ou aumentar sua receita.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      Previsão de Gastos
                    </CardTitle>
                    <CardDescription>Baseado na média dos últimos 7 dias</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(metricas?.previsao_fim_mes || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PiggyBank className="h-5 w-5 text-green-500" />
                      Saldo Previsto
                    </CardTitle>
                    <CardDescription>Sobra - Previsão de gastos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold ${(metricas?.sobra_calculada || 0) - (metricas?.previsao_fim_mes || 0) < 0 ? "text-red-500" : "text-green-500"}`}>
                      {formatCurrency((metricas?.sobra_calculada || 0) - (metricas?.previsao_fim_mes || 0))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas do Mês</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Salário Mensal</span>
                    <span className="font-bold">{formatCurrency(metricas?.salario_mensal || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Total Gasto até Agora</span>
                    <span className="font-bold">{formatCurrency(totalDespesas)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Sobra Atual</span>
                    <span className="font-bold">{formatCurrency(metricas?.sobra_calculada || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Média Diária (7 dias)</span>
                    <span className="font-bold">{formatCurrency(metricas?.media_7_dias || 0)}</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* CONFIG TAB */}
            <TabsContent value="config" className="space-y-6">
              <h2 className="text-xl font-semibold">Configurações</h2>

              <Card>
                <CardHeader>
                  <CardTitle>Dados do Orçamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Salário Mensal (R$)</Label>
                    <Input
                      type="number"
                      value={salarioMensal}
                      onChange={(e) => setSalarioMensal(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Modelo de Orçamento</Label>
                    <Select value={modeloOrcamento} onValueChange={setModeloOrcamento}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50/30/20">50/30/20 (Essenciais/Desejos/Poupança)</SelectItem>
                        <SelectItem value="30/30/40">30/30/40 (Equilibrado)</SelectItem>
                        <SelectItem value="personalizado">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveConfig}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Salvar Configurações
                    </Button>
                    <Button variant="outline" onClick={handleApplyBudgetModel}>
                      <Target className="h-4 w-4 mr-2" />
                      Aplicar Modelo às Categorias
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* EXPORTAR TAB */}
            <TabsContent value="exportar" className="space-y-6">
              <h2 className="text-xl font-semibold">Importar e Exportar Dados</h2>

              {/* Import Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Importar Planilha
                  </CardTitle>
                  <CardDescription>
                    Importe lançamentos de receitas e despesas através de uma planilha Excel ou CSV
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleDownloadTemplate}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Baixar Modelo
                    </Button>
                    <div className="relative">
                      <Input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Button>
                        <Upload className="h-4 w-4 mr-2" />
                        Selecionar Arquivo
                      </Button>
                    </div>
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Formato da Planilha</AlertTitle>
                    <AlertDescription>
                      Use as colunas: Data, Valor, Tipo (receita/despesa), Categoria, Descricao, Recorrente (Sim/Não), Frequencia (semanal/quinzenal/mensal/anual)
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Export Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Exportar CSV
                    </CardTitle>
                    <CardDescription>
                      Baixe seus lançamentos em formato CSV para análise em planilhas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleExportCSV} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Baixar CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Exportar PDF
                    </CardTitle>
                    <CardDescription>
                      Gere um relatório PDF elegante com gráficos e resumo financeiro
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={handleExportPDF} className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      Gerar Relatório PDF
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Import Dialog */}
              <Dialog open={importDialog} onOpenChange={setImportDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Confirmar Importação</DialogTitle>
                    <DialogDescription>
                      Verifique os dados antes de importar. {importData.filter(d => d.valid).length} de {importData.length} registros válidos.
                    </DialogDescription>
                  </DialogHeader>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importData.slice(0, 50).map((item) => (
                        <TableRow key={item.index} className={!item.valid ? "bg-destructive/10" : ""}>
                          <TableCell>{item.data}</TableCell>
                          <TableCell>{formatCurrency(item.valor)}</TableCell>
                          <TableCell>
                            <Badge variant={item.tipo === "receita" ? "default" : "secondary"}>
                              {item.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.categoria}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{item.descricao}</TableCell>
                          <TableCell>
                            {item.valid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {importData.length > 50 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Mostrando 50 de {importData.length} registros
                    </p>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setImportDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleConfirmImport} disabled={importLoading || importData.filter(d => d.valid).length === 0}>
                      {importLoading ? "Importando..." : `Importar ${importData.filter(d => d.valid).length} Registros`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </SidebarProvider>
  );
}
