import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart, ThumbsUp, ThumbsDown, MessageCircle, Share2, MoreVertical, Edit, Trash2, Flag, FileText, Download, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CommentsSection } from "./CommentsSection";
import { ReportPostDialog } from "./ReportPostDialog";
import { EditPostDialog } from "./EditPostDialog";
import { PostContent } from "./PostContent";
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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface PostCardProps {
  post: any;
}

const CATEGORIES = [
  "Análises Técnicas",
  "Ações",
  "FIIs",
  "Criptomoedas",
  "Estratégias de Trading",
  "Macroeconomia",
  "Resultados dos Robôs",
  "Dúvidas",
  "Avisos Importantes"
];

export function PostCard({ post }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Get current user and check admin status
  supabase.auth.getUser().then(async ({ data }) => {
    setCurrentUserId(data.user?.id || null);
    if (data.user) {
      const { data: adminCheck } = await supabase.rpc("is_admin", {
        _user_id: data.user.id,
      });
      setIsAdmin(adminCheck || false);
    }
  });

  // Get user titles
  const { data: userTitles } = useQuery({
    queryKey: ["user-titles", post.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_community_titles")
        .select(`
          community_titles (
            name,
            color,
            icon
          )
        `)
        .eq("user_id", post.user_id);
      
      return data?.map(item => item.community_titles).filter(Boolean) || [];
    },
  });

  // Check user's reaction on this post
  const { data: userReaction } = useQuery({
    queryKey: ["post-reaction", post.id, currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const { data } = await supabase
        .from("post_reactions")
        .select("*")
        .eq("post_id", post.id)
        .eq("user_id", currentUserId)
        .maybeSingle();
      return data;
    },
    enabled: !!currentUserId,
  });

  // Get reaction counts
  const { data: reactionCounts } = useQuery({
    queryKey: ["post-reaction-counts", post.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_post_reactions", {
        p_post_id: post.id,
      });
      return data?.[0] || { love_count: 0, like_count: 0, dislike_count: 0 };
    },
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

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      queryClient.invalidateQueries({ queryKey: ["user-posts"] });
    },
    onError: () => {
      toast.error("Erro ao excluir post");
    },
  });

  const reactionMutation = useMutation({
    mutationFn: async (reactionType: 'love' | 'like' | 'dislike') => {
      if (!currentUserId) throw new Error("Usuário não autenticado");

      if (userReaction) {
        if (userReaction.reaction_type === reactionType) {
          // Remove reaction if clicking the same one
          await supabase.from("post_reactions").delete().eq("id", userReaction.id);
        } else {
          // Update to new reaction
          await supabase
            .from("post_reactions")
            .update({ reaction_type: reactionType })
            .eq("id", userReaction.id);
        }
      } else {
        // Create new reaction
        await supabase.from("post_reactions").insert({
          post_id: post.id,
          user_id: currentUserId,
          reaction_type: reactionType,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-reaction", post.id] });
      queryClient.invalidateQueries({ queryKey: ["post-reaction-counts", post.id] });
    },
    onError: () => {
      toast.error("Erro ao reagir");
    },
  });

  return (
    <Card className="p-6 space-y-4 hover:shadow-lg transition-shadow">
      {/* Header do post */}
      <div className="flex items-start justify-between">
        <div 
          className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate(`/perfil/${post.user_id}`)}
        >
          <Avatar>
            <AvatarImage src={post.profiles?.avatar_url} />
            <AvatarFallback>
              {post.profiles?.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">{post.profiles?.full_name || "Usuário"}</p>
              <Badge variant="secondary" className="text-xs">
                Nível {post.profiles?.level || 1}
              </Badge>
              {userTitles?.map((title: any, index: number) => (
                <Badge 
                  key={index}
                  style={{ backgroundColor: title.color }}
                  className="text-white text-xs hover:animate-glow transition-all cursor-default"
                >
                  {title.icon} {title.name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{post.category}</Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {currentUserId === post.user_id && (
                <>
                  <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
              {currentUserId !== post.user_id && (
                <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                  <Flag className="h-4 w-4 mr-2" />
                  Denunciar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="space-y-3">
        <p className="text-foreground whitespace-pre-wrap">
          <PostContent content={post.content} />
        </p>
        
        {/* Galeria de imagens com carrossel */}
        {post.image_urls && post.image_urls.length > 0 ? (
          <div className="relative">
            <Carousel className="w-full">
              <CarouselContent>
                {post.image_urls.map((imageUrl: string, index: number) => (
                  <CarouselItem key={index}>
                    <div className="relative">
                      <img
                        src={imageUrl}
                        alt={`Post image ${index + 1}`}
                        className="rounded-lg w-full max-h-[500px] object-cover"
                      />
                      <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                        {index + 1} / {post.image_urls.length}
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {post.image_urls.length > 1 && (
                <>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </>
              )}
            </Carousel>
          </div>
        ) : post.image_url ? (
          <img
            src={post.image_url}
            alt="Post image"
            className="rounded-lg w-full max-h-96 object-cover"
          />
        ) : null}
        
        {post.attachment_url && (
          <div className="border rounded-lg overflow-hidden">
            {post.attachment_url.toLowerCase().endsWith('.pdf') ? (
              <div className="space-y-2">
                <div className="bg-muted/50 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Documento PDF</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAttachmentPreview(true)}
                    >
                      <Maximize2 className="h-4 w-4 mr-1" />
                      Ver completo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(post.attachment_url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                <iframe
                  src={post.attachment_url}
                  className="w-full h-96 border-0"
                  title="PDF Preview"
                />
              </div>
            ) : (
              <div className="bg-muted/50 p-6 flex flex-col items-center gap-3">
                <FileText className="h-12 w-12 text-primary" />
                <div className="text-center">
                  <p className="font-medium">Documento anexado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {post.attachment_url.split('/').pop()?.split('?')[0] || 'arquivo'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(post.attachment_url, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reações */}
      <div className="flex items-center gap-4 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => reactionMutation.mutate('love')}
          className={`gap-2 ${userReaction?.reaction_type === 'love' ? 'text-red-500' : ''}`}
        >
          <Heart
            className={`h-4 w-4 ${userReaction?.reaction_type === 'love' ? 'fill-red-500' : ''}`}
          />
          <span>{reactionCounts?.love_count || 0}</span>
          <span className="text-xs">Amei</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => reactionMutation.mutate('like')}
          className={`gap-2 ${userReaction?.reaction_type === 'like' ? 'text-primary' : ''}`}
        >
          <ThumbsUp
            className={`h-4 w-4 ${userReaction?.reaction_type === 'like' ? 'fill-primary' : ''}`}
          />
          <span>{reactionCounts?.like_count || 0}</span>
          <span className="text-xs">Joinha</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => reactionMutation.mutate('dislike')}
          className={`gap-2 ${userReaction?.reaction_type === 'dislike' ? 'text-muted-foreground' : ''}`}
        >
          <ThumbsDown
            className={`h-4 w-4 ${userReaction?.reaction_type === 'dislike' ? 'fill-muted-foreground' : ''}`}
          />
          <span>{reactionCounts?.dislike_count || 0}</span>
          <span className="text-xs">Deslike</span>
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
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2"
          onClick={() => {
            const postUrl = `${window.location.origin}/comunidade`;
            const shareText = `Confira este post na comunidade: ${post.content.substring(0, 100)}...`;
            
            if (navigator.share) {
              navigator.share({
                title: 'Compartilhar Post',
                text: shareText,
                url: postUrl,
              }).catch(() => {
                navigator.clipboard.writeText(postUrl);
                toast.success("Link copiado para a área de transferência!");
              });
            } else {
              navigator.clipboard.writeText(postUrl);
              toast.success("Link copiado para a área de transferência!");
            }
          }}
        >
          <Share2 className="h-4 w-4" />
          Compartilhar
        </Button>
      </div>

      {/* Seção de comentários */}
      {showComments && <CommentsSection postId={post.id} />}

      <ReportPostDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        postId={post.id}
      />

      <EditPostDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        post={{
          id: post.id,
          content: post.content,
          category: post.category,
          tags: post.tags,
        }}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este post? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de preview em tela cheia para PDFs */}
      {post.attachment_url?.toLowerCase().endsWith('.pdf') && (
        <AlertDialog open={showAttachmentPreview} onOpenChange={setShowAttachmentPreview}>
          <AlertDialogContent className="max-w-6xl h-[90vh]">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center justify-between">
                <span>Visualização do Documento</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(post.attachment_url, '_blank')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </AlertDialogTitle>
            </AlertDialogHeader>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={post.attachment_url}
                className="w-full h-full border-0 rounded"
                title="PDF Full Preview"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
