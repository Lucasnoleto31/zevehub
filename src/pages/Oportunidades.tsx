import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Trophy,
  Layers,
  Search,
  Calendar as CalendarIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Target,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Opportunity {
  id: string;
  user_id: string;
  titulo: string;
  tipo: string;
  ativo: string;
  entrada: number;
  alvos: number[];
  stop: number;
  resultado: string;
  descricao: string | null;
  data: string;
  created_at: string;
}

interface FormData {
  titulo: string;
  tipo: string;
  ativo: string;
  entrada: string;
  alvos: string[];
  stop: string;
  resultado: string;
  descricao: string;
}

const TIPOS = ["Day Trade", "Swing Trade", "Position"];
const RESULTADOS = ["Gain", "Stop", "Em aberto"];
const ATIVOS = ["WIN", "WDO", "PETR4", "VALE3", "ITUB4", "BBDC4", "ABEV3", "B3SA3", "MGLU3", "WEGE3"];
const COLORS = ["hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--warning))", "hsl(var(--primary))", "hsl(var(--accent))"];

export default function Oportunidades() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  
  // Filters
  const [filterTipo, setFilterTipo] = useState<string>("");
  const [filterAtivo, setFilterAtivo] = useState<string>("");
  const [filterResultado, setFilterResultado] = useState<string>("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>();
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>();
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    titulo: "",
    tipo: "",
    ativo: "",
    entrada: "",
    alvos: [""],
    stop: "",
    resultado: "Em aberto",
    descricao: "",
  });

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [opportunities, filterTipo, filterAtivo, filterResultado, filterSearch, filterStartDate, filterEndDate]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: adminCheck } = await supabase.rpc("is_admin", { _user_id: session.user.id });
    setIsAdmin(adminCheck || false);
    
    await loadOpportunities();
    setLoading(false);
  };

  const loadOpportunities = async () => {
    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .order("data", { ascending: false });
    
    if (error) {
      toast.error("Erro ao carregar oportunidades");
      return;
    }
    
    setOpportunities(data || []);
  };

  const applyFilters = () => {
    let filtered = [...opportunities];
    
    if (filterTipo) {
      filtered = filtered.filter(o => o.tipo === filterTipo);
    }
    if (filterAtivo) {
      filtered = filtered.filter(o => o.ativo === filterAtivo);
    }
    if (filterResultado) {
      filtered = filtered.filter(o => o.resultado === filterResultado);
    }
    if (filterSearch) {
      filtered = filtered.filter(o => 
        o.titulo.toLowerCase().includes(filterSearch.toLowerCase())
      );
    }
    if (filterStartDate) {
      filtered = filtered.filter(o => new Date(o.data) >= filterStartDate);
    }
    if (filterEndDate) {
      filtered = filtered.filter(o => new Date(o.data) <= filterEndDate);
    }
    
    setFilteredOpportunities(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterTipo("");
    setFilterAtivo("");
    setFilterResultado("");
    setFilterSearch("");
    setFilterStartDate(undefined);
    setFilterEndDate(undefined);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      titulo: "",
      tipo: "",
      ativo: "",
      entrada: "",
      alvos: [""],
      stop: "",
      resultado: "Em aberto",
      descricao: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (opp: Opportunity) => {
    setEditingId(opp.id);
    setFormData({
      titulo: opp.titulo,
      tipo: opp.tipo,
      ativo: opp.ativo,
      entrada: String(opp.entrada),
      alvos: opp.alvos.length > 0 ? opp.alvos.map(String) : [""],
      stop: String(opp.stop),
      resultado: opp.resultado,
      descricao: opp.descricao || "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.titulo || !formData.tipo || !formData.ativo || !formData.entrada || !formData.stop) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    const payload = {
      user_id: session!.user.id,
      titulo: formData.titulo,
      tipo: formData.tipo,
      ativo: formData.ativo,
      entrada: parseFloat(formData.entrada),
      alvos: formData.alvos.filter(a => a).map(a => parseFloat(a)),
      stop: parseFloat(formData.stop),
      resultado: formData.resultado,
      descricao: formData.descricao || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("opportunities")
        .update(payload)
        .eq("id", editingId);
      
      if (error) {
        toast.error("Erro ao atualizar operação");
        setSaving(false);
        return;
      }
      toast.success("Operação atualizada!");
    } else {
      const { error } = await supabase
        .from("opportunities")
        .insert(payload);
      
      if (error) {
        toast.error("Erro ao criar operação");
        setSaving(false);
        return;
      }
      toast.success("Operação criada!");
    }

    setSaving(false);
    setModalOpen(false);
    loadOpportunities();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta operação?")) return;
    
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir operação");
      return;
    }
    toast.success("Operação excluída!");
    loadOpportunities();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Excluir ${selectedIds.length} operação(ões) selecionada(s)?`)) return;
    
    const { error } = await supabase.from("opportunities").delete().in("id", selectedIds);
    if (error) {
      toast.error("Erro ao excluir operações");
      return;
    }
    toast.success("Operações excluídas!");
    setSelectedIds([]);
    loadOpportunities();
  };

  const toggleSelectAll = () => {
    const pageItems = paginatedData.map(o => o.id);
    if (pageItems.every(id => selectedIds.includes(id))) {
      setSelectedIds(selectedIds.filter(id => !pageItems.includes(id)));
    } else {
      setSelectedIds([...new Set([...selectedIds, ...pageItems])]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Dashboard calculations
  const totalOp = filteredOpportunities.length;
  const gains = filteredOpportunities.filter(o => o.resultado === "Gain").length;
  const stops = filteredOpportunities.filter(o => o.resultado === "Stop").length;
  const winRate = totalOp > 0 ? ((gains / (gains + stops)) * 100).toFixed(1) : "0";
  
  const lucroAcumulado = filteredOpportunities.reduce((acc, opp) => {
    if (opp.resultado === "Gain" && opp.alvos.length > 0) {
      return acc + (opp.alvos[0] - opp.entrada);
    } else if (opp.resultado === "Stop") {
      return acc - (opp.entrada - opp.stop);
    }
    return acc;
  }, 0);

  // Chart data
  const equityCurve = filteredOpportunities
    .filter(o => o.resultado !== "Em aberto")
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
    .reduce((acc: { data: string; resultadoAcumulado: number }[], opp, index) => {
      const prev = acc[index - 1]?.resultadoAcumulado || 0;
      let result = 0;
      if (opp.resultado === "Gain" && opp.alvos.length > 0) {
        result = opp.alvos[0] - opp.entrada;
      } else if (opp.resultado === "Stop") {
        result = -(opp.entrada - opp.stop);
      }
      acc.push({
        data: format(parseISO(opp.data), "dd/MM", { locale: ptBR }),
        resultadoAcumulado: prev + result,
      });
      return acc;
    }, []);

  const resultadoPorAtivo = ATIVOS.map(ativo => {
    const ativoOps = filteredOpportunities.filter(o => o.ativo === ativo);
    const ativoGains = ativoOps.filter(o => o.resultado === "Gain").length;
    const ativoStops = ativoOps.filter(o => o.resultado === "Stop").length;
    return { ativo, gains: ativoGains, stops: ativoStops };
  }).filter(d => d.gains > 0 || d.stops > 0);

  const distribuicaoTipos = TIPOS.map(tipo => ({
    name: tipo,
    value: filteredOpportunities.filter(o => o.tipo === tipo).length,
  })).filter(d => d.value > 0);

  // Pagination
  const totalPages = Math.ceil(filteredOpportunities.length / pageSize);
  const paginatedData = filteredOpportunities.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-accent/5 to-background relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="particle absolute top-20 left-10 w-2 h-2 bg-primary/20 rounded-full" />
          <div className="particle absolute top-40 right-20 w-3 h-3 bg-success/20 rounded-full" />
          <div className="particle absolute bottom-40 left-1/4 w-2 h-2 bg-warning/20 rounded-full" />
          <div className="glow-orb absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
          <div className="glow-orb absolute -bottom-40 -left-40 w-80 h-80 bg-success/5 rounded-full blur-3xl" />
        </div>

        <AppSidebar isAdmin={isAdmin} />
        
        <main className="flex-1 p-6 overflow-auto relative z-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Oportunidades</h1>
                <p className="text-muted-foreground">
                  Operações lançadas pelos administradores para os clientes
                </p>
              </div>
            </div>
            {isAdmin && (
              <Button onClick={openCreateModal} className="gap-2">
                <Plus className="w-4 h-4" />
                Cadastrar Operação
              </Button>
            )}
          </div>

          {/* Filters */}
          <Card className="mb-6 border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <Select value={filterTipo} onValueChange={setFilterTipo}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Tipo de Operação" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterAtivo} onValueChange={setFilterAtivo}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Ativo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ATIVOS.map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterResultado} onValueChange={setFilterResultado}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Resultado" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESULTADOS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start bg-background/50">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterStartDate ? format(filterStartDate, "dd/MM/yy") : "Data início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={filterStartDate} onSelect={setFilterStartDate} locale={ptBR} />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start bg-background/50">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filterEndDate ? format(filterEndDate, "dd/MM/yy") : "Data fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={filterEndDate} onSelect={setFilterEndDate} locale={ptBR} />
                  </PopoverContent>
                </Popover>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="pl-9 bg-background/50"
                  />
                </div>
              </div>
              
              {(filterTipo || filterAtivo || filterResultado || filterSearch || filterStartDate || filterEndDate) && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-3 gap-1">
                  <X className="w-4 h-4" />
                  Limpar filtros
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold text-success">{winRate}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-success/10">
                    <Trophy className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Operações</p>
                    <p className="text-2xl font-bold text-foreground">{totalOp}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Layers className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Lucro Acumulado</p>
                    <p className={`text-2xl font-bold ${lucroAcumulado >= 0 ? "text-success" : "text-destructive"}`}>
                      {formatCurrency(lucroAcumulado)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${lucroAcumulado >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                    <TrendingUp className={`w-6 h-6 ${lucroAcumulado >= 0 ? "text-success" : "text-destructive"}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Curva de Performance</CardTitle>
                <CardDescription>Resultado acumulado ao longo do tempo</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="data" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="resultadoAcumulado"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Resultados por Ativo</CardTitle>
                <CardDescription>Gains vs Stops por ativo</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={resultadoPorAtivo}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="ativo" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="gains" name="Gains" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="stops" name="Stops" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Distribuição por Tipo</CardTitle>
                <CardDescription>Day Trade, Swing Trade, Position</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={distribuicaoTipos}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {distribuicaoTipos.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Resumo de Resultados</CardTitle>
                <CardDescription>Gain vs Stop total</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-success/10">
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-success" />
                      <span className="font-medium">Gains</span>
                    </div>
                    <span className="text-2xl font-bold text-success">{gains}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10">
                    <div className="flex items-center gap-3">
                      <X className="w-5 h-5 text-destructive" />
                      <span className="font-medium">Stops</span>
                    </div>
                    <span className="text-2xl font-bold text-destructive">{stops}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-warning/10">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-warning" />
                      <span className="font-medium">Em Aberto</span>
                    </div>
                    <span className="text-2xl font-bold text-warning">
                      {filteredOpportunities.filter(o => o.resultado === "Em aberto").length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Table */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Operações Lançadas</CardTitle>
                <CardDescription>{filteredOpportunities.length} operação(ões) encontrada(s)</CardDescription>
              </div>
              {isAdmin && selectedIds.length > 0 && (
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  Excluir Selecionados ({selectedIds.length})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      {isAdmin && (
                        <TableHead className="w-12">
                          <Checkbox
                            checked={paginatedData.length > 0 && paginatedData.every(o => selectedIds.includes(o.id))}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                      )}
                      <TableHead>Data</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Alvos</TableHead>
                      <TableHead>Stop</TableHead>
                      <TableHead>Resultado</TableHead>
                      {isAdmin && <TableHead className="w-24">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAdmin ? 10 : 8} className="text-center py-8 text-muted-foreground">
                          Nenhuma operação encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((opp) => (
                        <TableRow key={opp.id} className="hover:bg-muted/20">
                          {isAdmin && (
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.includes(opp.id)}
                                onCheckedChange={() => toggleSelect(opp.id)}
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{formatDate(opp.data)}</TableCell>
                          <TableCell>{opp.titulo}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{opp.tipo}</Badge>
                          </TableCell>
                          <TableCell className="font-mono">{opp.ativo}</TableCell>
                          <TableCell className="font-mono">{opp.entrada.toFixed(2)}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {opp.alvos.map(a => a.toFixed(2)).join(" / ")}
                          </TableCell>
                          <TableCell className="font-mono text-destructive">{opp.stop.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                opp.resultado === "Gain"
                                  ? "bg-success/20 text-success border-success/30"
                                  : opp.resultado === "Stop"
                                  ? "bg-destructive/20 text-destructive border-destructive/30"
                                  : "bg-warning/20 text-warning border-warning/30"
                              }
                            >
                              {opp.resultado}
                            </Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openEditModal(opp)}
                                  className="h-8 w-8"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(opp.id)}
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        {/* Create/Edit Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Operação" : "Cadastrar Operação"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Título *</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Compra WIN rompimento"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Tipo de Operação *</Label>
                  <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Ativo *</Label>
                  <Select value={formData.ativo} onValueChange={(v) => setFormData({ ...formData, ativo: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {ATIVOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Preço Entrada *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.entrada}
                    onChange={(e) => setFormData({ ...formData, entrada: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Stop (SL) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.stop}
                    onChange={(e) => setFormData({ ...formData, stop: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Alvos (TP)</Label>
                {formData.alvos.map((alvo, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={alvo}
                      onChange={(e) => {
                        const newAlvos = [...formData.alvos];
                        newAlvos[index] = e.target.value;
                        setFormData({ ...formData, alvos: newAlvos });
                      }}
                      placeholder={`Alvo ${index + 1}`}
                    />
                    {formData.alvos.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newAlvos = formData.alvos.filter((_, i) => i !== index);
                          setFormData({ ...formData, alvos: newAlvos });
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData({ ...formData, alvos: [...formData.alvos, ""] })}
                  className="w-fit"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar Alvo
                </Button>
              </div>

              {editingId && (
                <div className="grid gap-2">
                  <Label>Resultado da Operação</Label>
                  <Select value={formData.resultado} onValueChange={(v) => setFormData({ ...formData, resultado: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESULTADOS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Detalhes da operação..."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? "Salvar Alterações" : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}