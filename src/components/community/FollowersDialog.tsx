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

    return (
      <div className="space-y-2">
        {users.map((item: any) => {
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
      </DialogContent>
    </Dialog>
  );
}
