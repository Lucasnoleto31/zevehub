import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const useRealtimeCommunityNotifications = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    // Listener para notificações da comunidade
    const channel = supabase
      .channel("community-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new;

          // Mostrar toast baseado no tipo de notificação
          const messages = {
            follow: "começou a seguir você",
            reaction: "reagiu ao seu post",
            comment: "comentou no seu post",
          };

          const message = messages[notification.type as keyof typeof messages] || "nova notificação";

          toast.info("Nova interação!", {
            description: message,
            duration: 5000,
          });

          // Invalidar queries para atualizar a UI
          queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
          queryClient.invalidateQueries({ queryKey: ["unread-notifications-count"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
};
