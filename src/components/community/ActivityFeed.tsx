import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Filter } from "lucide-react";
import { formatDistanceToNow, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ActivityFeed() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | '24h' | 'week' | 'posts' | 'reactions'>('all');

  const { data: activities } = useQuery({
    queryKey: ["activity-feed", filter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Buscar quem eu sigo
      const { data: following } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (!following || following.length === 0) return [];

      const followingIds = following.map(f => f.following_id);

      // Buscar atividades: novos posts e reações
      const activities: any[] = [];

      // Posts recentes de quem sigo
      const { data: posts } = await supabase
        .from("community_posts")
        .select(`
          *,
          author:user_id (full_name, avatar_url, level)
        `)
        .in("user_id", followingIds)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(10);

      if (posts) {
        activities.push(...posts.map((p: any) => ({ ...p, activity_type: "post" })));
      }

      // Reações recentes de quem sigo
      const { data: reactions } = await supabase
        .from("post_reactions")
        .select(`
          *,
          actor:user_id (full_name, avatar_url, level)
        `)
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(10);

      if (reactions) {
        activities.push(...reactions.map((r: any) => ({ ...r, activity_type: "reaction" })));
      }

      // Filtrar por período
      let filtered = activities;
      const now = new Date();
      
      if (filter === '24h') {
        const yesterday = subDays(now, 1);
        filtered = activities.filter((a: any) => new Date(a.created_at) >= yesterday);
      } else if (filter === 'week') {
        const lastWeek = subDays(now, 7);
        filtered = activities.filter((a: any) => new Date(a.created_at) >= lastWeek);
      } else if (filter === 'posts') {
        filtered = activities.filter((a: any) => a.activity_type === 'post');
      } else if (filter === 'reactions') {
        filtered = activities.filter((a: any) => a.activity_type === 'reaction');
      }

      // Ordenar por data
      return filtered.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 15);
    },
  });

  if (!activities || activities.length === 0) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Feed de Atividades</CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter('all')}>
                Todas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('24h')}>
                Últimas 24h
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('week')}>
                Última semana
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('posts')}>
                Apenas posts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('reactions')}>
                Apenas reações
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Siga outros usuários para ver suas atividades aqui
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Feed de Atividades</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
        {activities.map((activity: any) => (
          <div
            key={activity.id}
            className="flex gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer"
            onClick={() => {
              if (activity.activity_type === "post") {
                navigate("/comunidade");
              } else if (activity.activity_type === "reaction" && activity.post_id) {
                navigate("/comunidade");
              }
            }}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={activity.author?.avatar_url || activity.actor?.avatar_url || undefined} />
              <AvatarFallback>
                {(activity.author?.full_name?.[0] || activity.actor?.full_name?.[0] || "?").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                {activity.activity_type === "post" ? (
                  <MessageCircle className="h-4 w-4 text-blue-500" />
                ) : activity.reaction_type === "love" ? (
                  <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                ) : null}
                
                <p className="text-sm">
                  <span className="font-semibold">
                    {activity.author?.full_name || activity.actor?.full_name}
                  </span>
                  {activity.activity_type === "post" && " publicou um novo post"}
                  {activity.activity_type === "reaction" && activity.reaction_type === "love" && " amou um post"}
                </p>
              </div>

              {activity.activity_type === "post" && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {activity.content}
                </p>
              )}

              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(activity.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}