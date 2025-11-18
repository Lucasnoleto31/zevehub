import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function CommunityRanking() {
  const { data: topUsers, isLoading } = useQuery({
    queryKey: ["community-ranking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, points, level")
        .order("points", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-orange-500" />;
      default:
        return (
          <span className="text-xl font-bold text-muted-foreground">
            {position}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Ranking da Comunidade</h2>
        <p className="text-muted-foreground">
          Os traders mais ativos e engajados da semana
        </p>
      </div>

      <div className="space-y-3">
        {topUsers?.map((user, index) => (
          <Card
            key={user.id}
            className={`p-4 transition-all hover:shadow-lg ${
              index < 3 ? "border-2 border-primary/50" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12">
                {getPositionIcon(index + 1)}
              </div>

              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>
                  {user.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <p className="font-semibold">{user.full_name || "Usuário"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    Nível {user.level}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {user.points} pontos
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {user.points}
                </p>
                <p className="text-xs text-muted-foreground">pontos</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
