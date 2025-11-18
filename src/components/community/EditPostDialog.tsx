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

interface EditPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    content: string;
    category: string;
  };
  categories: string[];
}

export function EditPostDialog({
  open,
  onOpenChange,
  post,
  categories,
}: EditPostDialogProps) {
  const [content, setContent] = useState(post.content);
  const [category, setCategory] = useState(post.category);
  const queryClient = useQueryClient();

  const editMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("community_posts")
        .update({
          content,
          category,
        })
        .eq("id", post.id);

      if (error) throw error;

      // Processar menções
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.rpc("process_mentions", {
          p_content: content,
          p_post_id: post.id,
          p_mentioned_by: user.id,
        });
      }
    },
    onSuccess: () => {
      toast.success("Post atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar post");
    },
  });

  const handleSubmit = () => {
    if (!content.trim() || !category) {
      toast.error("Preencha todos os campos");
      return;
    }
    editMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Post</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
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
            <p className="text-xs text-muted-foreground">
              Use @nome para mencionar outros usuários
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={editMutation.isPending}>
              {editMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
