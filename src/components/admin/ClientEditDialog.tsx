import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Client {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  status: string;
  roles?: string[];
}

interface ClientEditDialogProps {
  client: Client | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const AVAILABLE_ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "vip", label: "VIP" },
  { value: "trader_ativo", label: "Trader Ativo" },
  { value: "parceiro", label: "Parceiro" },
  { value: "iniciante", label: "Iniciante" },
];

const ClientEditDialog = ({ client, open, onClose, onUpdate }: ClientEditDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: client?.full_name || "",
    phone: client?.phone || "",
    status: client?.status || "active",
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>(client?.roles || []);

  const handleSave = async () => {
    if (!client) return;

    setLoading(true);
    try {
      // Atualizar perfil
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          status: formData.status,
        })
        .eq("id", client.id);

      if (profileError) throw profileError;

      // Obter roles atuais
      const { data: currentRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", client.id);

      const currentRoleValues = (currentRoles?.map((r) => r.role) || []) as string[];

      // Roles para adicionar
      const rolesToAdd = selectedRoles.filter((r) => !currentRoleValues.includes(r as any));

      // Roles para remover
      const rolesToRemove = currentRoleValues.filter((r) => !selectedRoles.includes(r));

      // Adicionar novas roles
      if (rolesToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(
            rolesToAdd.map((role) => ({
              user_id: client.id,
              role: role as "admin" | "vip" | "trader_ativo" | "parceiro" | "iniciante",
            }))
          );

        if (insertError) throw insertError;
      }

      // Remover roles
      if (rolesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", client.id)
          .in("role", rolesToRemove as ("admin" | "vip" | "trader_ativo" | "parceiro" | "iniciante")[]);

        if (deleteError) throw deleteError;
      }

      toast.success("Cliente atualizado com sucesso!");
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error("Erro ao atualizar cliente:", error);
      toast.error(error.message || "Erro ao atualizar cliente");
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Altere as informações e permissões do cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={client.email} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nome do cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status da Conta</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Roles */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Perfis de Acesso</Label>
            <div className="space-y-3">
              {AVAILABLE_ROLES.map((role) => (
                <div key={role.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={role.value}
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={() => toggleRole(role.value)}
                  />
                  <Label
                    htmlFor={role.value}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {role.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientEditDialog;
