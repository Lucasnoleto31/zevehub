import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, AlertCircle, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  title: string;
  content: string;
  priority: string;
  read: boolean;
  created_at: string;
  is_global: boolean;
}

interface MessagesListProps {
  userId: string;
}

const MessagesList = ({ userId }: MessagesListProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [userId]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`user_id.eq.${userId},is_global.eq.true`)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case "high":
        return <AlertCircle className="w-4 h-4 text-warning" />;
      default:
        return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  if (messages.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
        <p className="text-sm text-muted-foreground mt-1">
          Você será notificado quando houver novidades
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`p-4 border rounded-lg transition-colors ${
            !message.read ? "bg-primary/5 border-primary/20" : "hover:bg-accent/5"
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-1">
              {getPriorityIcon(message.priority)}
              <h4 className="font-medium text-sm">{message.title}</h4>
            </div>
            <div className="flex items-center gap-2">
              {!message.read && (
                <Badge variant="default" className="text-xs">
                  Nova
                </Badge>
              )}
              {message.is_global && (
                <Badge variant="outline" className="text-xs">
                  Geral
                </Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{message.content}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
              locale: ptBR,
            })}
          </p>
        </div>
      ))}
    </div>
  );
};

export default MessagesList;
