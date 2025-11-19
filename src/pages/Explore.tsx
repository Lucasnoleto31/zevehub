import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingUp, Hash, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Explore() {
  const navigate = useNavigate();

  // Usuários Ativos (últimos 7 dias)
  const { data: activeUsers } = useQuery({
    queryKey: ["explore-active-users"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, points, level")
        .gte("last_login", sevenDaysAgo.toISOString())
        .order("last_login", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  // Posts em Alta (mais curtidas/comentários nas últimas 24h)
  const { data: trendingPosts } = useQuery({
    queryKey: ["explore-trending-posts"],
    queryFn: async () => {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data, error } = await supabase
        .from("community_posts")
        .select(`
          *,
          profiles:user_id (full_name, avatar_url),
          post_reactions (count),
          community_comments (count)
        `)
        .eq("status", "approved")
        .gte("created_at", oneDayAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  // Hashtags Trending
  const { data: trendingHashtags } = useQuery({
    queryKey: ["explore-trending-hashtags"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("community_posts")
        .select("tags")
        .eq("status", "approved")
        .gte("created_at", sevenDaysAgo.toISOString())
        .not("tags", "is", null);

      if (error) throw error;

      // Contar hashtags
      const hashtagCount: Record<string, number> = {};
      data.forEach((post) => {
        post.tags?.forEach((tag) => {
          hashtagCount[tag] = (hashtagCount[tag] || 0) + 1;
        });
      });

      return Object.entries(hashtagCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([tag, count]) => ({ tag, count }));
    },
  });

  // Rankings da Semana
  const { data: weeklyRanking } = useQuery({
    queryKey: ["explore-weekly-ranking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_points")
        .select("*")
        .order("points", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Buscar dados dos perfis separadamente
      if (!data?.length) return [];

      const userIds = data.map((entry) => entry.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, level")
        .in("id", userIds);

      return data.map((entry) => ({
        ...entry,
        profile: profiles?.find((p) => p.id === entry.user_id),
      }));
    },
  });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Explorar</h1>
        <p className="text-muted-foreground">
          Descubra o que está acontecendo na comunidade
        </p>
      </div>

      <Tabs defaultValue="active-users" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active-users">
            <Flame className="w-4 h-4 mr-2" />
            Usuários Ativos
          </TabsTrigger>
          <TabsTrigger value="trending-posts">
            <TrendingUp className="w-4 h-4 mr-2" />
            Posts em Alta
          </TabsTrigger>
          <TabsTrigger value="hashtags">
            <Hash className="w-4 h-4 mr-2" />
            Hashtags
          </TabsTrigger>
          <TabsTrigger value="ranking">
            <Trophy className="w-4 h-4 mr-2" />
            Rankings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active-users" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeUsers?.map((user) => (
              <Card
                key={user.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/profile/${user.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar_url || ""} />
                      <AvatarFallback>
                        {user.full_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{user.full_name}</p>
                      <div className="flex gap-2 items-center">
                        <Badge variant="secondary">Nível {user.level}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {user.points} pts
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trending-posts" className="space-y-4">
          {trendingPosts?.map((post) => (
            <Card
              key={post.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/comunidade`)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={post.profiles?.avatar_url || ""} />
                    <AvatarFallback>
                      {post.profiles?.full_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{post.profiles?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3">{post.content}</p>
                <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                  <span>❤️ {post.post_reactions?.[0]?.count || 0}</span>
                  <span>💬 {post.community_comments?.[0]?.count || 0}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="hashtags" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingHashtags?.map(({ tag, count }) => (
              <Card
                key={tag}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/hashtag/${tag}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-primary">#{tag}</p>
                    <Badge>{count} posts</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ranking" className="space-y-4">
          {weeklyRanking?.map((entry, index) => (
            <Card
              key={entry.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/profile/${entry.user_id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold text-primary">
                    #{index + 1}
                  </div>
                  <Avatar>
                    <AvatarImage src={entry.profile?.avatar_url || ""} />
                    <AvatarFallback>
                      {entry.profile?.full_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">{entry.profile?.full_name}</p>
                    <div className="flex gap-2 items-center">
                      <Badge variant="secondary">
                        Nível {entry.profile?.level}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {entry.points} pts esta semana
                      </span>
                    </div>
                  </div>
                  {index === 0 && <Trophy className="w-8 h-8 text-yellow-500" />}
                  {index === 1 && <Trophy className="w-8 h-8 text-gray-400" />}
                  {index === 2 && <Trophy className="w-8 h-8 text-orange-600" />}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
