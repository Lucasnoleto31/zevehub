import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Users, UserPlus, UserMinus, Clock, Filter, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { useRecentProfiles } from "@/hooks/useRecentProfiles";

const searchSchema = z.string()
  .trim()
  .max(100, "Busca muito longa")
  .transform(val => val.toLowerCase());

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string;
  level: number;
  points: number;
  followers_count: number;
}

export const UserSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [minLevel, setMinLevel] = useState<number>(1);
  const [minPoints, setMinPoints] = useState<number>(0);
  const [selectedTitle, setSelectedTitle] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showRecent, setShowRecent] = useState(true);
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { recentProfiles, addRecentProfile, clearRecentProfiles } = useRecentProfiles();

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["user-search", searchTerm, minLevel, minPoints, selectedTitle],
    queryFn: async () => {
      try {
        let query = supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email, level, points, followers_count")
          .gte("level", minLevel)
          .gte("points", minPoints)
          .order("points", { ascending: false })
          .limit(50);

        if (searchTerm && searchTerm.trim().length > 0) {
          const validatedSearch = searchSchema.parse(searchTerm);
          query = query.or(`full_name.ilike.%${validatedSearch}%,email.ilike.%${validatedSearch}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        // Filter by title if selected
        if (selectedTitle !== "all" && data) {
          const userIds = data.map(u => u.id);
          const { data: titleData } = await supabase
            .from("user_community_titles")
            .select("user_id, community_titles(id)")
            .in("user_id", userIds)
            .eq("community_titles.id", selectedTitle);
          
          const usersWithTitle = new Set(titleData?.map(t => t.user_id) || []);
          return data.filter(u => usersWithTitle.has(u.id));
        }
        
        return data as Profile[];
      } catch (error) {
        console.error("Search error:", error);
        return [];
      }
    },
  });

  // Get available titles for filter
  const { data: availableTitles } = useQuery({
    queryKey: ["available-titles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_titles")
        .select("id, name, color, icon")
        .order("priority", { ascending: false });
      return data || [];
    },
  });

  // Get user titles for each user
  const { data: userTitlesMap } = useQuery({
    queryKey: ["user-titles-map", users?.map(u => u.id)],
    queryFn: async () => {
      if (!users || users.length === 0) return {};
      
      const { data } = await supabase
        .from("user_community_titles")
        .select(`
          user_id,
          community_titles (
            name,
            color,
            icon,
            priority
          )
        `)
        .in("user_id", users.map(u => u.id));

      const titlesMap: Record<string, any[]> = {};
      data?.forEach((item: any) => {
        if (!titlesMap[item.user_id]) {
          titlesMap[item.user_id] = [];
        }
        if (item.community_titles) {
          titlesMap[item.user_id].push(item.community_titles);
        }
      });

      // Sort titles by priority
      Object.keys(titlesMap).forEach(userId => {
        titlesMap[userId].sort((a, b) => b.priority - a.priority);
      });

      return titlesMap;
    },
    enabled: !!users && users.length > 0,
  });

  // Check if current user follows each user
  const { data: followingMap } = useQuery({
    queryKey: ["following-map", currentUser?.id, users?.map(u => u.id)],
    queryFn: async () => {
      if (!currentUser || !users) return {};
      
      const { data } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", currentUser.id)
        .in("following_id", users.map(u => u.id));
      
      const map: Record<string, boolean> = {};
      data?.forEach((item) => {
        map[item.following_id] = true;
      });
      return map;
    },
    enabled: !!currentUser && !!users && users.length > 0,
  });

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: async ({ userId, isFollowing }: { userId: string; isFollowing: boolean }) => {
      if (!currentUser) throw new Error("Not authenticated");
      
      if (isFollowing) {
        await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", userId);
      } else {
        await supabase
          .from("user_follows")
          .insert({
            follower_id: currentUser.id,
            following_id: userId,
          });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["following-map"] });
      queryClient.invalidateQueries({ queryKey: ["user-search"] });
      toast.success(variables.isFollowing ? "Deixou de seguir" : "Seguindo");
    },
    onError: () => {
      toast.error("Erro ao atualizar");
    },
  });

  const handleUserClick = (user: Profile) => {
    addRecentProfile({
      id: user.id,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      email: user.email,
    });
    navigate(`/perfil/${user.id}`);
  };

  const renderUserCard = (user: Profile, isRecent: boolean = false) => {
    const isFollowing = followingMap?.[user.id] || false;
    const isCurrentUser = currentUser?.id === user.id;

    return (
      <div
        key={user.id}
        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-all hover:shadow-md animate-fade-in"
      >
        <Avatar 
          className="h-12 w-12 cursor-pointer" 
          onClick={() => handleUserClick(user)}
        >
          <AvatarImage src={user.avatar_url || ""} />
          <AvatarFallback>
            {user.full_name?.[0] || user.email[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleUserClick(user)}>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate">
              {user.full_name || user.email}
            </p>
            {isRecent && <Clock className="h-3 w-3 text-muted-foreground" />}
            <Badge variant="secondary" className="text-xs">
              Nível {user.level}
            </Badge>
            {userTitlesMap?.[user.id]?.map((title: any, index: number) => (
              <Badge
                key={index}
                style={{ backgroundColor: title.color }}
                className="text-white text-xs animate-glow"
              >
                {title.icon} {title.name}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span>{user.points} pontos</span>
            <span>•</span>
            <span>{user.followers_count} seguidores</span>
          </div>
        </div>
        {!isCurrentUser && currentUser && (
          <Button
            size="sm"
            variant={isFollowing ? "outline" : "default"}
            onClick={(e) => {
              e.stopPropagation();
              followMutation.mutate({ userId: user.id, isFollowing });
            }}
            disabled={followMutation.isPending}
          >
            {isFollowing ? (
              <>
                <UserMinus className="h-4 w-4 mr-1" />
                Seguindo
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-1" />
                Seguir
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Buscar Usuários
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              maxLength={100}
            />
          </div>

          {/* Advanced Filters */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? "Ocultar Filtros" : "Filtros Avançados"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3">
              {/* Level Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Nível Mínimo: {minLevel}
                </label>
                <Slider
                  value={[minLevel]}
                  onValueChange={(value) => setMinLevel(value[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Points Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Pontos Mínimos: {minPoints}
                </label>
                <Slider
                  value={[minPoints]}
                  onValueChange={(value) => setMinPoints(value[0])}
                  min={0}
                  max={1000}
                  step={50}
                  className="w-full"
                />
              </div>

              {/* Title Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Título</label>
                <Select value={selectedTitle} onValueChange={setSelectedTitle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os títulos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os títulos</SelectItem>
                    {availableTitles?.map((title) => (
                      <SelectItem key={title.id} value={title.id}>
                        {title.icon} {title.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Filters */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setMinLevel(1);
                  setMinPoints(0);
                  setSelectedTitle("all");
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Info Text */}
          {!searchTerm && (
            <p className="text-sm text-muted-foreground">
              Mostrando top 50 usuários por pontos
            </p>
          )}
        </div>

        {/* Recent Profiles */}
        {recentProfiles.length > 0 && showRecent && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Visitados Recentemente
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearRecentProfiles();
                  setShowRecent(false);
                }}
              >
                Limpar
              </Button>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {recentProfiles.map((profile) => {
                  const fullUser = users?.find(u => u.id === profile.id);
                  if (!fullUser) {
                    return (
                      <div
                        key={profile.id}
                        className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-all"
                        onClick={() => navigate(`/perfil/${profile.id}`)}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile.avatar_url || ""} />
                          <AvatarFallback>
                            {profile.full_name?.[0] || profile.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-sm">
                            {profile.full_name || profile.email}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Visitado recentemente
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return renderUserCard(fullUser, true);
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* User List */}
        <ScrollArea className="h-[400px] mt-4">
          <div className="space-y-2">
            {isLoading ? (
              <p className="text-center text-muted-foreground py-4">Carregando...</p>
            ) : users && users.length > 0 ? (
              users.map((user) => renderUserCard(user))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Nenhum usuário encontrado
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};