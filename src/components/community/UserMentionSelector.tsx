import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

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
  const { data: users, isLoading } = useQuery({
    queryKey: ["users-for-mention", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, avatar_url, level, points")
        .not("full_name", "is", null)
        .order("points", { ascending: false })
        .limit(8);

      if (searchTerm.trim()) {
        query = query.ilike("full_name", `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card
        className="fixed z-50 w-72 p-4 shadow-lg border-2"
        style={{ top: position.top, left: position.left }}
      >
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!users || users.length === 0) {
    return (
      <Card
        className="fixed z-50 w-72 p-4 shadow-lg border-2"
        style={{ top: position.top, left: position.left }}
      >
        <p className="text-sm text-muted-foreground text-center py-2">
          {searchTerm ? "Nenhum usuário encontrado" : "Digite para buscar usuários"}
        </p>
      </Card>
    );
  }

  return (
    <Card
      className="fixed z-50 w-72 p-2 shadow-lg border-2"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-2 py-1 border-b mb-1">
        <p className="text-xs text-muted-foreground">
          Selecione um usuário para mencionar
        </p>
      </div>
      <ScrollArea className="max-h-64">
        <div className="space-y-1">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user.full_name || "")}
              className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors text-left"
            >
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {user.full_name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.full_name || "Usuário"}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Nível {user.level}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {user.points || 0} pts
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
      <div className="px-2 py-1 border-t mt-1">
        <p className="text-xs text-muted-foreground">
          Use ↑↓ para navegar, Enter para selecionar
        </p>
      </div>
    </Card>
  );
}
