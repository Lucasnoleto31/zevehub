import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, Film, X } from "lucide-react";

interface ReelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { id: "analise-tecnica", label: "Análise Técnica" },
  { id: "gestao-risco", label: "Gestão de Risco" },
  { id: "psicologia", label: "Psicologia" },
  { id: "setups", label: "Setups" },
  { id: "noticias", label: "Notícias" },
  { id: "dicas", label: "Dicas Rápidas" },
];

export const ReelUploadDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: ReelUploadDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setVideoFile(null);
    setThumbnailFile(null);
    setProgress(0);
    setVideoDuration(0);
    setVideoPreview(null);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("O vídeo deve ter no máximo 100MB");
      return;
    }

    // Check file type
    if (!file.type.startsWith("video/")) {
      toast.error("Selecione um arquivo de vídeo válido");
      return;
    }

    // Check duration
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      if (video.duration > 120) {
        toast.error("O vídeo deve ter no máximo 2 minutos");
        return;
      }
      setVideoDuration(Math.round(video.duration));
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    };
    video.src = URL.createObjectURL(file);
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }

    setThumbnailFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !category || !videoFile) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Upload video
      const videoExt = videoFile.name.split(".").pop();
      const videoPath = `${Date.now()}-${crypto.randomUUID()}.${videoExt}`;

      setProgress(20);

      const { error: videoError } = await supabase.storage
        .from("reels")
        .upload(videoPath, videoFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (videoError) throw videoError;

      setProgress(60);

      const { data: videoData } = supabase.storage
        .from("reels")
        .getPublicUrl(videoPath);

      let thumbnailUrl = null;

      // Upload thumbnail if provided
      if (thumbnailFile) {
        const thumbExt = thumbnailFile.name.split(".").pop();
        const thumbPath = `thumb-${Date.now()}-${crypto.randomUUID()}.${thumbExt}`;

        const { error: thumbError } = await supabase.storage
          .from("reels")
          .upload(thumbPath, thumbnailFile);

        if (!thumbError) {
          const { data: thumbData } = supabase.storage
            .from("reels")
            .getPublicUrl(thumbPath);
          thumbnailUrl = thumbData.publicUrl;
        }
      }

      setProgress(80);

      // Create reel record
      const { error: insertError } = await supabase.from("reels").insert({
        title,
        description: description || null,
        category,
        video_url: videoData.publicUrl,
        thumbnail_url: thumbnailUrl,
        duration_seconds: videoDuration,
        created_by: user.id,
      });

      if (insertError) throw insertError;

      setProgress(100);
      toast.success("Reel publicado com sucesso!");
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao publicar reel:", error);
      toast.error(error.message || "Erro ao publicar reel");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-pink-500" />
            Novo Reel
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Video Upload */}
          <div className="space-y-2">
            <Label>Vídeo (máx. 2 minutos, 100MB) *</Label>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              className="hidden"
            />
            {videoPreview ? (
              <div className="relative rounded-lg overflow-hidden bg-black aspect-[9/16] max-h-64">
                <video
                  src={videoPreview}
                  className="w-full h-full object-contain"
                  controls
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => {
                    setVideoFile(null);
                    setVideoPreview(null);
                    setVideoDuration(0);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full h-32 border-dashed flex flex-col gap-2"
                onClick={() => videoInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Clique para selecionar o vídeo
                </span>
              </Button>
            )}
            {videoDuration > 0 && (
              <p className="text-sm text-muted-foreground">
                Duração: {Math.floor(videoDuration / 60)}:
                {(videoDuration % 60).toString().padStart(2, "0")}
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Como identificar suporte e resistência"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do conteúdo..."
              rows={2}
              maxLength={300}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Thumbnail */}
          <div className="space-y-2">
            <Label>Thumbnail (opcional)</Label>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => thumbnailInputRef.current?.click()}
            >
              {thumbnailFile ? thumbnailFile.name : "Selecionar imagem de capa"}
            </Button>
          </div>

          {/* Progress */}
          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Enviando... {progress}%
              </p>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={uploading} className="flex-1">
              {uploading ? "Publicando..." : "Publicar Reel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
