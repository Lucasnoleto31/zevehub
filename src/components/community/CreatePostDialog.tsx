import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
}

export function CreatePostDialog({
  open,
  onOpenChange,
  categories,
}: CreatePostDialogProps) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const queryClient = useQueryClient();

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("community_posts").insert({
        user_id: user.id,
        content,
        category,
      });

      if (error) throw error;

      // Adicionar 20 pontos por criar post
      await supabase.rpc("increment_column", {
        table_name: "profiles",
        row_id: user.id,
        column_name: "points",
        increment_value: 20,
      });
    },
    onSuccess: () => {
      toast.success("Post criado com sucesso! +20 pontos");
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      setContent("");
      setCategory("");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao criar post");
    },
  });

  const handleSubmit = () => {
    if (!content.trim() || !category) {
      toast.error("Preencha todos os campos");
      return;
    }
    createPostMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <Textarea
              placeholder="Compartilhe sua análise, estratégia ou dúvida..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createPostMutation.isPending}
            >
              {createPostMutation.isPending ? "Publicando..." : "Publicar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
