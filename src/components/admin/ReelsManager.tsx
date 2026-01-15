import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Eye, Heart, Play, Film } from "lucide-react";
import { ReelUploadDialog } from "./ReelUploadDialog";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Reel {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string;
  duration_seconds: number | null;
  views_count: number;
  likes_count: number;
  is_active: boolean;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  "analise-tecnica": { label: "Análise Técnica", color: "bg-blue-500" },
  "gestao-risco": { label: "Gestão de Risco", color: "bg-red-500" },
  "psicologia": { label: "Psicologia", color: "bg-purple-500" },
  "setups": { label: "Setups", color: "bg-green-500" },
  "noticias": { label: "Notícias", color: "bg-yellow-500" },
  "dicas": { label: "Dicas Rápidas", color: "bg-cyan-500" },
};

export const ReelsManager = () => {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  const fetchReels = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reels")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar reels:", error);
      toast.error("Erro ao carregar reels");
    } else {
      setReels(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReels();
  }, []);

  const toggleActive = async (reel: Reel) => {
    const { error } = await supabase
      .from("reels")
      .update({ is_active: !reel.is_active })
      .eq("id", reel.id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(reel.is_active ? "Reel desativado" : "Reel ativado");
      fetchReels();
    }
  };

  const deleteReel = async (reel: Reel) => {
    // Delete from storage first
    const videoPath = reel.video_url.split("/").pop();
    if (videoPath) {
      await supabase.storage.from("reels").remove([videoPath]);
    }

    if (reel.thumbnail_url) {
      const thumbPath = reel.thumbnail_url.split("/").pop();
      if (thumbPath) {
        await supabase.storage.from("reels").remove([thumbPath]);
      }
    }

    // Delete from database
    const { error } = await supabase.from("reels").delete().eq("id", reel.id);

    if (error) {
      toast.error("Erro ao excluir reel");
    } else {
      toast.success("Reel excluído com sucesso");
      fetchReels();
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Film className="h-6 w-6 text-pink-500" />
          <h2 className="text-xl font-bold text-foreground">
            Gerenciar Reels
          </h2>
          <Badge variant="secondary">{reels.length} reels</Badge>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Reel
        </Button>
      </div>

      {reels.length === 0 ? (
        <Card className="p-8 text-center">
          <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum reel cadastrado ainda</p>
          <Button
            onClick={() => setUploadOpen(true)}
            className="mt-4"
            variant="outline"
          >
            Criar primeiro reel
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reels.map((reel, index) => {
            const categoryInfo = CATEGORY_LABELS[reel.category] || {
              label: reel.category,
              color: "bg-primary",
            };

            return (
              <motion.div
                key={reel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Thumbnail */}
                    <div className="relative w-20 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {reel.thumbnail_url ? (
                        <img
                          src={reel.thumbnail_url}
                          alt={reel.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                        {formatDuration(reel.duration_seconds)}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-foreground truncate">
                            {reel.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {reel.description || "Sem descrição"}
                          </p>
                        </div>
                        <Badge
                          className={`${categoryInfo.color} text-white border-0 flex-shrink-0`}
                        >
                          {categoryInfo.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {reel.views_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" />
                          {reel.likes_count}
                        </span>
                        <span>
                          {new Date(reel.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {reel.is_active ? "Ativo" : "Inativo"}
                        </span>
                        <Switch
                          checked={reel.is_active}
                          onCheckedChange={() => toggleActive(reel)}
                        />
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Reel</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir "{reel.title}"? Esta
                              ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteReel(reel)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <ReelUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={fetchReels}
      />
    </div>
  );
};
