import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp, MessageCircle, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const LEVELS = [
  { level: 1, name: "Iniciante", points: 0 },
  { level: 2, name: "Aprendiz", points: 300 },
  { level: 3, name: "Trader Ativo", points: 1000 },
  { level: 4, name: "Especialista", points: 3000 },
  { level: 5, name: "Master", points: 7000 },
];

export function UserCommunityProfile() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: userPosts } = useQuery({
    queryKey: ["user-posts"],
    queryFn: async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return [];

      const { data, error } = await supabase
        .from("community_posts")
        .select("*")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: badges } = useQuery({
    queryKey: ["user-badges"],
    queryFn: async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return [];

      const { data, error } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", authUser.id);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <Skeleton className="h-32 w-full" />
        </Card>
      </div>
    );
  }

  if (!user) return null;

  const currentLevel = LEVELS.find((l) => l.level === user.level) || LEVELS[0];
  const nextLevel = LEVELS.find((l) => l.level === user.level + 1);
  const progressToNextLevel = nextLevel
    ? ((user.points - currentLevel.points) /
        (nextLevel.points - currentLevel.points)) *
      100
    : 100;

  return (
    <div className="space-y-6">
      {/* Card principal do perfil */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="text-2xl">
              {user.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{user.full_name}</h2>
              <p className="text-muted-foreground">{user.email}</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Nível</p>
                  <p className="font-bold">{currentLevel.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Pontos</p>
                  <p className="font-bold">{user.points}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Posts</p>
                  <p className="font-bold">{userPosts?.length || 0}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Badges</p>
                  <p className="font-bold">{badges?.length || 0}</p>
                </div>
              </div>
            </div>

            {nextLevel && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso para {nextLevel.name}</span>
                  <span className="font-medium">
                    {user.points} / {nextLevel.points} pontos
                  </span>
                </div>
                <Progress value={progressToNextLevel} />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Badges conquistadas */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Badges Conquistadas</h3>
        {badges && badges.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {badges.map((badge) => (
              <div key={badge.id} className="text-center">
                <Badge variant="secondary" className="mb-2">
                  {badge.badge_id}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            Nenhuma badge conquistada ainda
          </p>
        )}
      </Card>

      {/* Posts recentes */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Meus Posts Recentes</h3>
        {userPosts && userPosts.length > 0 ? (
          <div className="space-y-4">
            {userPosts.slice(0, 5).map((post) => (
              <div key={post.id} className="border-l-4 border-primary pl-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline">{post.category}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(post.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm line-clamp-2">{post.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            Você ainda não criou nenhum post
          </p>
        )}
      </Card>
    </div>
  );
}
