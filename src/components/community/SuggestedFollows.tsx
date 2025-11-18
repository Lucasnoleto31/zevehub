import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function SuggestedFollows() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: suggested } = useQuery({
    queryKey: ["suggested-follows", currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];

      // Buscar usuários que o user atual NÃO segue ainda
      const { data: following } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", currentUser.id);

      const followingIds = following?.map(f => f.following_id) || [];

      // Buscar usuários ativos com posts na mesma categoria que o usuário interage
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", currentUser.id)
        .not("id", "in", `(${followingIds.join(",") || "null"})`)
        .order("points", { ascending: false })
        .limit(5);

      if (error) throw error;
      return profiles;
    },
    enabled: !!currentUser,
  });

  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!currentUser) return;
      
      await supabase
        .from("user_follows")
        .insert({
          follower_id: currentUser.id,
          following_id: userId,
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggested-follows"] });
      toast.success("Seguindo!");
    },
  });

  if (!suggested || suggested.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sugestões para Seguir</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggested.map((user: any) => (
          <div key={user.id} className="flex items-center justify-between gap-3">
            <div 
              className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80"
              onClick={() => navigate(`/perfil/${user.id}`)}
            >
              <Avatar>
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>
                  {user.full_name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-sm">{user.full_name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    Nível {user.level}
                  </Badge>
                  <span>{user.points} pts</span>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => followMutation.mutate(user.id)}
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Seguir
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}