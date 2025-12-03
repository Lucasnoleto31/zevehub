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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, startOfMonth, endOfMonth, getDaysInMonth, differenceInDays, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Wallet, Plus, Pencil, Trash2, Download, FileText, AlertTriangle, 
  TrendingUp, TrendingDown, Calendar, Target, DollarSign, PiggyBank,
  LayoutDashboard, ListChecks, Settings, FileDown, AlertCircle, CheckCircle2, Tag, Upload, FileSpreadsheet
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

const CORES_CATEGORIAS = [
  "#06B6D4", "#8B5CF6", "#EC4899", "#F97316", "#22C55E", 
  "#EAB308", "#EF4444", "#3B82F6", "#14B8A6", "#A855F7"
];

const TIPOS_CATEGORIA_PADRAO = [
  { value: "essencial", label: "Essencial" },
  { value: "nao_essencial", label: "Não Essencial" },
  { value: "lazer", label: "Lazer" },
  { value: "educacao", label: "Educação" },
  { value: "saude", label: "Saúde" },
  { value: "outros", label: "Outros" },
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

  // Form states
  const [categoriaDialog, setCategoriaDialog] = useState(false);
  const [lancamentoDialog, setLancamentoDialog] = useState(false);
  const [tipoDialog, setTipoDialog] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(null);
  const [editingTipo, setEditingTipo] = useState<string | null>(null);
  const [novoNomeTipo, setNovoNomeTipo] = useState("");

  // Form fields
  const [categoriaNome, setCategoriaNome] = useState("");
  const [categoriaTipo, setCategoriaTipo] = useState("essencial");
  const [categoriaTipoCustom, setCategoriaTipoCustom] = useState("");
  const [categoriaCor, setCategoriaCor] = useState("#06B6D4");
  const [categoriaPercentual, setCategoriaPercentual] = useState(0);
  const [categoriaMetaValor, setCategoriaMetaValor] = useState(0);

  const [lancamentoData, setLancamentoData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [lancamentoValor, setLancamentoValor] = useState(0);
  const [lancamentoCategoriaId, setLancamentoCategoriaId] = useState("");
  const [lancamentoDescricao, setLancamentoDescricao] = useState("");
  const [lancamentoRecorrente, setLancamentoRecorrente] = useState(false);
  const [lancamentoTipoTransacao, setLancamentoTipoTransacao] = useState<'receita' | 'despesa'>('despesa');
  const [lancamentoFrequencia, setLancamentoFrequencia] = useState<'semanal' | 'quinzenal' | 'mensal' | 'anual' | ''>('');

  const [salarioMensal, setSalarioMensal] = useState(0);
  const [modeloOrcamento, setModeloOrcamento] = useState("50/30/20");

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

  // Cálculos
  const totalGastoHoje = useMemo(() => {
    const hoje = format(new Date(), "yyyy-MM-dd");
    return lancamentos
      .filter((l) => l.data === hoje)
      .reduce((sum, l) => sum + l.valor, 0);
  }, [lancamentos]);

  const totalGastoMes = useMemo(() => {
    return lancamentos.reduce((sum, l) => sum + l.valor, 0);
  }, [lancamentos]);

  const sobraParaGastarHoje = useMemo(() => {
    return (metricas?.valor_diario_meta || 0) - totalGastoHoje;
  }, [metricas, totalGastoHoje]);

  const gastosPorCategoria = useMemo(() => {
    const gastos: Record<string, { nome: string; valor: number; cor: string }> = {};
    lancamentos.forEach((l) => {
      const cat = l.categoria;
      if (cat) {
        if (!gastos[cat.id]) {
          gastos[cat.id] = { nome: cat.nome, valor: 0, cor: cat.cor };
        }
        gastos[cat.id].valor += l.valor;
      }
    });
    return Object.values(gastos);
  }, [lancamentos]);

  const gastosDiarios = useMemo(() => {
    const diasNoMes = getDaysInMonth(new Date());
    const gastos: Record<string, number> = {};
    
    for (let i = 1; i <= diasNoMes; i++) {
      const dia = format(new Date(new Date().getFullYear(), new Date().getMonth(), i), "yyyy-MM-dd");
      gastos[dia] = 0;
    }

    lancamentos.forEach((l) => {
      if (gastos[l.data] !== undefined) {
        gastos[l.data] += l.valor;
      }
    });

    return Object.entries(gastos).map(([data, valor]) => ({
      data: format(parseISO(data), "dd"),
      valor,
    }));
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

  // Funções CRUD
  const handleSaveCategoria = async () => {
    if (!user || !categoriaNome) return;

    const tipoFinal = categoriaTipo === "custom" ? categoriaTipoCustom : categoriaTipo;
    
    const categoriaData = {
      nome: categoriaNome,
      tipo: tipoFinal,
      cor: categoriaCor,
      percentual_meta: categoriaPercentual,
      meta_valor: categoriaMetaValor,
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

  const handleRenameTipo = async () => {
    if (!user || !editingTipo || !novoNomeTipo.trim()) return;

    // Update all categories with the old tipo name to the new name
    await supabase
      .from("categorias_financas")
      .update({ tipo: novoNomeTipo.trim() })
      .eq("user_id", user.id)
      .eq("tipo", editingTipo);

    toast({ title: "Tipo renomeado com sucesso" });
    setTipoDialog(false);
    setEditingTipo(null);
    setNovoNomeTipo("");
    loadData();
  };

  const openEditTipo = (tipo: string) => {
    setEditingTipo(tipo);
    setNovoNomeTipo(tipo);
    setTipoDialog(true);
  };

  const handleDeleteTipo = async (tipo: string) => {
    if (!user) return;

    // Check if tipo is a default one
    const isDefaultTipo = TIPOS_CATEGORIA_PADRAO.some(t => t.value === tipo);
    if (isDefaultTipo) {
      toast({ title: "Tipos padrão não podem ser excluídos", variant: "destructive" });
      return;
    }

    // Check if any category uses this tipo
    const categoriasUsandoTipo = categorias.filter(c => c.tipo === tipo);
    if (categoriasUsandoTipo.length > 0) {
      toast({ 
        title: "Tipo em uso", 
        description: `${categoriasUsandoTipo.length} categoria(s) usa(m) este tipo. Remova ou altere as categorias primeiro.`,
        variant: "destructive" 
      });
      return;
    }

    toast({ title: "Tipo removido com sucesso" });
  };

  const getTipoUsageCount = (tipo: string) => {
    return categorias.filter(c => c.tipo === tipo).length;
  };

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

    const totalGastos = lancamentosData?.reduce((sum, l) => sum + l.valor, 0) || 0;
    const sobra = (metricas.salario_mensal || 0) - totalGastos;
    
    const diasRestantes = differenceInDays(endOfMonth(new Date()), new Date()) + 1;
    const metaDiaria = diasRestantes > 0 ? sobra / diasRestantes : 0;

    // Média últimos 7 dias
    const seteDiasAtras = format(subDays(new Date(), 7), "yyyy-MM-dd");
    const { data: lancamentos7Dias } = await supabase
      .from("lancamentos_financas")
      .select("*")
      .eq("user_id", user.id)
      .gte("data", seteDiasAtras);

    const media7Dias = lancamentos7Dias && lancamentos7Dias.length > 0
      ? lancamentos7Dias.reduce((sum, l) => sum + l.valor, 0) / 7
      : 0;

    const previsaoFimMes = media7Dias * getDaysInMonth(new Date());

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
    doc.text(`Total Gasto: R$ ${totalGastoMes.toFixed(2)}`, 14, 48);
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
        // Create new category
        const { data: newCat } = await supabase
          .from("categorias_financas")
          .insert({
            nome: item.categoria,
            tipo: item.tipo,
            cor: CORES_CATEGORIAS[Math.floor(Math.random() * CORES_CATEGORIAS.length)],
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

  const openEditCategoria = (cat: Categoria) => {
    setEditingCategoria(cat);
    setCategoriaNome(cat.nome);
    
    // Check if tipo is a predefined one or custom
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
    setCategoriaDialog(true);
  };

  const openEditLancamento = (lanc: Lancamento) => {
    setEditingLancamento(lanc);
    setLancamentoData(lanc.data);
    setLancamentoValor(lanc.valor);
    setLancamentoCategoriaId(lanc.categoria_id);
    setLancamentoDescricao(lanc.descricao || "");
    setLancamentoRecorrente(lanc.recorrente);
    setLancamentoTipoTransacao(lanc.tipo_transacao || 'despesa');
    setLancamentoFrequencia(lanc.frequencia_recorrencia || '');
    setLancamentoDialog(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
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
            <TabsList className="grid grid-cols-6 w-full max-w-4xl">
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

              {/* Segunda linha de métricas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <PiggyBank className="h-4 w-4" />
                      Previsão Fim de Mês
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(metricas?.previsao_fim_mes || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Saldo Previsto
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${(metricas?.sobra_calculada || 0) - (metricas?.previsao_fim_mes || 0) < 0 ? "text-red-500" : "text-green-500"}`}>
                      {formatCurrency((metricas?.sobra_calculada || 0) - (metricas?.previsao_fim_mes || 0))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total Gasto no Mês</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalGastoMes)}</div>
                    <Progress 
                      value={metricas?.salario_mensal ? (totalGastoMes / metricas.salario_mensal) * 100 : 0} 
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Gastos por Categoria</CardTitle>
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
                    <CardTitle>Gastos Diários</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={gastosDiarios}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="data" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Line 
                            type="monotone" 
                            dataKey="valor" 
                            stroke="#8B5CF6" 
                            strokeWidth={2}
                            dot={{ fill: "#8B5CF6" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* CATEGORIAS TAB */}
            <TabsContent value="categorias" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Categorias de Gastos</h2>
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
                        <Label>Nome</Label>
                        <Input
                          value={categoriaNome}
                          onChange={(e) => setCategoriaNome(e.target.value)}
                          placeholder="Ex: Alimentação"
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
                        <Label>Percentual da Meta (%)</Label>
                        <Input
                          type="number"
                          value={categoriaPercentual}
                          onChange={(e) => setCategoriaPercentual(Number(e.target.value))}
                        />
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

              <Card>
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
                      {categorias.map((cat) => (
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
                      {categorias.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhuma categoria cadastrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Gerenciador de Tipos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Gerenciar Tipos
                  </CardTitle>
                  <CardDescription>
                    Renomeie ou exclua tipos de categoria (tipos em uso não podem ser excluídos)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {tiposCategoria.map((tipo) => {
                      const usageCount = getTipoUsageCount(tipo.value);
                      const isDefault = TIPOS_CATEGORIA_PADRAO.some(t => t.value === tipo.value);
                      return (
                        <div key={tipo.value} className="flex items-center gap-1 bg-secondary rounded-md px-2 py-1">
                          <span className="text-sm">{tipo.label}</span>
                          <Badge variant="outline" className="text-xs ml-1">
                            {usageCount}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => openEditTipo(tipo.value)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {!isDefault && usageCount === 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteTipo(tipo.value)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Dialog para renomear tipo */}
              <Dialog open={tipoDialog} onOpenChange={setTipoDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Renomear Tipo</DialogTitle>
                    <DialogDescription>
                      Todas as categorias com o tipo "{editingTipo}" serão atualizadas.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Novo nome do tipo</Label>
                      <Input
                        value={novoNomeTipo}
                        onChange={(e) => setNovoNomeTipo(e.target.value)}
                        placeholder="Digite o novo nome"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setTipoDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleRenameTipo}>Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* LANCAMENTOS TAB */}
            <TabsContent value="lancamentos" className="space-y-6">
              <div className="flex justify-between items-center">
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
                        <Label>Categoria</Label>
                        <Select value={lancamentoCategoriaId} onValueChange={setLancamentoCategoriaId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {categorias.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.cor }} />
                                  {cat.nome}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <Button onClick={handleSaveLancamento}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                      {lancamentos.map((lanc) => (
                        <TableRow key={lanc.id}>
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
                      {lancamentos.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhum lançamento neste mês
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
                    <span className="font-bold">{formatCurrency(totalGastoMes)}</span>
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
