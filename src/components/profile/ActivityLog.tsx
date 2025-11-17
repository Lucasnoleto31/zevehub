import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Shield, User, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ActivityLogProps {
  userId: string;
}

interface Activity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  ip_address: string | null;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "security":
      return Shield;
    case "profile_update":
      return User;
    case "login":
      return LogIn;
    default:
      return FileText;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case "security":
      return "bg-primary/10 text-primary";
    case "profile_update":
      return "bg-success/10 text-success";
    case "login":
      return "bg-accent/10 text-accent-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const ActivityLog = ({ userId }: ActivityLogProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [userId]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      setActivities(data || []);
    } catch (error) {
      console.error("Erro ao carregar atividades:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Log de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log de Atividades Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma atividade registrada
          </p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.activity_type);
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className={`p-2 rounded-full ${getActivityColor(activity.activity_type)}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-foreground">{activity.description}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {activity.ip_address && (
                        <Badge variant="outline" className="text-xs">
                          {activity.ip_address}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
