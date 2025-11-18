import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CommentsSection } from "./CommentsSection";

interface PostCardProps {
  post: any;
}

export function PostCard({ post }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  supabase.auth.getUser().then(({ data }) => {
    setCurrentUserId(data.user?.id || null);
  });

  // Check if user liked this post
  const { data: userLike } = useQuery({
    queryKey: ["post-like", post.id, currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const { data } = await supabase
        .from("post_likes")
        .select("*")
        .eq("post_id", post.id)
        .eq("user_id", currentUserId)
        .maybeSingle();
      return data;
    },
    enabled: !!currentUserId,
  });

  // Get comments count
  const { data: commentsCount } = useQuery({
    queryKey: ["post-comments-count", post.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("community_comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id);
      return count || 0;
    },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!currentUserId) throw new Error("Usuário não autenticado");

      if (userLike) {
        // Unlike
        await supabase.from("post_likes").delete().eq("id", userLike.id);
        await supabase.rpc("increment_column", {
          table_name: "community_posts",
          row_id: post.id,
          column_name: "likes",
          increment_value: -1,
        });
      } else {
        // Like
        await supabase.from("post_likes").insert({
          post_id: post.id,
          user_id: currentUserId,
        });
        await supabase.rpc("increment_column", {
          table_name: "community_posts",
          row_id: post.id,
          column_name: "likes",
          increment_value: 1,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      queryClient.invalidateQueries({ queryKey: ["post-like", post.id] });
    },
    onError: () => {
      toast.error("Erro ao curtir post");
    },
  });

  return (
    <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
      {/* Header do post */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={post.profiles?.avatar_url} />
            <AvatarFallback>
              {post.profiles?.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{post.profiles?.full_name || "Usuário"}</p>
              <Badge variant="secondary" className="text-xs">
                Nível {post.profiles?.level || 1}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </p>
          </div>
        </div>
        <Badge variant="outline">{post.category}</Badge>
      </div>

      {/* Conteúdo */}
      <div className="space-y-3">
        <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post image"
            className="rounded-lg w-full max-h-96 object-cover"
          />
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-4 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => likeMutation.mutate()}
          className="gap-2"
        >
          <Heart
            className={`h-4 w-4 ${userLike ? "fill-red-500 text-red-500" : ""}`}
          />
          <span>{post.likes}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(!showComments)}
          className="gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{commentsCount}</span>
        </Button>
        <Button variant="ghost" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Compartilhar
        </Button>
      </div>

      {/* Seção de comentários */}
      {showComments && <CommentsSection postId={post.id} />}
    </Card>
  );
}
