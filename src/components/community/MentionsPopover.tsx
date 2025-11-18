import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { AtSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export function MentionsPopover() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: mentions } = useQuery({
    queryKey: ["user-mentions"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("post_mentions")
        .select(`
          *,
          profiles!post_mentions_mentioned_by_fkey (full_name)
        `)
        .eq("mentioned_user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (mentionId: string) => {
      await supabase
        .from("post_mentions")
        .update({ is_read: true })
        .eq("id", mentionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-mentions"] });
    },
  });

  const handleMentionClick = (mention: any) => {
    markAsReadMutation.mutate(mention.id);
    navigate("/comunidade");
  };

  const unreadCount = mentions?.length || 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <AtSign className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Menções</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} novas</Badge>
            )}
          </div>

          {mentions && mentions.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {mentions.map((mention: any) => (
                <button
                  key={mention.id}
                  onClick={() => handleMentionClick(mention)}
                  className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <p className="text-sm font-medium">
                      {mention.profiles?.full_name || "Usuário"}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(mention.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mencionou você em um{" "}
                    {mention.post_id ? "post" : "comentário"}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma menção nova
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
