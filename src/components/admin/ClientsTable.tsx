import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Eye, Pencil, Check, X, Ban, Unlock, Search, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import ClientEditDialog from "./ClientEditDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Client {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  status: string;
  created_at: string;
  last_login: string | null;
  access_status: string | null;
  has_genial_account: boolean | null;
  genial_id: string | null;
  cpf: string | null;
  roles?: string[];
}

interface ClientsTableProps {
  onUpdate: () => void;
}

const ClientsTable = ({ onUpdate }: ClientsTableProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;
    
    const term = searchTerm.toLowerCase();
    return clients.filter((client) => 
      client.full_name?.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term) ||
      client.cpf?.includes(term) ||
      client.phone?.includes(term) ||
      client.genial_id?.toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  const formatPhoneForWhatsApp = (phone: string | null) => {
    if (!phone) return null;
    // Remove tudo que não é número
    return phone.replace(/\D/g, "");
  };

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Carregar roles de cada cliente
      const clientsWithRoles = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: rolesData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id);

          return {
            ...profile,
            roles: rolesData?.map((r) => r.role) || [],
          };
        })
      );

      setClients(clientsWithRoles);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      toast.error("Erro ao carregar lista de clientes");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeAccessStatus = async (clientId: string, newStatus: string, clientName: string) => {
    setActionLoading(clientId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from("profiles")
        .update({
          access_status: newStatus as "aprovado" | "bloqueado" | "pendente" | "reprovado",
          access_approved_at: new Date().toISOString(),
          access_approved_by: session?.user.id,
        })
        .eq("id", clientId);

      if (error) throw error;

      // Criar notificação
      const messages: Record<string, { title: string; content: string }> = {
        aprovado: { 
          title: "Acesso Aprovado!", 
          content: "Seu acesso ao Zeve Hub foi liberado! Bem-vindo à plataforma." 
        },
        bloqueado: { 
          title: "Acesso Bloqueado", 
          content: "Seu acesso ao Zeve Hub foi temporariamente bloqueado. Entre em contato com seu assessor." 
        },
        reprovado: { 
          title: "Acesso Não Aprovado", 
          content: "Seu acesso ao Zeve Hub não foi aprovado. Entre em contato com seu assessor." 
        },
      };

      if (messages[newStatus]) {
        await supabase.from("messages").insert({
          user_id: clientId,
          title: messages[newStatus].title,
          content: messages[newStatus].content,
          priority: "high",
          is_global: false,
        });
      }

      const statusLabels: Record<string, string> = {
        aprovado: "aprovado",
        bloqueado: "bloqueado",
        reprovado: "reprovado",
        pendente: "pendente",
      };

      toast.success(`Status de ${clientName} alterado para ${statusLabels[newStatus]}`);
      loadClients();
      onUpdate();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status do cliente");
    } finally {
      setActionLoading(null);
    }
  };

  const getAccessStatusBadge = (accessStatus: string | null) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; className?: string }> = {
      aprovado: { variant: "default", label: "Aprovado", className: "bg-green-500 hover:bg-green-600" },
      pendente: { variant: "secondary", label: "Pendente", className: "bg-yellow-500 text-black hover:bg-yellow-600" },
      reprovado: { variant: "destructive", label: "Reprovado" },
      bloqueado: { variant: "destructive", label: "Bloqueado" },
    };

    const status = accessStatus || "pendente";
    const statusConfig = config[status] || config.pendente;

    return (
      <Badge variant={statusConfig.variant} className={statusConfig.className}>
        {statusConfig.label}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      inactive: "secondary",
      suspended: "destructive",
    };

    const labels: Record<string, string> = {
      active: "Ativo",
      inactive: "Inativo",
      suspended: "Suspenso",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  if (clients.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum cliente cadastrado ainda</p>
      </div>
    );
  }

  return (
    <>
      <ClientEditDialog
        client={editingClient}
        open={!!editingClient}
        onClose={() => setEditingClient(null)}
        onUpdate={() => {
          loadClients();
          onUpdate();
        }}
      />
      
      <div className="p-4 border-b">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, CPF, telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        {searchTerm && (
          <p className="text-sm text-muted-foreground mt-2">
            {filteredClients.length} {filteredClients.length === 1 ? "resultado" : "resultados"} encontrado{filteredClients.length !== 1 && "s"}
          </p>
        )}
      </div>
      
      <div className="rounded-md border-0">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Acesso</TableHead>
            <TableHead>Conta Genial</TableHead>
            <TableHead>Perfil</TableHead>
            <TableHead>Último Acesso</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredClients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">
                <div>
                  {client.full_name || "Sem nome"}
                  {client.cpf && (
                    <p className="text-xs text-muted-foreground">CPF: {client.cpf}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {client.phone ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{client.phone}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                      onClick={() => {
                        const phone = formatPhoneForWhatsApp(client.phone);
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
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>{client.email}</TableCell>
              <TableCell>{getAccessStatusBadge(client.access_status)}</TableCell>
              <TableCell>
                {client.has_genial_account ? (
                  <div className="flex flex-col">
                    <Badge variant="default" className="w-fit bg-green-500">Sim</Badge>
                    {client.genial_id && (
                      <span className="text-xs text-muted-foreground mt-1">
                        ID: {client.genial_id}
                      </span>
                    )}
                  </div>
                ) : (
                  <Badge variant="secondary">Não</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {client.roles?.map((role) => (
                    <Badge key={role} variant="outline" className="text-xs">
                      {role}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {client.last_login
                  ? formatDistanceToNow(new Date(client.last_login), {
                      addSuffix: true,
                      locale: ptBR,
                    })
                  : "Nunca"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionLoading === client.id}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Acesso
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleChangeAccessStatus(client.id, "aprovado", client.full_name || client.email)}
                        className="gap-2"
                      >
                        <Check className="w-4 h-4 text-green-500" />
                        Aprovar Acesso
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleChangeAccessStatus(client.id, "bloqueado", client.full_name || client.email)}
                        className="gap-2"
                      >
                        <Ban className="w-4 h-4 text-red-500" />
                        Bloquear Acesso
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleChangeAccessStatus(client.id, "pendente", client.full_name || client.email)}
                        className="gap-2"
                      >
                        <Unlock className="w-4 h-4" />
                        Voltar para Pendente
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingClient(client)}
                    title="Editar cliente"
                  >
                    <Pencil className="w-4 h-4" />
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

export default ClientsTable;
