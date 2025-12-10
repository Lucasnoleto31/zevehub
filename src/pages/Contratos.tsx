import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Upload, 
  FileSpreadsheet, 
  RefreshCw, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Download,
  Trash2,
  AlertTriangle,
  Loader2
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { format, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

interface Contract {
  id: string;
  cpf: string;
  client_name: string | null;
  contract_date: string;
  volume: number;
  asset: string | null;
  broker: string | null;
  imported_at: string;
  matched_user_id: string | null;
}

interface SyncResult {
  approved: number;
  revoked: number;
  unchanged: number;
  errors: string[];
}

export default function Contratos() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({
    totalContracts: 0,
    uniqueClients: 0,
    activeIn3Months: 0,
    matchedUsers: 0
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roles) {
      toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    loadContracts();
  };

  const loadContracts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .order("contract_date", { ascending: false })
        .limit(500);

      if (error) throw error;

      setContracts(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Erro ao carregar contratos:", error);
      toast.error("Erro ao carregar contratos");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (contractsData: Contract[]) => {
    const threeMonthsAgo = subMonths(new Date(), 3);
    const uniqueCpfs = new Set(contractsData.map(c => c.cpf));
    const activeClients = new Set(
      contractsData
        .filter(c => new Date(c.contract_date) >= threeMonthsAgo)
        .map(c => c.cpf)
    );
    const matchedUsers = new Set(
      contractsData.filter(c => c.matched_user_id).map(c => c.matched_user_id)
    );

    setStats({
      totalContracts: contractsData.length,
      uniqueClients: uniqueCpfs.size,
      activeIn3Months: activeClients.size,
      matchedUsers: matchedUsers.size
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error("Planilha vazia ou formato inválido");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      // Processar e inserir contratos
      const contractsToInsert = jsonData.map((row: any) => {
        // Normalizar CPF (remover caracteres especiais)
        const cpf = String(row.cpf || row.CPF || row.Cpf || "")
          .replace(/\D/g, "")
          .padStart(11, "0");
        
        // Tentar parsear a data em diferentes formatos
        let contractDate = row.data || row.Data || row.DATE || row.date || new Date().toISOString().split("T")[0];
        if (typeof contractDate === "number") {
          // Excel serial date
          const excelDate = new Date((contractDate - 25569) * 86400 * 1000);
          contractDate = excelDate.toISOString().split("T")[0];
        } else if (typeof contractDate === "string" && contractDate.includes("/")) {
          const parts = contractDate.split("/");
          if (parts.length === 3) {
            contractDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
        }

        return {
          cpf,
          client_name: row.nome || row.Nome || row.NOME || row.cliente || row.Cliente || null,
          contract_date: contractDate,
          volume: parseInt(row.volume || row.Volume || row.VOLUME || row.contratos || row.Contratos || 0),
          asset: row.ativo || row.Ativo || row.ATIVO || row.ticker || row.Ticker || null,
          broker: row.corretora || row.Corretora || row.CORRETORA || null,
          imported_by: user?.id
        };
      });

      // Inserir em lotes de 100
      const batchSize = 100;
      let inserted = 0;
      
      for (let i = 0; i < contractsToInsert.length; i += batchSize) {
        const batch = contractsToInsert.slice(i, i + batchSize);
        const { error } = await supabase.from("contracts").insert(batch);
        if (error) {
          console.error("Erro ao inserir lote:", error);
          throw error;
        }
        inserted += batch.length;
      }

      toast.success(`${inserted} contratos importados com sucesso!`);
      loadContracts();
      
      // Limpar input
      e.target.value = "";
    } catch (error) {
      console.error("Erro ao processar planilha:", error);
      toast.error("Erro ao processar planilha. Verifique o formato.");
    } finally {
      setUploading(false);
    }
  };

  const syncAccessStatus = async () => {
    setSyncing(true);
    const result: SyncResult = { approved: 0, revoked: 0, unchanged: 0, errors: [] };
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const threeMonthsAgo = subMonths(new Date(), 3);
      const threeMonthsAgoStr = threeMonthsAgo.toISOString().split("T")[0];

      // Buscar todos os perfis com CPF
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, cpf, access_status, full_name");

      if (profilesError) throw profilesError;

      // Buscar contratos dos últimos 3 meses
      const { data: recentContracts, error: contractsError } = await supabase
        .from("contracts")
        .select("cpf")
        .gte("contract_date", threeMonthsAgoStr);

      if (contractsError) throw contractsError;

      // Criar set de CPFs ativos
      const activeCpfs = new Set(recentContracts?.map(c => c.cpf) || []);

      // Processar cada perfil
      for (const profile of profiles || []) {
        if (!profile.cpf) continue;

        const normalizedCpf = profile.cpf.replace(/\D/g, "").padStart(11, "0");
        const hasRecentActivity = activeCpfs.has(normalizedCpf);
        const currentStatus = profile.access_status;

        let newStatus: string | null = null;
        let reason = "";

        if (hasRecentActivity && currentStatus !== "aprovado") {
          // Liberar acesso
          newStatus = "aprovado";
          reason = "Atividade detectada nos últimos 3 meses";
          result.approved++;
        } else if (!hasRecentActivity && currentStatus === "aprovado") {
          // Revogar acesso
          newStatus = "bloqueado";
          reason = "Sem atividade nos últimos 3 meses";
          result.revoked++;
        } else {
          result.unchanged++;
        }

        if (newStatus) {
          // Atualizar status do perfil
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ 
              access_status: newStatus as "aprovado" | "bloqueado" | "pendente" | "reprovado",
              access_approved_at: newStatus === "aprovado" ? new Date().toISOString() : null,
              access_approved_by: newStatus === "aprovado" ? user?.id : null
            })
            .eq("id", profile.id);

          if (updateError) {
            result.errors.push(`Erro ao atualizar ${profile.full_name}: ${updateError.message}`);
            continue;
          }

          // Atualizar matched_user_id nos contratos
          await supabase
            .from("contracts")
            .update({ matched_user_id: profile.id })
            .eq("cpf", normalizedCpf);

          // Registrar log
          await supabase.from("access_sync_logs").insert({
            user_id: profile.id,
            cpf: normalizedCpf,
            previous_status: currentStatus,
            new_status: newStatus,
            reason,
            synced_by: user?.id
          });
        }
      }

      if (result.errors.length > 0) {
        toast.warning(`Sincronização concluída com ${result.errors.length} erros`);
      } else {
        toast.success(
          `Sincronização concluída! Aprovados: ${result.approved}, Revogados: ${result.revoked}, Sem alteração: ${result.unchanged}`
        );
      }

      loadContracts();
    } catch (error) {
      console.error("Erro na sincronização:", error);
      toast.error("Erro ao sincronizar acessos");
    } finally {
      setSyncing(false);
    }
  };

  const clearAllContracts = async () => {
    try {
      const { error } = await supabase.from("contracts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      
      toast.success("Todos os contratos foram removidos");
      loadContracts();
    } catch (error) {
      console.error("Erro ao limpar contratos:", error);
      toast.error("Erro ao limpar contratos");
    }
  };

  const downloadTemplate = () => {
    const template = [
      { cpf: "12345678901", nome: "João Silva", data: "01/12/2024", volume: 100, ativo: "WIN", corretora: "XP" },
      { cpf: "98765432100", nome: "Maria Santos", data: "15/11/2024", volume: 50, ativo: "WDO", corretora: "Clear" }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contratos");
    XLSX.writeFile(wb, "template_contratos.xlsx");
  };

  const formatCpf = (cpf: string) => {
    if (!cpf || cpf.length !== 11) return cpf;
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin")}
          className="hover:bg-primary/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
            Gestão de Contratos
          </h1>
          <p className="text-muted-foreground text-sm">
            Importe contratos e gerencie acessos automaticamente
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalContracts}</p>
                <p className="text-xs text-muted-foreground">Total Contratos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Users className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.uniqueClients}</p>
                <p className="text-xs text-muted-foreground">Clientes Únicos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeIn3Months}</p>
                <p className="text-xs text-muted-foreground">Ativos (3 meses)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.matchedUsers}</p>
                <p className="text-xs text-muted-foreground">Usuários Vinculados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="mb-6 bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Ações</CardTitle>
          <CardDescription>
            Importe planilhas de contratos e sincronize os acessos dos usuários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={uploading}
              />
              <Button variant="default" disabled={uploading}>
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Importar Planilha
              </Button>
            </div>

            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Template
            </Button>

            <Button 
              variant="secondary" 
              onClick={syncAccessStatus}
              disabled={syncing}
              className="bg-green-500/10 hover:bg-green-500/20 text-green-500"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sincronizar Acessos
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Todos
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Confirmar Exclusão
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá remover TODOS os contratos importados. 
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAllContracts} className="bg-destructive">
                    Confirmar Exclusão
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Como funciona a sincronização:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Usuários com contratos nos últimos 3 meses: <span className="text-green-500">Acesso Aprovado</span></li>
              <li>• Usuários sem contratos nos últimos 3 meses: <span className="text-red-500">Acesso Bloqueado</span></li>
              <li>• O cruzamento é feito pelo CPF cadastrado</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Table */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Contratos Importados</CardTitle>
          <CardDescription>
            Últimos 500 contratos importados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum contrato importado ainda</p>
              <p className="text-sm">Importe uma planilha para começar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CPF</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Corretora</TableHead>
                    <TableHead>Vinculado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-mono text-sm">
                        {formatCpf(contract.cpf)}
                      </TableCell>
                      <TableCell>{contract.client_name || "-"}</TableCell>
                      <TableCell>
                        {format(parseISO(contract.contract_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{contract.volume.toLocaleString("pt-BR")}</TableCell>
                      <TableCell>{contract.asset || "-"}</TableCell>
                      <TableCell>{contract.broker || "-"}</TableCell>
                      <TableCell>
                        {contract.matched_user_id ? (
                          <Badge variant="default" className="bg-green-500/10 text-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Sim
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-muted/50">
                            <XCircle className="h-3 w-3 mr-1" />
                            Não
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
