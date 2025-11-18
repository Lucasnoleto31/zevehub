import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserMentionSelectorProps {
  searchTerm: string;
  onSelectUser: (username: string) => void;
  position: { top: number; left: number };
}

export function UserMentionSelector({
  searchTerm,
  onSelectUser,
  position,
}: UserMentionSelectorProps) {
  const { data: users } = useQuery({
    queryKey: ["users-for-mention", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, avatar_url, level")
        .order("full_name", { ascending: true })
        .limit(10);

      if (searchTerm) {
        query = query.ilike("full_name", `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  if (!users || users.length === 0) return null;

  return (
    <Card
      className="absolute z-50 w-64 p-2 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <ScrollArea className="max-h-60">
        <div className="space-y-1">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user.full_name || "")}
              className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>
                  {user.full_name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.full_name || "Usuário"}
                </p>
                <Badge variant="outline" className="text-xs">
                  Nível {user.level}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
