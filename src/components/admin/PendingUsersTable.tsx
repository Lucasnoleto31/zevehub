import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Download } from "lucide-react";
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
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

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
      
      const { error } = await supabase
        .from("profiles")
        .update({
          access_status: "aprovado",
          access_approved_at: new Date().toISOString(),
          access_approved_by: session?.user.id,
        })
        .eq("id", user.id);

      if (error) throw error;

      // Criar notificação para o usuário
      await supabase.from("messages").insert({
        user_id: user.id,
        title: "Acesso Aprovado!",
        content: "Seu acesso ao Zeve Hub foi liberado! Bem-vindo à plataforma.",
        priority: "high",
        is_global: false,
      });

      toast.success(`Acesso de ${user.full_name || user.email} aprovado com sucesso!`);
      loadPendingUsers();
      onUpdate();
    } catch (error) {
      console.error("Erro ao aprovar usuário:", error);
      toast.error("Erro ao aprovar usuário");
    } finally {
      setActionLoading(null);
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
      <div className="flex justify-end mb-4">
        <Button onClick={exportToExcel} variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar Excel
        </Button>
      </div>

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
            {users.map((user) => (
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
                <TableCell>{user.phone || "-"}</TableCell>
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
