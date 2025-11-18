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
import { Send, ThumbsUp, Edit2, Trash2, MoreVertical } from "lucide-react";
import { BadgeUnlockModal } from "./BadgeUnlockModal";
import { UserMentionSelector } from "./UserMentionSelector";
import { EditCommentDialog } from "./EditCommentDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CommentsSectionProps {
  postId: string;
}

export function CommentsSection({ postId }: CommentsSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [unlockedBadge, setUnlockedBadge] = useState<any>(null);
  const [showMentionSelector, setShowMentionSelector] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [editingComment, setEditingComment] = useState<any>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Pegar usuário atual
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

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
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX,
        });
      }
    } else if (lastChar === "@") {
      setShowMentionSelector(true);
      setMentionSearch("");
      
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setMentionPosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX,
        });
      }
    } else {
      setShowMentionSelector(false);
    }
  }, [newComment]);

  const { data: comments, isLoading } = useQuery({
    queryKey: ["post-comments", postId],
    queryFn: async () => {
      // Buscar comentários
      const { data: commentsData, error: commentsError } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (commentsError) {
        console.error("Error loading comments:", commentsError);
        throw commentsError;
      }

      if (!commentsData || commentsData.length === 0) {
        return [];
      }

      // Buscar perfis dos usuários dos comentários
      const userIds = commentsData.map(comment => comment.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, level")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error loading profiles:", profilesError);
        throw profilesError;
      }

      // Combinar comentários com perfis
      const commentsWithProfiles = commentsData.map(comment => ({
        ...comment,
        profiles: profilesData?.find(profile => profile.id === comment.user_id) || null
      }));

      return commentsWithProfiles;
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("community_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comentário excluído!");
      queryClient.invalidateQueries({ queryKey: ["post-comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["post-comments-count", postId] });
      setDeletingCommentId(null);
    },
    onError: () => {
      toast.error("Erro ao excluir comentário");
    },
  });

  const likeCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!currentUserId) return;

      // Verificar se já curtiu
      const { data: existing } = await supabase
        .from("comment_likes")
        .select("id")
        .eq("comment_id", commentId)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (existing) {
        // Remover curtida
        await supabase
          .from("comment_likes")
          .delete()
          .eq("id", existing.id);

        await supabase.rpc("increment_column", {
          table_name: "community_comments",
          row_id: commentId,
          column_name: "likes",
          increment_value: -1,
        });
      } else {
        // Adicionar curtida
        await supabase
          .from("comment_likes")
          .insert({
            comment_id: commentId,
            user_id: currentUserId,
          });

        await supabase.rpc("increment_column", {
          table_name: "community_comments",
          row_id: commentId,
          column_name: "likes",
          increment_value: 1,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-comments", postId] });
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
            <div key={comment.id} className="flex gap-3 group">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  {comment.profiles?.full_name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 justify-between">
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
                  {currentUserId === comment.user_id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingComment(comment)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingCommentId(comment.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <p className="text-sm">{comment.content}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2"
                  onClick={() => likeCommentMutation.mutate(comment.id)}
                >
                  <ThumbsUp className="h-3 w-3" />
                  <span className="text-xs">{comment.likes || 0}</span>
                </Button>
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

      {editingComment && (
        <EditCommentDialog
          open={!!editingComment}
          onOpenChange={(open) => !open && setEditingComment(null)}
          comment={editingComment}
        />
      )}

      <AlertDialog open={!!deletingCommentId} onOpenChange={(open) => !open && setDeletingCommentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comentário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O comentário será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCommentId && deleteCommentMutation.mutate(deletingCommentId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
