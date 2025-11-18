import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Check, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ModerationPanel() {
  const queryClient = useQueryClient();

  const { data: reports } = useQuery({
    queryKey: ["post-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_reports")
        .select(`
          *,
          community_posts (
            id,
            content,
            category,
            status,
            profiles (full_name)
          ),
          profiles:reported_by (full_name)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: pendingPosts } = useQuery({
    queryKey: ["pending-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select(`
          *,
          profiles (full_name, avatar_url)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const reviewReportMutation = useMutation({
    mutationFn: async ({
      reportId,
      action,
      postId,
    }: {
      reportId: string;
      action: "approve" | "reject";
      postId: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Atualizar status da denúncia
      await supabase
        .from("post_reports")
        .update({
          status: action === "approve" ? "approved" : "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      // Se aprovado, remover o post
      if (action === "approve") {
        await supabase
          .from("community_posts")
          .update({ status: "removed" })
          .eq("id", postId);
      }
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.action === "approve"
          ? "Post removido com sucesso"
          : "Denúncia rejeitada"
      );
      queryClient.invalidateQueries({ queryKey: ["post-reports"] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: () => {
      toast.error("Erro ao processar denúncia");
    },
  });

  const approvePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await supabase
        .from("community_posts")
        .update({ status: "approved" })
        .eq("id", postId);
    },
    onSuccess: () => {
      toast.success("Post aprovado");
      queryClient.invalidateQueries({ queryKey: ["pending-posts"] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: () => {
      toast.error("Erro ao aprovar post");
    },
  });

  const rejectPostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await supabase
        .from("community_posts")
        .update({ status: "rejected" })
        .eq("id", postId);
    },
    onSuccess: () => {
      toast.success("Post rejeitado");
      queryClient.invalidateQueries({ queryKey: ["pending-posts"] });
    },
    onError: () => {
      toast.error("Erro ao rejeitar post");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Painel de Moderação</h2>
        <p className="text-muted-foreground">
          Gerencie denúncias e aprove posts da comunidade
        </p>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Denúncias ({reports?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Eye className="h-4 w-4" />
            Posts Pendentes ({pendingPosts?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4 mt-6">
          {reports && reports.length > 0 ? (
            reports.map((report: any) => (
              <Card key={report.id} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{report.reason}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(report.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Denunciado por: {report.profiles?.full_name || "Usuário"}
                      </p>
                    </div>
                  </div>

                  {report.description && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm">{report.description}</p>
                    </div>
                  )}

                  {report.community_posts && (
                    <div className="border-l-4 border-primary pl-4">
                      <p className="text-sm font-medium mb-1">
                        Post denunciado por{" "}
                        {report.community_posts.profiles?.full_name || "Usuário"}:
                      </p>
                      <p className="text-sm line-clamp-3">
                        {report.community_posts.content}
                      </p>
                      <Badge variant="outline" className="mt-2">
                        {report.community_posts.category}
                      </Badge>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        reviewReportMutation.mutate({
                          reportId: report.id,
                          action: "approve",
                          postId: report.post_id,
                        })
                      }
                      disabled={reviewReportMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remover Post
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        reviewReportMutation.mutate({
                          reportId: report.id,
                          action: "reject",
                          postId: report.post_id,
                        })
                      }
                      disabled={reviewReportMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Rejeitar Denúncia
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Nenhuma denúncia pendente</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4 mt-6">
          {pendingPosts && pendingPosts.length > 0 ? (
            pendingPosts.map((post: any) => (
              <Card key={post.id} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold">
                        {post.profiles?.full_name || "Usuário"}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    <Badge variant="outline">{post.category}</Badge>
                  </div>

                  <p className="text-sm">{post.content}</p>

                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt="Post"
                      className="rounded-lg max-h-64 object-cover"
                    />
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => approvePostMutation.mutate(post.id)}
                      disabled={approvePostMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Aprovar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => rejectPostMutation.mutate(post.id)}
                      disabled={rejectPostMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">Nenhum post pendente</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
