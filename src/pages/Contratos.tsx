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
  Loader2,
  UserCheck,
  BarChart3
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

interface RegisteredClient {
  id: string;
  name: string;
  cpf: string;
  email: string | null;
  phone: string | null;
  imported_at: string;
}

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

interface CrossReference {
  clientName: string;
  cpf: string;
  totalContracts: number;
  lastActivity: string | null;
  isActive: boolean;
  matchedProfileId: string | null;
}

interface SyncResult {
  approved: number;
  revoked: number;
  unchanged: number;
  notFound: number;
  errors: string[];
}

export default function Contratos() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<RegisteredClient[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [crossReference, setCrossReference] = useState<CrossReference[]>([]);
  const [uploadingClients, setUploadingClients] = useState(false);
  const [uploadingContracts, setUploadingContracts] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({
    totalClients: 0,
    totalContracts: 0,
    activeClients: 0,
    inactiveClients: 0,
    matchedProfiles: 0
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
      .maybeSingle();

    if (!roles) {
      toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar contagens (mais eficiente que carregar todos os dados)
      const { count: clientsCount } = await supabase
        .from("registered_clients")
        .select("*", { count: "exact", head: true });

      const { count: contractsCount } = await supabase
        .from("contracts")
        .select("*", { count: "exact", head: true });

      // Carregar apenas os primeiros 200 clientes para exibição
      const { data: clientsData, error: clientsError } = await supabase
        .from("registered_clients")
        .select("*")
        .order("name", { ascending: true })
        .limit(200);

      if (clientsError) throw clientsError;

      // Carregar apenas os últimos 200 contratos para exibição
      const { data: contractsData, error: contractsError } = await supabase
        .from("contracts")
        .select("*")
        .order("contract_date", { ascending: false })
        .limit(200);

      if (contractsError) throw contractsError;

      setClients(clientsData || []);
      setContracts(contractsData || []);

      // Calcular estatísticas de forma otimizada
      await calculateOptimizedStats(clientsCount || 0, contractsCount || 0);
      
      // Fazer cruzamento apenas dos clientes carregados
      if (clientsData && clientsData.length > 0) {
        await crossReferenceData(clientsData, contractsData || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const calculateOptimizedStats = async (totalClients: number, totalContracts: number) => {
    try {
      const threeMonthsAgo = subMonths(new Date(), 3).toISOString().split("T")[0];
      
      // Contar clientes com atividade nos últimos 3 meses (usando query otimizada)
      const { data: activeClientsData } = await supabase
        .from("contracts")
        .select("client_name")
        .gte("contract_date", threeMonthsAgo);

      const uniqueActiveClients = new Set(
        (activeClientsData || []).map(c => c.client_name?.toLowerCase().trim())
      );

      // Contar perfis vinculados
      const { count: matchedCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .not("cpf", "is", null);

      setStats({
        totalClients,
        totalContracts,
        activeClients: uniqueActiveClients.size,
        inactiveClients: Math.max(0, totalClients - uniqueActiveClients.size),
        matchedProfiles: matchedCount || 0
      });
    } catch (error) {
      console.error("Erro ao calcular estatísticas:", error);
    }
  };

  const normalizeString = (str: string): string => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  const crossReferenceData = async (clientsData: RegisteredClient[], contractsData: Contract[]) => {
    const threeMonthsAgo = subMonths(new Date(), 3);
    
    // Buscar perfis do sistema
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, cpf, full_name");

    const profilesByCpf = new Map(
      (profiles || [])
        .filter(p => p.cpf)
        .map(p => [p.cpf!.replace(/\D/g, ""), p])
    );

    // Criar mapa de contratos por nome (normalizado)
    const contractsByName = new Map<string, Contract[]>();
    contractsData.forEach(contract => {
      if (contract.client_name) {
        const normalizedName = normalizeString(contract.client_name);
        const existing = contractsByName.get(normalizedName) || [];
        existing.push(contract);
        contractsByName.set(normalizedName, existing);
      }
    });

    // Cruzar dados
    const crossRef: CrossReference[] = clientsData.map(client => {
      const normalizedClientName = normalizeString(client.name);
      const clientContracts = contractsByName.get(normalizedClientName) || [];
      
      // Calcular atividade nos últimos 3 meses
      const recentContracts = clientContracts.filter(c => 
        new Date(c.contract_date) >= threeMonthsAgo
      );
      
      const totalVolume = recentContracts.reduce((sum, c) => sum + (c.volume || 1), 0);
      
      const lastContract = clientContracts.length > 0 
        ? clientContracts.reduce((latest, c) => 
            new Date(c.contract_date) > new Date(latest.contract_date) ? c : latest
          )
        : null;

      // Verificar se tem perfil no sistema
      const normalizedCpf = client.cpf.replace(/\D/g, "");
      const matchedProfile = profilesByCpf.get(normalizedCpf);

      return {
        clientName: client.name,
        cpf: client.cpf,
        totalContracts: totalVolume,
        lastActivity: lastContract?.contract_date || null,
        isActive: totalVolume >= 1,
        matchedProfileId: matchedProfile?.id || null
      };
    });

    setCrossReference(crossRef);
    // Stats são calculados separadamente em calculateOptimizedStats
  };

  const handleClientsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingClients(true);
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
      
      // Processar clientes
      const clientsToInsert = jsonData.map((row: any) => {
        const name = row.NOME || row.Nome || row.nome || row.CLIENTE || row.Cliente || row.cliente || "";
        const cpfRaw = row.CPF || row.cpf || row["CPF/CNPJ"] || row["CPF CNPJ"] || "";
        const cpf = String(cpfRaw).replace(/\D/g, "").padStart(11, "0");
        const email = row.EMAIL || row.Email || row.email || null;
        const phone = row.TELEFONE || row.Telefone || row.telefone || row.CELULAR || row.Celular || null;

        return {
          name: String(name).trim(),
          cpf,
          email,
          phone,
          imported_by: user?.id
        };
      }).filter(c => c.name && c.cpf);

      // Inserir em lotes de 500
      const batchSize = 500;
      let inserted = 0;
      
      for (let i = 0; i < clientsToInsert.length; i += batchSize) {
        const batch = clientsToInsert.slice(i, i + batchSize);
        const { error } = await supabase.from("registered_clients").insert(batch);
        if (error) {
          console.error("Erro ao inserir lote:", error);
          throw error;
        }
        inserted += batch.length;
        
        if (clientsToInsert.length > batchSize) {
          toast.loading(`Importando clientes... ${inserted}/${clientsToInsert.length}`, { id: "import-clients" });
        }
      }
      
      toast.dismiss("import-clients");
      toast.success(`${inserted} clientes importados com sucesso!`);
      loadData();
      e.target.value = "";
    } catch (error) {
      console.error("Erro ao processar planilha de clientes:", error);
      toast.error("Erro ao processar planilha. Verifique o formato.");
    } finally {
      setUploadingClients(false);
    }
  };

  const handleContractsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingContracts(true);
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
      
      // Processar contratos
      const contractsToInsert = jsonData.map((row: any) => {
        // Nome do cliente
        const clientName = row.NOME || row.Nome || row.nome || row.CLIENTE || row.Cliente || null;
        
        // CPF (pode não ter na planilha de contratos)
        const cpfRaw = row.CPF || row.cpf || row["CPF/CNPJ"] || row.CODIGO || row.Codigo || "";
        const cpf = cpfRaw ? String(cpfRaw).replace(/\D/g, "") : "";
        
        // Data
        let contractDate = row.DATA || row.Data || row.data || row["DATA DE RECEITA"] || new Date().toISOString().split("T")[0];
        if (typeof contractDate === "number") {
          const excelDate = new Date((contractDate - 25569) * 86400 * 1000);
          contractDate = excelDate.toISOString().split("T")[0];
        } else if (typeof contractDate === "string" && contractDate.includes("/")) {
          const parts = contractDate.split("/");
          if (parts.length === 3) {
            const p0 = parseInt(parts[0]);
            let year = parts[2];
            if (year.length === 2) year = `20${year}`;
            if (p0 > 12) {
              contractDate = `${year}-${String(parseInt(parts[1])).padStart(2, "0")}-${String(p0).padStart(2, "0")}`;
            } else {
              contractDate = `${year}-${String(p0).padStart(2, "0")}-${String(parseInt(parts[1])).padStart(2, "0")}`;
            }
          }
        }

        // Volume/Contratos
        const volume = parseInt(row.CONTRATOS || row.Contratos || row.contratos || row.VOLUME || row.Volume || row.volume || row.LOTES || row.Lotes || 1);

        // Ativo
        const asset = row.ATIVO || row.Ativo || row.ativo || row.PRODUTO || row.Produto || null;

        // Corretora/Plataforma
        const broker = row.PLATAFORMA || row.Plataforma || row.CORRETORA || row.Corretora || "Genial";

        return {
          cpf,
          client_name: clientName ? String(clientName).trim() : null,
          contract_date: contractDate,
          volume,
          asset,
          broker,
          imported_by: user?.id
        };
      }).filter(c => c.client_name);

      // Inserir em lotes de 500
      const batchSize = 500;
      let inserted = 0;
      
      for (let i = 0; i < contractsToInsert.length; i += batchSize) {
        const batch = contractsToInsert.slice(i, i + batchSize);
        const { error } = await supabase.from("contracts").insert(batch);
        if (error) {
          console.error("Erro ao inserir lote:", error);
          throw error;
        }
        inserted += batch.length;
        
        if (contractsToInsert.length > batchSize) {
          toast.loading(`Importando contratos... ${inserted}/${contractsToInsert.length}`, { id: "import-contracts" });
        }
      }
      
      toast.dismiss("import-contracts");
      toast.success(`${inserted} contratos importados com sucesso!`);
      loadData();
      e.target.value = "";
    } catch (error) {
      console.error("Erro ao processar planilha de contratos:", error);
      toast.error("Erro ao processar planilha. Verifique o formato.");
    } finally {
      setUploadingContracts(false);
    }
  };

  const syncAccessStatus = async () => {
    setSyncing(true);
    const result: SyncResult = { approved: 0, revoked: 0, unchanged: 0, notFound: 0, errors: [] };
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const threeMonthsAgo = subMonths(new Date(), 3).toISOString().split("T")[0];

      // Buscar todos os clientes cadastrados (com seus CPFs)
      toast.loading("Carregando clientes cadastrados...", { id: "sync-progress" });
      const { data: allClients, error: clientsError } = await supabase
        .from("registered_clients")
        .select("name, cpf");

      if (clientsError) throw clientsError;

      // Buscar contratos ativos (últimos 3 meses) - apenas nome do cliente
      toast.loading("Verificando atividade dos últimos 3 meses...", { id: "sync-progress" });
      const { data: activeContracts, error: contractsError } = await supabase
        .from("contracts")
        .select("client_name")
        .gte("contract_date", threeMonthsAgo);

      if (contractsError) throw contractsError;

      // Criar set de nomes ativos (normalizados)
      const activeNames = new Set(
        (activeContracts || [])
          .filter(c => c.client_name)
          .map(c => normalizeString(c.client_name!))
      );

      // Mapear CPF para atividade
      const activityByCpf = new Map<string, boolean>();
      (allClients || []).forEach(client => {
        const normalizedName = normalizeString(client.name);
        const normalizedCpf = client.cpf.replace(/\D/g, "");
        activityByCpf.set(normalizedCpf, activeNames.has(normalizedName));
      });

      // Buscar perfis do sistema
      toast.loading("Atualizando acessos...", { id: "sync-progress" });
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, cpf, access_status, full_name");

      if (profilesError) throw profilesError;

      // Processar cada perfil
      for (const profile of profiles || []) {
        if (!profile.cpf) continue;

        const normalizedCpf = profile.cpf.replace(/\D/g, "");
        const hasActivity = activityByCpf.get(normalizedCpf);

        // Se não encontrou na lista de clientes cadastrados
        if (hasActivity === undefined) {
          result.notFound++;
          continue;
        }

        const currentStatus = profile.access_status;
        let newStatus: string | null = null;
        let reason = "";

        if (hasActivity && currentStatus !== "aprovado") {
          newStatus = "aprovado";
          reason = "Atividade detectada nos últimos 3 meses (≥1 lote)";
          result.approved++;
        } else if (!hasActivity && currentStatus === "aprovado") {
          newStatus = "bloqueado";
          reason = "Sem atividade nos últimos 3 meses";
          result.revoked++;
        } else {
          result.unchanged++;
        }

        if (newStatus) {
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
      
      toast.dismiss("sync-progress");

      if (result.errors.length > 0) {
        toast.warning(`Sincronização concluída com ${result.errors.length} erros`);
      } else {
        toast.success(
          `Sincronização concluída! Aprovados: ${result.approved}, Bloqueados: ${result.revoked}, Sem alteração: ${result.unchanged}, Não encontrados: ${result.notFound}`
        );
      }

      loadData();
    } catch (error) {
      console.error("Erro na sincronização:", error);
      toast.error("Erro ao sincronizar acessos");
    } finally {
      setSyncing(false);
    }
  };

  const clearClients = async () => {
    try {
      const { error } = await supabase.from("registered_clients").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast.success("Clientes removidos");
      loadData();
    } catch (error) {
      console.error("Erro ao limpar clientes:", error);
      toast.error("Erro ao limpar clientes");
    }
  };

  const clearContracts = async () => {
    try {
      const { error } = await supabase.from("contracts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      toast.success("Contratos removidos");
      loadData();
    } catch (error) {
      console.error("Erro ao limpar contratos:", error);
      toast.error("Erro ao limpar contratos");
    }
  };

  const downloadClientsTemplate = () => {
    const template = [
      { NOME: "JOÃO SILVA", CPF: "123.456.789-00", EMAIL: "joao@email.com", TELEFONE: "(11) 99999-9999" },
      { NOME: "MARIA SANTOS", CPF: "987.654.321-00", EMAIL: "maria@email.com", TELEFONE: "(11) 88888-8888" }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "template_clientes.xlsx");
  };

  const downloadContractsTemplate = () => {
    const template = [
      { NOME: "JOÃO SILVA", DATA: "01/12/2024", CONTRATOS: 150, ATIVO: "WIN", PLATAFORMA: "MetaTrader" },
      { NOME: "MARIA SANTOS", DATA: "15/11/2024", CONTRATOS: 50, ATIVO: "WDO", PLATAFORMA: "Profit" }
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
            Importe clientes e contratos para gerenciar acessos automaticamente
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
                <p className="text-xs text-muted-foreground">Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <BarChart3 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalContracts}</p>
                <p className="text-xs text-muted-foreground">Contratos</p>
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
                <p className="text-2xl font-bold">{stats.activeClients}</p>
                <p className="text-xs text-muted-foreground">Ativos (3m)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inactiveClients}</p>
                <p className="text-xs text-muted-foreground">Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <UserCheck className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.matchedProfiles}</p>
                <p className="text-xs text-muted-foreground">No Sistema</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="bg-card/50 backdrop-blur-sm">
          <TabsTrigger value="upload">Importar Dados</TabsTrigger>
          <TabsTrigger value="crossref">Cruzamento</TabsTrigger>
          <TabsTrigger value="clients">Clientes ({clients.length})</TabsTrigger>
          <TabsTrigger value="contracts">Contratos ({contracts.length})</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Clientes Upload */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Planilha de Clientes
                </CardTitle>
                <CardDescription>
                  Lista de clientes cadastrados na assessoria com CPF
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleClientsUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploadingClients}
                    />
                    <Button variant="default" disabled={uploadingClients}>
                      {uploadingClients ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Importar Clientes
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadClientsTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Template
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={clients.length === 0}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Limpar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Limpar clientes?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso removerá todos os {clients.length} clientes importados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={clearClients}>Confirmar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Colunas esperadas:</strong> NOME, CPF, EMAIL (opcional), TELEFONE (opcional)</p>
                </div>
              </CardContent>
            </Card>

            {/* Contratos Upload */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-500" />
                  Planilha de Contratos
                </CardTitle>
                <CardDescription>
                  Lista de contratos/lotes girados pelos clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleContractsUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploadingContracts}
                    />
                    <Button variant="default" disabled={uploadingContracts}>
                      {uploadingContracts ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Importar Contratos
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={downloadContractsTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Template
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={contracts.length === 0}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Limpar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Limpar contratos?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso removerá todos os {contracts.length} contratos importados.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={clearContracts}>Confirmar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p><strong>Colunas esperadas:</strong> NOME, DATA, CONTRATOS (qtd), ATIVO (opcional), PLATAFORMA (opcional)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sync Button */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    Sincronizar Acessos
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cruza os dados e atualiza automaticamente o status de acesso dos usuários
                  </p>
                </div>
                <Button 
                  onClick={syncAccessStatus}
                  disabled={syncing || clients.length === 0}
                  className="bg-gradient-to-r from-primary to-cyan-500"
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Sincronizar Agora
                </Button>
              </div>
              
              <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border/50">
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Como funciona:
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>1. Cruza clientes com contratos pelo <strong>NOME</strong></li>
                  <li>2. Verifica se girou pelo menos <strong>1 lote</strong> nos últimos 3 meses</li>
                  <li>3. Usa o <strong>CPF</strong> do cliente para encontrar o perfil no sistema</li>
                  <li>4. <span className="text-green-500">Aprova</span> quem tem atividade | <span className="text-red-500">Bloqueia</span> quem não tem</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cross Reference Tab */}
        <TabsContent value="crossref">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Cruzamento de Dados</CardTitle>
              <CardDescription>
                Resultado do cruzamento entre clientes cadastrados e contratos girados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : crossReference.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum dado para cruzar</p>
                  <p className="text-sm">Importe as planilhas de clientes e contratos</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Contratos (3m)</TableHead>
                        <TableHead>Última Atividade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>No Sistema</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {crossReference.slice(0, 100).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.clientName}</TableCell>
                          <TableCell className="font-mono text-sm">{formatCpf(item.cpf)}</TableCell>
                          <TableCell>
                            <Badge variant={item.totalContracts > 0 ? "default" : "secondary"}>
                              {item.totalContracts} lotes
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.lastActivity 
                              ? format(parseISO(item.lastActivity), "dd/MM/yyyy", { locale: ptBR })
                              : "-"
                            }
                          </TableCell>
                          <TableCell>
                            {item.isActive ? (
                              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Ativo
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="bg-red-500/20 text-red-500 border-red-500/30">
                                <XCircle className="h-3 w-3 mr-1" />
                                Inativo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.matchedProfileId ? (
                              <Badge className="bg-cyan-500/20 text-cyan-500 border-cyan-500/30">
                                <UserCheck className="h-3 w-3 mr-1" />
                                Sim
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Não</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {crossReference.length > 100 && (
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      Mostrando 100 de {crossReference.length} registros
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Clientes Cadastrados</CardTitle>
              <CardDescription>
                {clients.length} clientes importados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : clients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum cliente importado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.slice(0, 100).map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell className="font-mono text-sm">{formatCpf(client.cpf)}</TableCell>
                          <TableCell>{client.email || "-"}</TableCell>
                          <TableCell>{client.phone || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {clients.length > 100 && (
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      Mostrando 100 de {clients.length} clientes
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Contratos Importados</CardTitle>
              <CardDescription>
                {contracts.length} contratos importados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : contracts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum contrato importado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Contratos</TableHead>
                        <TableHead>Ativo</TableHead>
                        <TableHead>Plataforma</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.slice(0, 100).map((contract) => (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">{contract.client_name || "-"}</TableCell>
                          <TableCell>
                            {format(parseISO(contract.contract_date), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell>{contract.volume}</TableCell>
                          <TableCell>{contract.asset || "-"}</TableCell>
                          <TableCell>{contract.broker || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {contracts.length > 100 && (
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      Mostrando 100 de {contracts.length} contratos
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
