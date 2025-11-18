import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { BadgeUnlockModal } from "./BadgeUnlockModal";
import { UserMentionSelector } from "./UserMentionSelector";

interface CommentsSectionProps {
  postId: string;
}

export function CommentsSection({ postId }: CommentsSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [unlockedBadge, setUnlockedBadge] = useState<any>(null);
  const [showMentionSelector, setShowMentionSelector] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Detectar @ para mostrar seletor de usuários
  useEffect(() => {
    const lastChar = newComment.slice(-1);
    const words = newComment.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith("@") && lastWord.length > 1) {
      setShowMentionSelector(true);
      setMentionSearch(lastWord.slice(1));
      
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setMentionPosition({
          top: rect.bottom + 5,
          left: rect.left,
        });
      }
    } else if (lastChar === "@") {
      setShowMentionSelector(true);
      setMentionSearch("");
      
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setMentionPosition({
          top: rect.bottom + 5,
          left: rect.left,
        });
      }
    } else {
      setShowMentionSelector(false);
    }
  }, [newComment]);

  const { data: comments, isLoading } = useQuery({
    queryKey: ["post-comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_comments")
        .select(`
          *,
          profiles!community_comments_user_id_fkey (
            full_name,
            avatar_url,
            level
          )
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading comments:", error);
        throw error;
      }
      return data;
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: newCommentData, error } = await supabase
        .from("community_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment,
        })
        .select()
        .single();

      if (error) throw error;

      // Processar menções
      if (newCommentData) {
        await supabase.rpc("process_mentions", {
          p_content: newComment,
          p_comment_id: newCommentData.id,
          p_mentioned_by: user.id,
        });
      }

      // Adicionar 5 pontos por comentar
      await supabase.rpc("increment_column", {
        table_name: "profiles",
        row_id: user.id,
        column_name: "points",
        increment_value: 5,
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
      toast.success("Comentário adicionado! +5 pontos");
      queryClient.invalidateQueries({ queryKey: ["post-comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["post-comments-count", postId] });
      queryClient.invalidateQueries({ queryKey: ["user-badges"] });
      setNewComment("");
    },
    onError: () => {
      toast.error("Erro ao adicionar comentário");
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate();
  };

  const handleSelectUser = (username: string) => {
    const words = newComment.split(/\s/);
    words[words.length - 1] = `@${username} `;
    setNewComment(words.join(" "));
    setShowMentionSelector(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <h4 className="font-semibold">Comentários</h4>

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando comentários...</p>
        ) : comments && comments.length > 0 ? (
          comments.map((comment: any) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  {comment.profiles?.full_name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">
                    {comment.profiles?.full_name || "Usuário"}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    Nível {comment.profiles?.level || 1}
                  </Badge>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <p className="text-sm">{comment.content}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum comentário ainda. Seja o primeiro!
          </p>
        )}
      </div>

      <div className="relative">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            placeholder="Adicione um comentário... Use @ para mencionar alguém"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px]"
          />
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || createCommentMutation.isPending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {showMentionSelector && (
          <UserMentionSelector
            searchTerm={mentionSearch}
            onSelectUser={handleSelectUser}
            position={mentionPosition}
          />
        )}
      </div>

      <BadgeUnlockModal
        open={!!unlockedBadge}
        onOpenChange={(open) => !open && setUnlockedBadge(null)}
        badge={unlockedBadge}
      />
    </div>
  );
}
