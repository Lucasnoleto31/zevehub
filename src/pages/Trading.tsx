import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PremiumPageLayout, PremiumCard, PremiumSection } from "@/components/layout/PremiumPageLayout";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Target, 
  BarChart3, 
  Calendar,
  Clock,
  DollarSign,
  Activity,
  Zap,
  Upload,
  PieChart,
  FileSpreadsheet,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  Area,
  AreaChart
} from "recharts";

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

interface ProfitOperation {
  id: string;
  user_id: string;
  account_number: string | null;
  holder_name: string | null;
  import_date: string | null;
  asset: string;
  open_time: string;
  close_time: string;
  duration: string | null;
  buy_qty: number | null;
  sell_qty: number | null;
  side: string | null;
  buy_price: number | null;
  sell_price: number | null;
  market_price: number | null;
  operation_result: number | null;
  operation_result_percent: number | null;
  total: number | null;
  created_at: string;
  strategy_id: string | null;
}

interface Strategy {
  id: string;
  name: string;
  description: string | null;
}

const Trading = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [showStrategyDialog, setShowStrategyDialog] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<any[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("");
  const [newStrategyName, setNewStrategyName] = useState("");
  const [isCreatingNewStrategy, setIsCreatingNewStrategy] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  // Fetch strategies
  const { data: strategies = [] } = useQuery({
    queryKey: ['strategies', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Strategy[];
    },
    enabled: !!userId,
  });

  // Fetch operations
  const { data: operations = [], isLoading: loadingOperations } = useQuery({
    queryKey: ['profit-operations', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('profit_operations')
        .select('*')
        .eq('user_id', userId)
        .order('open_time', { ascending: false });
      
      if (error) throw error;
      return data as ProfitOperation[];
    },
    enabled: !!userId,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('profit_operations')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profit-operations'] });
      toast.success('Operação deletada com sucesso');
    },
    onError: () => {
      toast.error('Erro ao deletar operação');
    },
  });

  // Delete all mutation
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profit_operations')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profit-operations'] });
      toast.success('Todas as operações foram deletadas');
    },
    onError: () => {
      toast.error('Erro ao deletar operações');
    },
  });

  const parseCSV = (content: string): any[] => {
    const lines = content.split('\n').filter(line => line.trim());
    const operations: any[] = [];
    
    // Extract header info
    let accountNumber = '';
    let holderName = '';
    let importDate = '';
    
    let dataStartIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('Conta:')) {
        accountNumber = line.replace('Conta:', '').trim();
      } else if (line.startsWith('Titular:')) {
        holderName = line.replace('Titular:', '').trim();
      } else if (line.startsWith('Data:')) {
        importDate = line.replace('Data:', '').trim();
      } else if (line.includes('Ativo;Abertura;')) {
        dataStartIndex = i + 1;
        break;
      }
    }

    // Parse data rows
    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split(';');
      if (cols.length < 21) continue;

      const parseNumber = (val: string): number | null => {
        if (!val || val === '-' || val === ' - ') return null;
        const cleaned = val.replace(/\./g, '').replace(',', '.').trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      };

      const parseDateTime = (val: string): string | null => {
        if (!val) return null;
        // Format: DD/MM/YYYY HH:mm:ss
        const parts = val.split(' ');
        if (parts.length !== 2) return null;
        const [date, time] = parts;
        const [day, month, year] = date.split('/');
        return `${year}-${month}-${day}T${time}`;
      };

      const openTime = parseDateTime(cols[1]);
      const closeTime = parseDateTime(cols[2]);
      
      if (!openTime || !closeTime) continue;

      operations.push({
        account_number: accountNumber,
        holder_name: holderName,
        import_date: importDate ? (() => {
          const [day, month, year] = importDate.split('/');
          return `${year}-${month}-${day}`;
        })() : null,
        asset: cols[0],
        open_time: openTime,
        close_time: closeTime,
        duration: cols[3],
        buy_qty: parseInt(cols[4]) || null,
        sell_qty: parseInt(cols[5]) || null,
        side: cols[6],
        buy_price: parseNumber(cols[7]),
        sell_price: parseNumber(cols[8]),
        market_price: parseNumber(cols[9]),
        mep: parseNumber(cols[10]),
        men: parseNumber(cols[11]),
        buy_agent: cols[12] !== '-' ? cols[12] : null,
        sell_agent: cols[13] !== '-' ? cols[13] : null,
        average: cols[14],
        interval_result_gross: parseNumber(cols[15]),
        interval_result_percent: parseNumber(cols[16]),
        operation_result: parseNumber(cols[17]),
        operation_result_percent: parseNumber(cols[18]),
        tet: cols[19] !== ' - ' ? cols[19] : null,
        total: parseNumber(cols[20]),
      });
    }

    return operations;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    setImporting(true);
    
    try {
      const content = await file.text();
      const parsedOperations = parseCSV(content);
      
      if (parsedOperations.length === 0) {
        toast.error('Nenhuma operação encontrada no arquivo');
        setImporting(false);
        return;
      }

      // Store parsed operations and show strategy dialog
      setPendingOperations(parsedOperations);
      setShowStrategyDialog(true);
    } catch (error: any) {
      console.error('Parse error:', error);
      toast.error('Erro ao ler arquivo: ' + error.message);
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!userId) return;
    
    let strategyId = selectedStrategyId;
    
    // Create new strategy if needed
    if (isCreatingNewStrategy && newStrategyName.trim()) {
      const { data: newStrategy, error: createError } = await supabase
        .from('strategies')
        .insert({
          user_id: userId,
          name: newStrategyName.trim(),
          is_active: true,
        })
        .select()
        .single();
      
      if (createError) {
        toast.error('Erro ao criar estratégia: ' + createError.message);
        return;
      }
      
      strategyId = newStrategy.id;
      queryClient.invalidateQueries({ queryKey: ['strategies'] });
    }

    if (!strategyId) {
      toast.error('Selecione ou crie uma estratégia');
      return;
    }

    try {
      // Add user_id and strategy_id to each operation
      const operationsWithUser = pendingOperations.map(op => ({
        ...op,
        user_id: userId,
        strategy_id: strategyId,
      }));

      const { error } = await supabase
        .from('profit_operations')
        .insert(operationsWithUser);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['profit-operations'] });
      toast.success(`${pendingOperations.length} operações importadas com sucesso!`);
      
      // Reset state
      setShowStrategyDialog(false);
      setPendingOperations([]);
      setSelectedStrategyId("");
      setNewStrategyName("");
      setIsCreatingNewStrategy(false);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Erro ao importar operações: ' + error.message);
    }
  };

  const handleCancelImport = () => {
    setShowStrategyDialog(false);
    setPendingOperations([]);
    setSelectedStrategyId("");
    setNewStrategyName("");
    setIsCreatingNewStrategy(false);
  };

  // Calculate stats
  const stats = {
    totalOperations: operations.length,
    totalResult: operations.reduce((sum, op) => sum + (op.operation_result || 0), 0),
    wins: operations.filter(op => (op.operation_result || 0) > 0).length,
    losses: operations.filter(op => (op.operation_result || 0) < 0).length,
    zeros: operations.filter(op => (op.operation_result || 0) === 0).length,
    winRate: operations.length > 0 
      ? (operations.filter(op => (op.operation_result || 0) > 0).length / operations.length * 100) 
      : 0,
    avgWin: (() => {
      const wins = operations.filter(op => (op.operation_result || 0) > 0);
      return wins.length > 0 
        ? wins.reduce((sum, op) => sum + (op.operation_result || 0), 0) / wins.length 
        : 0;
    })(),
    avgLoss: (() => {
      const losses = operations.filter(op => (op.operation_result || 0) < 0);
      return losses.length > 0 
        ? Math.abs(losses.reduce((sum, op) => sum + (op.operation_result || 0), 0) / losses.length)
        : 0;
    })(),
  };

  const payoff = stats.avgLoss > 0 ? (stats.avgWin / stats.avgLoss).toFixed(2) : '0';

  // Chart data
  const assetData = operations.reduce((acc: any[], op) => {
    const existing = acc.find(a => a.asset === op.asset);
    if (existing) {
      existing.result += op.operation_result || 0;
      existing.count += 1;
    } else {
      acc.push({ asset: op.asset, result: op.operation_result || 0, count: 1 });
    }
    return acc;
  }, []);

  const resultDistribution = [
    { name: 'Ganhos', value: stats.wins, color: '#22c55e' },
    { name: 'Perdas', value: stats.losses, color: '#ef4444' },
    { name: 'Zero', value: stats.zeros, color: '#64748b' },
  ].filter(d => d.value > 0);

  // Cumulative result chart
  const cumulativeData = operations
    .slice()
    .sort((a, b) => new Date(a.open_time).getTime() - new Date(b.open_time).getTime())
    .reduce((acc: any[], op, index) => {
      const prevTotal = index > 0 ? acc[index - 1].total : 0;
      acc.push({
        index: index + 1,
        result: op.operation_result || 0,
        total: prevTotal + (op.operation_result || 0),
        date: format(new Date(op.open_time), 'dd/MM HH:mm'),
      });
      return acc;
    }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <PremiumPageLayout
      title="Trading"
      subtitle="Importe e analise suas operações do Profit"
      icon={TrendingUp}
      showBackButton
      backTo="/dashboard"
    >
      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-2 bg-card/50 p-1.5 h-auto">
          <TabsTrigger value="import" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Upload className="h-4 w-4" />
            <span>Importação</span>
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="mt-6 space-y-6">
          <PremiumSection
            title="Importar Operações"
            subtitle="Faça upload do arquivo CSV exportado do Profit"
            icon={Upload}
          >
            <PremiumCard className="p-6">
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <FileSpreadsheet className="h-12 w-12 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Upload do Arquivo CSV</h3>
                  <p className="text-muted-foreground text-sm max-w-md mb-4">
                    Selecione o arquivo CSV exportado do Profit Chart. O formato deve ser separado por ponto-e-vírgula (;).
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={importing}
                    className="max-w-xs"
                  />
                </div>
                {importing && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span>Importando...</span>
                  </div>
                )}
              </div>
            </PremiumCard>
          </PremiumSection>

          {/* Operations List */}
          <PremiumSection
            title="Operações Importadas"
            subtitle={`${operations.length} operações encontradas`}
            icon={Activity}
            actions={
              operations.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja deletar todas as operações?')) {
                      deleteAllMutation.mutate();
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Tudo
                </Button>
              )
            }
          >
            {loadingOperations ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : operations.length === 0 ? (
              <PremiumCard className="p-6">
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma operação importada ainda.</p>
                  <p className="text-sm">Faça upload de um arquivo CSV para começar.</p>
                </div>
              </PremiumCard>
            ) : (
              <PremiumCard className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ativo</TableHead>
                        <TableHead>Abertura</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Lado</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead className="text-right">Resultado</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {operations.slice(0, 50).map((op) => (
                        <TableRow key={op.id}>
                          <TableCell className="font-medium">{op.asset}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(op.open_time), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{op.duration || '-'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              op.side === 'C' 
                                ? 'bg-green-500/10 text-green-500' 
                                : 'bg-red-500/10 text-red-500'
                            }`}>
                              {op.side === 'C' ? 'Compra' : 'Venda'}
                            </span>
                          </TableCell>
                          <TableCell>{op.buy_qty || op.sell_qty}</TableCell>
                          <TableCell className="text-right">
                            <span className={`font-medium ${
                              (op.operation_result || 0) > 0 
                                ? 'text-green-500' 
                                : (op.operation_result || 0) < 0 
                                  ? 'text-red-500' 
                                  : 'text-muted-foreground'
                            }`}>
                              {(op.operation_result || 0) >= 0 ? '+' : ''}
                              {(op.operation_result || 0).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => deleteMutation.mutate(op.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {operations.length > 50 && (
                  <div className="p-4 text-center text-sm text-muted-foreground border-t">
                    Mostrando 50 de {operations.length} operações
                  </div>
                )}
              </PremiumCard>
            )}
          </PremiumSection>
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6 space-y-6">
          {operations.length === 0 ? (
            <PremiumCard className="p-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sem dados para exibir</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Importe suas operações do Profit para visualizar o dashboard com estatísticas detalhadas.
                </p>
              </div>
            </PremiumCard>
          ) : (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div variants={itemVariants}>
                  <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        Total Operações
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-blue-500">{stats.totalOperations}</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card className={`bg-gradient-to-br ${stats.totalResult >= 0 ? 'from-green-500/10 to-green-500/5 border-green-500/20' : 'from-red-500/10 to-red-500/5 border-red-500/20'}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <DollarSign className={`h-4 w-4 ${stats.totalResult >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                        Resultado Total
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-2xl font-bold ${stats.totalResult >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stats.totalResult >= 0 ? '+' : ''}{stats.totalResult.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Target className="h-4 w-4 text-yellow-500" />
                        Taxa de Acerto
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-yellow-500">{stats.winRate.toFixed(1)}%</p>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Zap className="h-4 w-4 text-purple-500" />
                        Payoff
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-purple-500">{payoff}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <PremiumCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ganhos</p>
                      <p className="text-xl font-bold text-green-500">{stats.wins}</p>
                    </div>
                  </div>
                </PremiumCard>

                <PremiumCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <XCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Perdas</p>
                      <p className="text-xl font-bold text-red-500">{stats.losses}</p>
                    </div>
                  </div>
                </PremiumCard>

                <PremiumCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Média Ganho</p>
                      <p className="text-xl font-bold text-green-500">+{stats.avgWin.toFixed(2)}</p>
                    </div>
                  </div>
                </PremiumCard>

                <PremiumCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <TrendingUp className="h-5 w-5 text-red-500 rotate-180" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Média Perda</p>
                      <p className="text-xl font-bold text-red-500">-{stats.avgLoss.toFixed(2)}</p>
                    </div>
                  </div>
                </PremiumCard>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cumulative Result */}
                <PremiumCard className="p-6">
                  <h3 className="font-semibold mb-4">Curva de Resultado</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cumulativeData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis 
                          dataKey="index" 
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [value.toFixed(2), 'Resultado']}
                        />
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey="total" 
                          stroke="hsl(var(--primary))" 
                          fill="url(#colorTotal)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </PremiumCard>

                {/* Result Distribution */}
                <PremiumCard className="p-6">
                  <h3 className="font-semibold mb-4">Distribuição de Resultados</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={resultDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {resultDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </PremiumCard>

                {/* Result by Asset */}
                {assetData.length > 0 && (
                  <PremiumCard className="p-6 lg:col-span-2">
                    <h3 className="font-semibold mb-4">Resultado por Ativo</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={assetData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis 
                            dataKey="asset" 
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            formatter={(value: number) => [value.toFixed(2), 'Resultado']}
                          />
                          <Bar 
                            dataKey="result" 
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </PremiumCard>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Strategy Selection Dialog */}
      <Dialog open={showStrategyDialog} onOpenChange={setShowStrategyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecionar Estratégia</DialogTitle>
            <DialogDescription>
              Escolha uma estratégia existente ou crie uma nova para associar às {pendingOperations.length} operações importadas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!isCreatingNewStrategy ? (
              <>
                <div className="space-y-2">
                  <Label>Estratégia existente</Label>
                  <Select
                    value={selectedStrategyId}
                    onValueChange={setSelectedStrategyId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma estratégia" />
                    </SelectTrigger>
                    <SelectContent>
                      {strategies.map((strategy) => (
                        <SelectItem key={strategy.id} value={strategy.id}>
                          {strategy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {strategies.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhuma estratégia encontrada. Crie uma nova abaixo.
                  </p>
                )}
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsCreatingNewStrategy(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar nova estratégia
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Nome da nova estratégia</Label>
                <Input
                  placeholder="Ex: Scalping 5min, Setup 9.1..."
                  value={newStrategyName}
                  onChange={(e) => setNewStrategyName(e.target.value)}
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreatingNewStrategy(false);
                    setNewStrategyName("");
                  }}
                >
                  Voltar para lista
                </Button>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleCancelImport}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmImport}
              disabled={!isCreatingNewStrategy && !selectedStrategyId || isCreatingNewStrategy && !newStrategyName.trim()}
            >
              Confirmar Importação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PremiumPageLayout>
  );
};

export default Trading;
