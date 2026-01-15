import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { PremiumPageLayout } from "@/components/layout/PremiumPageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mail, 
  MailOpen, 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Inbox,
  CheckCheck
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Message {
  id: string;
  title: string;
  content: string;
  priority: string | null;
  read: boolean | null;
  created_at: string;
  is_global: boolean | null;
}

const Mensagens = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      loadMessages();
    }
  }, [userId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUserId(session.user.id);
  };

  const loadMessages = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`user_id.eq.${userId},is_global.eq.true`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
      toast.error("Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ read: true })
        .eq("id", messageId);

      if (error) throw error;
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    try {
      const unreadIds = messages.filter(m => !m.read).map(m => m.id);
      
      if (unreadIds.length === 0) {
        toast.info("Todas as mensagens já estão lidas");
        return;
      }

      const { error } = await supabase
        .from("messages")
        .update({ read: true })
        .in("id", unreadIds);

      if (error) throw error;
      
      setMessages(prev => prev.map(msg => ({ ...msg, read: true })));
      toast.success("Todas as mensagens marcadas como lidas");
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
      toast.error("Erro ao marcar mensagens como lidas");
    }
  };

  const getPriorityConfig = (priority: string | null) => {
    switch (priority) {
      case "urgent":
        return { 
          icon: AlertTriangle, 
          color: "text-red-500", 
          bg: "bg-red-500/10",
          label: "Urgente",
          badgeVariant: "destructive" as const
        };
      case "high":
        return { 
          icon: Bell, 
          color: "text-orange-500", 
          bg: "bg-orange-500/10",
          label: "Alta",
          badgeVariant: "default" as const
        };
      case "low":
        return { 
          icon: Clock, 
          color: "text-muted-foreground", 
          bg: "bg-muted/50",
          label: "Baixa",
          badgeVariant: "secondary" as const
        };
      default:
        return { 
          icon: CheckCircle2, 
          color: "text-blue-500", 
          bg: "bg-blue-500/10",
          label: "Normal",
          badgeVariant: "outline" as const
        };
    }
  };

  const unreadCount = messages.filter(m => !m.read).length;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <PremiumPageLayout
      title="Mensagens"
      subtitle="Visualize todas as suas mensagens e comunicados"
      icon={Mail}
    >
      <div className="space-y-6">
        {/* Header com estatísticas */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Inbox className="w-4 h-4" />
              <span>{messages.length} mensagem(ns)</span>
            </div>
            {unreadCount > 0 && (
              <Badge variant="default" className="bg-primary">
                {unreadCount} não lida(s)
              </Badge>
            )}
          </div>
          
          {unreadCount > 0 && (
            <Button 
              onClick={markAllAsRead} 
              variant="outline" 
              size="sm"
              className="gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Lista de mensagens */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-1/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <Card className="bg-card/50 backdrop-blur-sm border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                Nenhuma mensagem
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                Você ainda não recebeu nenhuma mensagem ou comunicado.
              </p>
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {messages.map((message, index) => {
                const priorityConfig = getPriorityConfig(message.priority);
                const PriorityIcon = priorityConfig.icon;
                const isUnread = !message.read;
                
                return (
                  <motion.div
                    key={message.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className={`bg-card/50 backdrop-blur-sm transition-all hover:bg-card/70 cursor-pointer ${
                        isUnread ? "border-l-4 border-l-primary" : ""
                      }`}
                      onClick={() => !message.read && markAsRead(message.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${priorityConfig.bg}`}>
                              {isUnread ? (
                                <Mail className={`w-4 h-4 ${priorityConfig.color}`} />
                              ) : (
                                <MailOpen className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <CardTitle className={`text-base ${isUnread ? "font-semibold" : "font-medium text-muted-foreground"}`}>
                                {message.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={priorityConfig.badgeVariant} className="text-xs">
                                  <PriorityIcon className="w-3 h-3 mr-1" />
                                  {priorityConfig.label}
                                </Badge>
                                {message.is_global && (
                                  <Badge variant="secondary" className="text-xs">
                                    Global
                                  </Badge>
                                )}
                                {isUnread && (
                                  <Badge variant="default" className="text-xs bg-primary">
                                    Nova
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(message.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className={`text-sm ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                          {message.content}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </PremiumPageLayout>
  );
};

export default Mensagens;
