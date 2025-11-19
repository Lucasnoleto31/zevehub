import { useState, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { X, Image, Smile, Paperclip } from "lucide-react";
import { BadgeUnlockModal } from "./BadgeUnlockModal";
import { HashtagAutocomplete } from "./HashtagAutocomplete";
import { UserMentionSelector } from "./UserMentionSelector";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePostDialog({
  open,
  onOpenChange,
}: CreatePostDialogProps) {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [unlockedBadge, setUnlockedBadge] = useState<any>(null);
  const [detectedTags, setDetectedTags] = useState<string[]>([]);
  const [showHashtagAutocomplete, setShowHashtagAutocomplete] = useState(false);
  const [hashtagSearch, setHashtagSearch] = useState("");
  const [hashtagPosition, setHashtagPosition] = useState({ top: 0, left: 0 });
  const [showMentionSelector, setShowMentionSelector] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Detectar hashtags no conteúdo
  const detectHashtags = (text: string) => {
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
    const matches = text.match(hashtagRegex);
    if (matches) {
      const tags = matches.map(tag => tag.slice(1).toLowerCase());
      setDetectedTags([...new Set(tags)]);
    } else {
      setDetectedTags([]);
    }
  };

  const handleContentChange = (value: string, selectionStart: number) => {
    setContent(value);
    setCursorPosition(selectionStart);
    detectHashtags(value);

    // Detectar se está digitando hashtag ou menção
    const textBeforeCursor = value.substring(0, selectionStart);
    const words = textBeforeCursor.split(/\s/);
    const lastWord = words[words.length - 1];

    // Hashtag
    if (lastWord.startsWith("#") && lastWord.length > 1) {
      setShowHashtagAutocomplete(true);
      setHashtagSearch(lastWord.slice(1));
      setShowMentionSelector(false);
      
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setHashtagPosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX,
        });
      }
    } 
    // Menção
    else if (lastWord.startsWith("@") && lastWord.length > 1) {
      setShowMentionSelector(true);
      setMentionSearch(lastWord.slice(1));
      setShowHashtagAutocomplete(false);
      
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setMentionPosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX,
        });
      }
    } 
    // Apenas @ ou #
    else if (lastWord === "@") {
      setShowMentionSelector(true);
      setMentionSearch("");
      setShowHashtagAutocomplete(false);
      
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setMentionPosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX,
        });
      }
    } else if (lastWord === "#") {
      setShowHashtagAutocomplete(true);
      setHashtagSearch("");
      setShowMentionSelector(false);
      
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setHashtagPosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX,
        });
      }
    } else {
      setShowHashtagAutocomplete(false);
      setShowMentionSelector(false);
    }
  };

  const handleSelectHashtag = (hashtag: string) => {
    const textBeforeCursor = content.substring(0, cursorPosition);
    const textAfterCursor = content.substring(cursorPosition);
    const words = textBeforeCursor.split(/\s/);
    words[words.length - 1] = `#${hashtag} `;
    const newContent = words.join(" ") + textAfterCursor;
    setContent(newContent);
    setShowHashtagAutocomplete(false);
    detectHashtags(newContent);
  };

  const handleSelectUser = (username: string) => {
    const textBeforeCursor = content.substring(0, cursorPosition);
    const textAfterCursor = content.substring(cursorPosition);
    const words = textBeforeCursor.split(/\s/);
    words[words.length - 1] = `@${username} `;
    const newContent = words.join(" ") + textAfterCursor;
    setContent(newContent);
    setShowMentionSelector(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem muito grande. Máximo 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 10MB");
        return;
      }
      setAttachmentFile(file);
    }
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
  };

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let imageUrl = null;

      // Upload da imagem se existir
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("community-posts")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("community-posts").getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Upload do anexo se existir
      let attachmentUrl = null;
      if (attachmentFile) {
        const fileExt = attachmentFile.name.split(".").pop();
        const fileName = `${user.id}/attachments/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("community-posts")
          .upload(fileName, attachmentFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("community-posts").getPublicUrl(fileName);

        attachmentUrl = publicUrl;
      }

      // Criar post
      const { data: newPost, error } = await supabase
        .from("community_posts")
        .insert({
          user_id: user.id,
          content,
          category: detectedTags[0] || "geral",
          tags: detectedTags,
          image_url: imageUrl,
          attachment_url: attachmentUrl,
        })
        .select()
        .single();

      if (error) throw error;

      // Processar menções
      if (newPost) {
        await supabase.rpc("process_mentions", {
          p_content: content,
          p_post_id: newPost.id,
          p_mentioned_by: user.id,
        });
      }

      // Adicionar 20 pontos por criar post
      await supabase.rpc("increment_column", {
        table_name: "profiles",
        row_id: user.id,
        column_name: "points",
        increment_value: 20,
      });

      // Verificar badges
      const { data: badges } = await supabase.rpc("check_and_award_badges", {
        p_user_id: user.id,
      });

      if (badges && badges.length > 0) {
        const newBadge = badges[0];
        setUnlockedBadge(newBadge);
      }
    },
    onSuccess: () => {
      toast.success("Post criado com sucesso! +5 pontos");
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-badges"] });
      setContent("");
      setDetectedTags([]);
      setImageFile(null);
      setImagePreview(null);
      setAttachmentFile(null);
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao criar post");
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error("Escreva algo para publicar");
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
            <Label>Conteúdo</Label>
            <Textarea
              ref={textareaRef}
              placeholder="Compartilhe sua análise, estratégia ou dúvida... Use # para tags e @ para mencionar usuários"
              value={content}
              onChange={(e) => handleContentChange(e.target.value, e.target.selectionStart)}
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
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imagem (opcional)</Label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Image className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Clique para adicionar uma imagem
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Máximo 5MB
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Anexo (opcional)</Label>
            {attachmentFile ? (
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <Paperclip className="w-4 h-4" />
                <span className="text-sm flex-1">{attachmentFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removeAttachment}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Input
                  id="attachment-upload"
                  type="file"
                  onChange={handleAttachmentChange}
                  className="hidden"
                />
                <label
                  htmlFor="attachment-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Paperclip className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Clique para adicionar um arquivo
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Máximo 10MB - PDFs, documentos, planilhas, etc.
                  </span>
                </label>
              </div>
            )}
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

      {showHashtagAutocomplete && (
        <HashtagAutocomplete
          searchTerm={hashtagSearch}
          onSelectHashtag={handleSelectHashtag}
          position={hashtagPosition}
        />
      )}

      {showMentionSelector && (
        <UserMentionSelector
          searchTerm={mentionSearch}
          onSelectUser={handleSelectUser}
          position={mentionPosition}
        />
      )}

      <BadgeUnlockModal
        open={!!unlockedBadge}
        onOpenChange={(open) => !open && setUnlockedBadge(null)}
        badge={unlockedBadge}
      />
    </Dialog>
  );
}
