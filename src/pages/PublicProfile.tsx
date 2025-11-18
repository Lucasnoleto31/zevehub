import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PostCard } from "@/components/community/PostCard";
import { UserPlus, UserMinus, Award, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";

export default function PublicProfile() {
  const { userId } = useParams();
  const queryClient = useQueryClient();

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
              <div className="flex items-center gap-3 justify-center sm:justify-start mb-2">
                <h1 className="text-2xl font-bold">{profile.full_name}</h1>
                <Badge variant="secondary">Level {profile.level}</Badge>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground justify-center sm:justify-start">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>{profile.points} pontos</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{profile.followers_count || 0} seguidores</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{profile.following_count || 0} seguindo</span>
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

        {badges && badges.length > 0 && (
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-5 w-5" />
              <h3 className="font-semibold">Badges Conquistadas</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge.id} variant="outline">
                  {badge.badge_id}
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Posts de {profile.full_name}</h2>
        {posts && posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum post ainda
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}