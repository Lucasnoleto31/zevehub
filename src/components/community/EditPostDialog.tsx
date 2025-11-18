import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface EditPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    content: string;
    category: string;
    tags?: string[];
  };
}

export function EditPostDialog({
  open,
  onOpenChange,
  post,
}: EditPostDialogProps) {
  const [content, setContent] = useState(post.content);
  const [detectedTags, setDetectedTags] = useState<string[]>(post.tags || []);
  const queryClient = useQueryClient();

  // Detectar hashtags no conteúdo
  useEffect(() => {
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
    const matches = content.match(hashtagRegex);
    if (matches) {
      const tags = matches.map(tag => tag.slice(1).toLowerCase());
      setDetectedTags([...new Set(tags)]);
    } else {
      setDetectedTags([]);
    }
  }, [content]);

  const editMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("community_posts")
        .update({
          content,
          category: detectedTags[0] || "geral",
          tags: detectedTags,
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
    if (!content.trim()) {
      toast.error("Escreva algo para publicar");
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
            <Label>Conteúdo</Label>
            <Textarea
              placeholder="Compartilhe sua análise, estratégia ou dúvida... Use # para tags"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Use @nome para mencionar outros usuários e # para adicionar hashtags
              </p>
              {detectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-medium">Tags detectadas:</span>
                  {detectedTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
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
