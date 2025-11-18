import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { z } from "zod";

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
  const navigate = useNavigate();

  const { data: users, isLoading } = useQuery({
    queryKey: ["user-search", searchTerm],
    queryFn: async () => {
      try {
        const validatedSearch = searchSchema.parse(searchTerm);
        
        if (!validatedSearch || validatedSearch.length === 0) {
          return [];
        }

        let query = supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email, level, points, followers_count")
          .limit(10);

        query = query.or(`full_name.ilike.%${validatedSearch}%,email.ilike.%${validatedSearch}%`);
        query = query.order("points", { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        return data as Profile[];
      } catch (error) {
        console.error("Search validation error:", error);
        return [];
      }
    },
    enabled: searchTerm.trim().length > 0,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Buscar Usuários
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Digite pelo menos 1 caractere para buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            maxLength={100}
          />
        </div>
        {searchTerm && searchTerm.trim().length < 1 && (
          <p className="text-sm text-muted-foreground mt-2">
            Digite pelo menos 1 caractere para buscar
          </p>
        )}

        {searchTerm && searchTerm.trim().length > 0 && (
          <ScrollArea className="h-[400px] mt-4">
            <div className="space-y-2">
              {isLoading ? (
                <p className="text-center text-muted-foreground py-4">Buscando...</p>
              ) : users && users.length > 0 ? (
                users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => navigate(`/perfil/${user.id}`)}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-all hover:shadow-md animate-fade-in"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar_url || ""} />
                      <AvatarFallback>
                        {user.full_name?.[0] || user.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">
                          {user.full_name || user.email}
                        </p>
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
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum usuário encontrado
                </p>
              )}
            </div>
          </ScrollArea>
        )}

        {!searchTerm || searchTerm.trim().length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-4">
            Digite pelo menos 1 caractere para iniciar a busca
          </p>
        )}
      </CardContent>
    </Card>
  );
};