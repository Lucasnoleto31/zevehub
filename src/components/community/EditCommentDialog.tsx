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
import { toast } from "sonner";

interface EditCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comment: {
    id: string;
    content: string;
    post_id: string;
  };
}

export function EditCommentDialog({
  open,
  onOpenChange,
  comment,
}: EditCommentDialogProps) {
  const [content, setContent] = useState(comment.content);
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("community_comments")
        .update({ content })
        .eq("id", comment.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comentário atualizado!");
      queryClient.invalidateQueries({ queryKey: ["post-comments", comment.post_id] });
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao atualizar comentário");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Comentário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={!content.trim() || updateMutation.isPending}
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
