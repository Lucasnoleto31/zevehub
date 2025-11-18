import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard } from "@/components/community/PostCard";
import { UserPlus, UserMinus, Award, TrendingUp, Users, Calendar, MessageCircle, Heart, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { FollowersDialog } from "@/components/community/FollowersDialog";

export default function PublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);
  const [followersDialogTab, setFollowersDialogTab] = useState<"followers" | "following">("followers");

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", userId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return false;
      
      const { data } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", userId)
        .single();

      return !!data;
    },
    enabled: !!currentUser && currentUser.id !== userId,
  });

  const { data: posts } = useQuery({
    queryKey: ["user-posts", userId],
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
        .eq("user_id", userId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: badges } = useQuery({
    queryKey: ["user-badges", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data;
    },
  });

  const { data: userTitles } = useQuery({
    queryKey: ["user-titles", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_community_titles")
        .select(`
          community_titles (
            name,
            color,
            icon,
            priority
          )
        `)
        .eq("user_id", userId);

      return data?.map(item => item.community_titles)
        .filter(Boolean)
        .sort((a: any, b: any) => b.priority - a.priority) || [];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["user-stats", userId],
    queryFn: async () => {
      // Contar total de reações
      const { data: reactionsData } = await supabase
        .from("post_reactions")
        .select("id")
        .in("post_id", posts?.map(p => p.id) || []);

      // Contar total de comentários
      const { data: commentsData } = await supabase
        .from("community_comments")
        .select("id")
        .in("post_id", posts?.map(p => p.id) || []);

      return {
        totalPosts: posts?.length || 0,
        totalReactions: reactionsData?.length || 0,
        totalComments: commentsData?.length || 0,
      };
    },
    enabled: !!posts,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", currentUser?.id)
          .eq("following_id", userId);
      } else {
        await supabase
          .from("user_follows")
          .insert({
            follower_id: currentUser?.id,
            following_id: userId,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["is-following", userId] });
      queryClient.invalidateQueries({ queryKey: ["public-profile", userId] });
      toast.success(isFollowing ? "Deixou de seguir" : "Seguindo!");
    },
  });

  if (profileLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Carregando perfil...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">Perfil não encontrado</div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-4 gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>
      
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {profile.full_name?.[0]?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center gap-3 justify-center sm:justify-start mb-2 flex-wrap">
                <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                <Badge variant="secondary">Level {profile.level}</Badge>
                {userTitles?.map((title: any, index: number) => (
                  <Badge
                    key={index}
                    style={{ backgroundColor: title.color }}
                    className="text-white hover:animate-glow transition-all cursor-default"
                  >
                    {title.icon} {title.name}
                  </Badge>
                ))}
                {profile.daily_login_streak > 0 && (
                  <Badge variant="outline" className="gap-1">
                    🔥 {profile.daily_login_streak} dias
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground justify-center sm:justify-start flex-wrap">
                <button
                  onClick={() => {
                    setFollowersDialogTab("followers");
                    setFollowersDialogOpen(true);
                  }}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Users className="h-4 w-4" />
                  <span>{profile.followers_count || 0} seguidores</span>
                </button>
                <button
                  onClick={() => {
                    setFollowersDialogTab("following");
                    setFollowersDialogOpen(true);
                  }}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Users className="h-4 w-4" />
                  <span>{profile.following_count || 0} seguindo</span>
                </button>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>{profile.points} pontos</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Membro desde {formatDistanceToNow(new Date(profile.created_at), {
                      addSuffix: false,
                      locale: ptBR,
                    })}
                  </span>
                </div>
              </div>

              {!isOwnProfile && currentUser && (
                <Button
                  onClick={() => followMutation.mutate()}
                  variant={isFollowing ? "outline" : "default"}
                  className="mt-4"
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="h-4 w-4 mr-2" />
                      Deixar de Seguir
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Seguir
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold">{stats?.totalPosts || 0}</div>
                <div className="text-sm text-muted-foreground">Posts</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold flex items-center justify-center gap-1">
                  <Heart className="h-5 w-5 text-red-500" />
                  {stats?.totalReactions || 0}
                </div>
                <div className="text-sm text-muted-foreground">Reações</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold flex items-center justify-center gap-1">
                  <MessageCircle className="h-5 w-5" />
                  {stats?.totalComments || 0}
                </div>
                <div className="text-sm text-muted-foreground">Comentários</div>
              </CardContent>
            </Card>
          </div>

          {badges && badges.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-5 w-5" />
                <h3 className="font-semibold">Conquistas</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <Badge key={badge.id} variant="secondary" className="text-base py-2 px-3">
                    {badge.badge_id === 'primeiro_post' && '🎯 Primeiro Post'}
                    {badge.badge_id === 'helper' && '⭐ Helper'}
                    {badge.badge_id === 'analista' && '🏆 Analista Pro'}
                    {badge.badge_id === 'consistencia' && '⚡ Herói da Recorrência'}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="posts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="about">Sobre</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {posts && posts.length > 0 ? (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum post ainda
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">Email</h4>
                <p className="text-muted-foreground">{profile.email}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Nível</h4>
                <p className="text-muted-foreground">Level {profile.level} - {profile.points} pontos</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Status</h4>
                <Badge variant={profile.status === 'active' ? 'default' : 'secondary'}>
                  {profile.status === 'active' ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FollowersDialog
        open={followersDialogOpen}
        onOpenChange={setFollowersDialogOpen}
        userId={userId!}
        defaultTab={followersDialogTab}
      />
    </div>
  );
}