import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { PostCard } from "@/components/community/PostCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Hash, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function HashtagPage() {
  const { hashtag } = useParams();
  const navigate = useNavigate();

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data } = await supabase.rpc("is_admin", { _user_id: user.id });
      return data || false;
    },
  });

  const { data: posts, isLoading } = useQuery({
    queryKey: ["hashtag-posts", hashtag],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select(`
          *,
          profiles!community_posts_user_id_fkey (
            full_name,
            avatar_url,
            level,
            points
          )
        `)
        .contains("tags", [hashtag?.toLowerCase()])
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["hashtag-stats", hashtag],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("created_at")
        .contains("tags", [hashtag?.toLowerCase()]);

      if (error) throw error;

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const total = data.length;
      const last24hCount = data.filter(p => new Date(p.created_at) > last24h).length;
      const last7dCount = data.filter(p => new Date(p.created_at) > last7d).length;

      return { total, last24h: last24hCount, last7d: last7dCount };
    },
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar isAdmin={isAdmin || false} />
        
        <main className="flex-1 bg-background">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger />
            <Button variant="ghost" size="sm" onClick={() => navigate("/comunidade")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </header>

          <div className="container max-w-4xl mx-auto p-4 md:p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Hash className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">#{hashtag}</h1>
                  <p className="text-muted-foreground">
                    {stats?.total || 0} posts usando esta tag
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total de Posts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.total || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Últimas 24h
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.last24h || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Última Semana</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.last7d || 0}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Posts Recentes</h2>
                {isLoading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="border rounded-lg p-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ))}
                  </>
                ) : posts && posts.length > 0 ? (
                  posts.map((post) => <PostCard key={post.id} post={post} />)
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground">Nenhum post encontrado com esta hashtag</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
