import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Award } from "lucide-react";

interface CommunityTitle {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  priority: number;
}

export const TitlesManagement = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<CommunityTitle | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "hsl(210, 70%, 50%)",
    icon: "",
    priority: 0,
  });

  const { data: titles } = useQuery({
    queryKey: ["community-titles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_titles")
        .select("*")
        .order("priority", { ascending: false });
      
      if (error) throw error;
      return data as CommunityTitle[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("community_titles").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-titles"] });
      toast.success("Título criado com sucesso!");
      setIsCreateOpen(false);
      resetForm();
    },
    onError: () => toast.error("Erro ao criar título"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("community_titles")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-titles"] });
      toast.success("Título atualizado com sucesso!");
      setEditingTitle(null);
      resetForm();
    },
    onError: () => toast.error("Erro ao atualizar título"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_titles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-titles"] });
      toast.success("Título removido com sucesso!");
    },
    onError: () => toast.error("Erro ao remover título"),
  });

  const resetForm = () => {
    setFormData({ name: "", color: "hsl(210, 70%, 50%)", icon: "", priority: 0 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTitle) {
      updateMutation.mutate({ id: editingTitle.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (title: CommunityTitle) => {
    setEditingTitle(title);
    setFormData({
      name: title.name,
      color: title.color,
      icon: title.icon || "",
      priority: title.priority,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Gerenciar Títulos
        </CardTitle>
        <Dialog open={isCreateOpen || !!editingTitle} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingTitle(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Título
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTitle ? "Editar Título" : "Criar Novo Título"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Título</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: VIP, Trader Pro"
                  required
                />
              </div>
              <div>
                <Label htmlFor="icon">Ícone (emoji)</Label>
                <Input
                  id="icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="Ex: 👑, 💎, 🛡️"
                />
              </div>
              <div>
                <Label htmlFor="color">Cor (HSL)</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="Ex: hsl(45, 100%, 51%)"
                  required
                />
              </div>
              <div>
                <Label htmlFor="priority">Prioridade (maior = mais importante)</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingTitle ? "Atualizar" : "Criar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {titles?.map((title) => (
            <div
              key={title.id}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <Badge style={{ backgroundColor: title.color }} className="text-white">
                  {title.icon} {title.name}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Prioridade: {title.priority}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(title)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(title.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {!titles?.length && (
            <p className="text-center text-muted-foreground py-4">
              Nenhum título criado ainda
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};