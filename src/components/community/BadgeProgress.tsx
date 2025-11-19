import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Zap } from "lucide-react";

const BADGE_INFO = {
  posts_created: {
    name: "Criador de Conteúdo",
    description: "Crie posts na comunidade",
    icon: "✍️",
    levels: [1, 10, 50, 100, 500],
  },
  likes_received: {
    name: "Popular",
    description: "Receba curtidas em seus posts",
    icon: "❤️",
    levels: [10, 50, 100, 500, 1000],
  },
  login_streak: {
    name: "Consistente",
    description: "Faça login consecutivo",
    icon: "🔥",
    levels: [7, 15, 30, 60, 100],
  },
  comments_made: {
    name: "Engajador",
    description: "Comente em posts",
    icon: "💬",
    levels: [10, 50, 100, 500, 1000],
  },
};

export default function BadgeProgress({ userId }: { userId: string }) {
  const { data: badgeProgress } = useQuery({
    queryKey: ["badge-progress", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badge_progress")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data;
    },
  });

  const { data: userBadges } = useQuery({
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

  if (!badgeProgress?.length) {
    return null;
  }

  const getNextLevel = (badgeType: string, currentProgress: number) => {
    const levels = BADGE_INFO[badgeType as keyof typeof BADGE_INFO]?.levels || [];
    return levels.find((level) => level > currentProgress) || levels[levels.length - 1];
  };

  const getBadgeLevel = (badgeType: string, currentProgress: number) => {
    const levels = BADGE_INFO[badgeType as keyof typeof BADGE_INFO]?.levels || [];
    let level = 0;
    for (const threshold of levels) {
      if (currentProgress >= threshold) level++;
      else break;
    }
    return level;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="text-xl font-bold">Progresso de Conquistas</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {badgeProgress.map((progress) => {
          const badgeInfo = BADGE_INFO[progress.badge_type as keyof typeof BADGE_INFO];
          if (!badgeInfo) return null;

          const nextLevel = getNextLevel(progress.badge_type, progress.current_progress);
          const percentage = (progress.current_progress / nextLevel) * 100;
          const currentLevel = getBadgeLevel(progress.badge_type, progress.current_progress);
          const isCompleted = progress.current_progress >= progress.target_progress;

          return (
            <Card key={progress.id} className={isCompleted ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{badgeInfo.icon}</span>
                    <div>
                      <CardTitle className="text-base">{badgeInfo.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {badgeInfo.description}
                      </p>
                    </div>
                  </div>
                  {currentLevel > 0 && (
                    <Badge variant="secondary">
                      Nível {currentLevel}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">
                      {progress.current_progress} / {nextLevel}
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  {isCompleted && (
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <Zap className="w-4 h-4" />
                      <span>Conquista desbloqueada!</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
