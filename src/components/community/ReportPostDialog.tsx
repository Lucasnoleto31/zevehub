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
import { AlertTriangle } from "lucide-react";

interface ReportPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
}

const REPORT_REASONS = [
  "Spam ou Publicidade",
  "Conteúdo Ofensivo",
  "Informação Falsa",
  "Violação de Privacidade",
  "Manipulação de Mercado",
  "Outro"
];

export function ReportPostDialog({
  open,
  onOpenChange,
  postId,
}: ReportPostDialogProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const reportMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("post_reports").insert({
        post_id: postId,
        reported_by: user.id,
        reason,
        description,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Denúncia enviada. Nossa equipe irá avaliar em breve.");
      setReason("");
      setDescription("");
      onOpenChange(false);
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Você já denunciou este post");
      } else {
        toast.error("Erro ao enviar denúncia");
      }
    },
  });

  const handleSubmit = () => {
    if (!reason) {
      toast.error("Selecione um motivo");
      return;
    }
    reportMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Denunciar Post
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ajude-nos a manter a comunidade segura. Todas as denúncias são
            analisadas pela nossa equipe de moderação.
          </p>

          <div className="space-y-2">
            <Label>Motivo da denúncia</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Detalhes (opcional)</Label>
            <Textarea
              placeholder="Descreva o problema em mais detalhes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={reportMutation.isPending}
            >
              {reportMutation.isPending ? "Enviando..." : "Enviar Denúncia"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
