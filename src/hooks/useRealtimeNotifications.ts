import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RealtimePostgresInsertPayload } from "@supabase/supabase-js";

interface Message {
  id: string;
  title: string;
  content: string;
  priority: string;
  user_id: string | null;
  is_global: boolean;
}

export const useRealtimeNotifications = (userId: string | undefined) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    // Carregar contagem inicial de mensagens não lidas
    const loadUnreadCount = async () => {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .or(`user_id.eq.${userId},is_global.eq.true`)
        .eq("read", false);

      setUnreadCount(count || 0);
    };

    loadUnreadCount();

    // Configurar listener de realtime
    const channel = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload: RealtimePostgresInsertPayload<Message>) => {
          const newMessage = payload.new;

          // Verificar se a mensagem é para este usuário
          if (newMessage.user_id === userId || newMessage.is_global) {
            setUnreadCount((prev) => prev + 1);

            // Mostrar notificação toast
            const priorityEmoji = {
              urgent: "🚨",
              high: "⚠️",
              normal: "📬",
              low: "ℹ️",
            };

            toast.success(
              `${priorityEmoji[newMessage.priority as keyof typeof priorityEmoji] || "📬"} ${newMessage.title}`,
              {
                description: newMessage.content.substring(0, 100) + "...",
                duration: 5000,
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = async (messageId: string) => {
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("id", messageId);

    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    await supabase
      .from("messages")
      .update({ read: true })
      .or(`user_id.eq.${userId},is_global.eq.true`)
      .eq("read", false);

    setUnreadCount(0);
  };

  return { unreadCount, markAsRead, markAllAsRead };
};
