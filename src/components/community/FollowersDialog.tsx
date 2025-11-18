import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FollowersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  defaultTab?: "followers" | "following";
}

export function FollowersDialog({
  open,
  onOpenChange,
  userId,
  defaultTab = "followers",
}: FollowersDialogProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  const { data: followers, isLoading: followersLoading } = useQuery({
    queryKey: ["user-followers", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_follows")
        .select(`
          follower_id,
          profiles!user_follows_follower_id_fkey (
            id,
            full_name,
            avatar_url,
            level,
            points
          )
        `)
        .eq("following_id", userId);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: following, isLoading: followingLoading } = useQuery({
    queryKey: ["user-following", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_follows")
        .select(`
          following_id,
          profiles!user_follows_following_id_fkey (
            id,
            full_name,
            avatar_url,
            level,
            points
          )
        `)
        .eq("follower_id", userId);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const handleUserClick = (userId: string) => {
    onOpenChange(false);
    navigate(`/perfil/${userId}`);
  };

  const renderUsersList = (users: any[] | undefined, isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!users || users.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum usuário encontrado
        </div>
      );
    }

    // Filtrar usuários por busca e nível
    const filteredUsers = users.filter((item: any) => {
      const profile = item.profiles;
      if (!profile) return false;

      const matchesSearch = !searchTerm || 
        profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLevel = levelFilter === "all" || 
        (levelFilter === "1-5" && profile.level >= 1 && profile.level <= 5) ||
        (levelFilter === "6-10" && profile.level >= 6 && profile.level <= 10) ||
        (levelFilter === "11+" && profile.level >= 11);

      return matchesSearch && matchesLevel;
    });

    if (filteredUsers.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum usuário encontrado com os filtros aplicados
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {filteredUsers.map((item: any) => {
          const profile = item.profiles;
          if (!profile) return null;

          return (
            <button
              key={profile.id}
              onClick={() => handleUserClick(profile.id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {profile.full_name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {profile.full_name || "Usuário"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    Nível {profile.level}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {profile.points || 0} pontos
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Conexões</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="1-5">Nível 1-5</SelectItem>
                <SelectItem value="6-10">Nível 6-10</SelectItem>
                <SelectItem value="11+">Nível 11+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="followers">
                Seguidores ({followers?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="following">
                Seguindo ({following?.length || 0})
              </TabsTrigger>
            </TabsList>

          <TabsContent value="followers">
            <ScrollArea className="h-[400px] pr-4">
              {renderUsersList(followers, followersLoading)}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="following">
            <ScrollArea className="h-[400px] pr-4">
              {renderUsersList(following, followingLoading)}
            </ScrollArea>
          </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
