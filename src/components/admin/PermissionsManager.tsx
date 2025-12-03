import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Search, Save, Shield, Eye, Edit, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  access_status: string | null;
}

interface Permission {
  module_name: string;
  can_view: boolean;
  can_edit: boolean;
}

interface ModuleConfig {
  name: string;
  label: string;
  description: string;
  icon: string;
}

const MODULES: ModuleConfig[] = [
  { name: "dashboard", label: "Dashboard", description: "Visualização do painel principal", icon: "📊" },
  { name: "operacoes", label: "Operações", description: "Gestão de operações de trading", icon: "📈" },
  { name: "financas", label: "Finanças Pessoais", description: "Controle financeiro pessoal", icon: "💰" },
  { name: "relatorios", label: "Relatórios", description: "Acesso a relatórios e métricas", icon: "📋" },
  { name: "comunidade", label: "Comunidade", description: "Participação na comunidade", icon: "👥" },
  { name: "inteligencia", label: "Inteligência de Mercado", description: "Análises e indicadores", icon: "🎯" },
  { name: "alertas", label: "Alertas", description: "Recebimento de alertas", icon: "🔔" },
  { name: "perfil", label: "Perfil", description: "Edição de perfil próprio", icon: "👤" },
];

interface PermissionsManagerProps {
  onUpdate?: () => void;
}

const PermissionsManager = ({ onUpdate }: PermissionsManagerProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [saving, setSaving] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, access_status")
        .eq("access_status", "aprovado")
        .order("full_name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => user.access_status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const loadUserPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("module_name, can_view, can_edit")
        .eq("user_id", userId);

      if (error) throw error;

      // Criar um mapa das permissões existentes
      const existingPermissions = new Map(
        (data || []).map((p) => [p.module_name, p])
      );

      // Criar array com todos os módulos, preenchendo com defaults se não existir
      const allPermissions = MODULES.map((module) => {
        const existing = existingPermissions.get(module.name);
        return {
          module_name: module.name,
          can_view: existing?.can_view ?? true,
          can_edit: existing?.can_edit ?? false,
        };
      });

      setUserPermissions(allPermissions);
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast.error("Erro ao carregar permissões do usuário");
    }
  };

  const handleOpenPermissions = async (user: User) => {
    setSelectedUser(user);
    await loadUserPermissions(user.id);
    setPermissionsDialogOpen(true);
  };

  const handlePermissionChange = (moduleName: string, field: "can_view" | "can_edit", value: boolean) => {
    setUserPermissions((prev) =>
      prev.map((p) => {
        if (p.module_name === moduleName) {
          // Se desmarcar can_view, também desmarca can_edit
          if (field === "can_view" && !value) {
            return { ...p, can_view: false, can_edit: false };
          }
          return { ...p, [field]: value };
        }
        return p;
      })
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Deletar permissões existentes
      await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", selectedUser.id);

      // Inserir novas permissões
      const permissionsToInsert = userPermissions.map((p) => ({
        user_id: selectedUser.id,
        module_name: p.module_name,
        can_view: p.can_view,
        can_edit: p.can_edit,
        granted_by: session?.user.id,
      }));

      const { error } = await supabase
        .from("user_permissions")
        .insert(permissionsToInsert);

      if (error) throw error;

      toast.success(`Permissões de ${selectedUser.full_name || selectedUser.email} atualizadas!`);
      setPermissionsDialogOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error("Erro ao salvar permissões:", error);
      toast.error("Erro ao salvar permissões");
    } finally {
      setSaving(false);
    }
  };

  const handleApplyTemplate = (template: "full" | "readonly" | "none") => {
    setUserPermissions((prev) =>
      prev.map((p) => {
        switch (template) {
          case "full":
            return { ...p, can_view: true, can_edit: true };
          case "readonly":
            return { ...p, can_view: true, can_edit: false };
          case "none":
            return { ...p, can_view: false, can_edit: false };
          default:
            return p;
        }
      })
    );
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <>
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {users.length === 0
              ? "Nenhum usuário aprovado encontrado"
              : "Nenhum usuário encontrado com os filtros aplicados"}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                        <AvatarFallback>
                          {user.full_name?.[0] || user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.full_name || "Sem nome"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-green-500">
                      Aprovado
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPermissions(user)}
                      className="gap-2"
                    >
                      <Shield className="w-4 h-4" />
                      Permissões
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog de Permissões */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              Permissões de {selectedUser?.full_name || selectedUser?.email}
            </DialogTitle>
            <DialogDescription>
              Configure as permissões de acesso para cada módulo do sistema
            </DialogDescription>
          </DialogHeader>

          {/* Templates rápidos */}
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleApplyTemplate("full")}
            >
              Acesso Total
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleApplyTemplate("readonly")}
            >
              Somente Leitura
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleApplyTemplate("none")}
            >
              Nenhum Acesso
            </Button>
          </div>

          <div className="space-y-4">
            {MODULES.map((module) => {
              const permission = userPermissions.find(
                (p) => p.module_name === module.name
              );

              return (
                <div
                  key={module.name}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{module.icon}</span>
                    <div>
                      <p className="font-medium">{module.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {module.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor={`view-${module.name}`} className="text-sm">
                        Ver
                      </Label>
                      <Switch
                        id={`view-${module.name}`}
                        checked={permission?.can_view ?? true}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(module.name, "can_view", checked)
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Edit className="w-4 h-4 text-muted-foreground" />
                      <Label htmlFor={`edit-${module.name}`} className="text-sm">
                        Editar
                      </Label>
                      <Switch
                        id={`edit-${module.name}`}
                        checked={permission?.can_edit ?? false}
                        disabled={!permission?.can_view}
                        onCheckedChange={(checked) =>
                          handlePermissionChange(module.name, "can_edit", checked)
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setPermissionsDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSavePermissions} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Permissões
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PermissionsManager;
