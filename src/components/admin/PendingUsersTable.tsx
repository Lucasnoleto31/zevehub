import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Download, Search, MessageCircle, CheckCheck, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface PendingUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  cpf: string | null;
  has_genial_account: boolean;
  genial_id: string | null;
  created_at: string;
  access_status: string;
}

interface PendingUsersTableProps {
  onUpdate: () => void;
}

const PendingUsersTable = ({ onUpdate }: PendingUsersTableProps) => {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approveAllLoading, setApproveAllLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    
    const term = searchTerm.toLowerCase();
    return users.filter((user) => 
      user.full_name?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.cpf?.includes(term) ||
      user.phone?.includes(term) ||
      user.genial_id?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const formatPhoneForWhatsApp = (phone: string | null) => {
    if (!phone) return null;
    return phone.replace(/\D/g, "");
  };

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, cpf, has_genial_account, genial_id, created_at, access_status")
        .eq("access_status", "pendente")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Erro ao carregar usuários pendentes:", error);
      toast.error("Erro ao carregar usuários pendentes");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (user: PendingUser) => {
    setActionLoading(user.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Calcular expiração de 3 dias
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + 3);
      
      const { error } = await supabase
        .from("profiles")
        .update({
          access_status: "aprovado",
          access_approved_at: new Date().toISOString(),
          access_approved_by: session?.user.id,
          trial_expires_at: trialExpiresAt.toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      // Criar mensagem de boas-vindas personalizada
      const welcomeMessage = `Olá, ${user.full_name || 'Cliente'}, tudo bem?

Aqui é o Artur, da Genial.

Obrigado por acessar o ZEVE HUB sua aprovação já está concluída ✅

Quero te fazer um convite simples e sem custo:
participar da nossa assessoria Zeve Investimentos.

👉 É totalmente gratuita
👉 Corretagem ZERO
👉 Sem fidelidade ou obrigação

Ao se vincular, você passa a contar com uma estrutura profissional para te acompanhar no mercado, com foco em organização, controle de risco e evolução consistente.

Para ativar, é bem rápido:
vou te enviar um PDF com o passo a passo leva menos de 2 minutos.

🔍 Quando for procurar, é só buscar por Zeve Investimentos 9.

Qualquer dúvida, fico à disposição por aqui.
Vamos avançar no seu próximo nível no mercado. 🚀`;

      await supabase.from("messages").insert({
        user_id: user.id,
        title: "Bem-vindo ao ZEVE HUB! ✅",
        content: welcomeMessage,
        priority: "high",
        is_global: false,
        created_by: session?.user.id,
      });

      toast.success(`Acesso temporário de 3 dias liberado para ${user.full_name || user.email}!`);
      loadPendingUsers();
      onUpdate();
    } catch (error) {
      console.error("Erro ao aprovar usuário:", error);
      toast.error("Erro ao aprovar usuário");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAll = async () => {
    if (users.length === 0) return;
    
    setApproveAllLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Calcular expiração de 3 dias
      const trialExpiresAt = new Date();
      trialExpiresAt.setDate(trialExpiresAt.getDate() + 3);
      
      const userIds = users.map(u => u.id);
      
      const { error } = await supabase
        .from("profiles")
        .update({
          access_status: "aprovado",
          access_approved_at: new Date().toISOString(),
          access_approved_by: session?.user.id,
          trial_expires_at: trialExpiresAt.toISOString(),
        })
        .in("id", userIds);

      if (error) throw error;

      // Criar mensagens de boas-vindas personalizadas para todos
      const notifications = users.map(user => {
        const welcomeMessage = `Olá, ${user.full_name || 'Cliente'}, tudo bem?

Aqui é o Artur, da Genial.

Obrigado por acessar o ZEVE HUB sua aprovação já está concluída ✅

Quero te fazer um convite simples e sem custo:
participar da nossa assessoria Zeve Investimentos.

👉 É totalmente gratuita
👉 Corretagem ZERO
👉 Sem fidelidade ou obrigação

Ao se vincular, você passa a contar com uma estrutura profissional para te acompanhar no mercado, com foco em organização, controle de risco e evolução consistente.

Para ativar, é bem rápido:
vou te enviar um PDF com o passo a passo leva menos de 2 minutos.

🔍 Quando for procurar, é só buscar por Zeve Investimentos 9.

Qualquer dúvida, fico à disposição por aqui.
Vamos avançar no seu próximo nível no mercado. 🚀`;

        return {
          user_id: user.id,
          title: "Bem-vindo ao ZEVE HUB! ✅",
          content: welcomeMessage,
          priority: "high",
          is_global: false,
          created_by: session?.user.id,
        };
      });

      await supabase.from("messages").insert(notifications);

      toast.success(`${users.length} usuário(s) aprovado(s) com trial de 3 dias!`);
      loadPendingUsers();
      onUpdate();
    } catch (error) {
      console.error("Erro ao aprovar todos os usuários:", error);
      toast.error("Erro ao aprovar todos os usuários");
    } finally {
      setApproveAllLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    
    setActionLoading(selectedUser.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from("profiles")
        .update({
          access_status: "reprovado",
          access_approved_at: new Date().toISOString(),
          access_approved_by: session?.user.id,
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      // Criar notificação para o usuário
      await supabase.from("messages").insert({
        user_id: selectedUser.id,
        title: "Acesso não aprovado",
        content: rejectReason || "Seu acesso não pôde ser liberado. Entre em contato com seu assessor para mais informações.",
        priority: "high",
        is_global: false,
      });

      toast.success(`Acesso de ${selectedUser.full_name || selectedUser.email} reprovado.`);
      setShowRejectDialog(false);
      setSelectedUser(null);
      setRejectReason("");
      loadPendingUsers();
      onUpdate();
    } catch (error) {
      console.error("Erro ao reprovar usuário:", error);
      toast.error("Erro ao reprovar usuário");
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectDialog = (user: PendingUser) => {
    setSelectedUser(user);
    setShowRejectDialog(true);
  };

  const exportToExcel = () => {
    const exportData = users.map(user => ({
      Nome: user.full_name || "Sem nome",
      Telefone: user.phone || "-"
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usuários Pendentes");
    XLSX.writeFile(workbook, `usuarios_pendentes_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
    toast.success("Excel exportado com sucesso!");
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum usuário pendente de aprovação</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, CPF, telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleApproveAll} 
            variant="default" 
            size="sm" 
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={approveAllLoading || users.length === 0}
          >
            {approveAllLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            Aprovar Todos ({users.length})
          </Button>
          <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {searchTerm && (
        <p className="text-sm text-muted-foreground mb-4">
          {filteredUsers.length} {filteredUsers.length === 1 ? "resultado" : "resultados"} encontrado{filteredUsers.length !== 1 && "s"}
        </p>
      )}

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar Acesso</DialogTitle>
            <DialogDescription>
              Você está reprovando o acesso de {selectedUser?.full_name || selectedUser?.email}.
              Informe o motivo (opcional):
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo da reprovação (será enviado ao usuário)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={actionLoading === selectedUser?.id}
            >
              Confirmar Reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Conta Genial</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Data Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.full_name || "Sem nome"}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.cpf || "-"}</TableCell>
                <TableCell>
                  {user.has_genial_account ? (
                    <div className="flex flex-col">
                      <Badge variant="default" className="w-fit">Sim</Badge>
                      {user.genial_id && (
                        <span className="text-xs text-muted-foreground mt-1">
                          ID: {user.genial_id}
                        </span>
                      )}
                    </div>
                  ) : (
                    <Badge variant="secondary">Não</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {user.phone ? (
                    <div className="flex items-center gap-2">
                      <span>{user.phone}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                        onClick={() => {
                          const phone = formatPhoneForWhatsApp(user.phone);
                          if (phone) {
                            window.open(`https://wa.me/${phone}`, "_blank");
                          }
                        }}
                        title="Abrir WhatsApp"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(user.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleApprove(user)}
                      disabled={actionLoading === user.id}
                      className="gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Aprovar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openRejectDialog(user)}
                      disabled={actionLoading === user.id}
                      className="gap-1"
                    >
                      <X className="w-4 h-4" />
                      Reprovar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default PendingUsersTable;
