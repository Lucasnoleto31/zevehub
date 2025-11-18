import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { CommunityRanking } from "@/components/community/CommunityRanking";
import { UserCommunityProfile } from "@/components/community/UserCommunityProfile";
import { ModerationPanel } from "@/components/community/ModerationPanel";
import { MentionsPopover } from "@/components/community/MentionsPopover";
import { NotificationsPopover } from "@/components/community/NotificationsPopover";
import { SuggestedFollows } from "@/components/community/SuggestedFollows";
import { ActivityFeed } from "@/components/community/ActivityFeed";
import { Trophy, Users, User, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Community() {
  const [activeTab, setActiveTab] = useState("feed");

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase.rpc("is_admin", {
        _user_id: user.id,
      });

      return data || false;
    },
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Zeve Hub - Comunidade</h1>
            <p className="text-muted-foreground">
              Compartilhe análises, estratégias e conecte-se com outros traders
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsPopover />
            <MentionsPopover />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <TabsTrigger value="feed" className="gap-2">
                  <Users className="h-4 w-4" />
                  Feed
                </TabsTrigger>
                <TabsTrigger value="ranking" className="gap-2">
                  <Trophy className="h-4 w-4" />
                  Ranking
                </TabsTrigger>
                <TabsTrigger value="profile" className="gap-2">
                  <User className="h-4 w-4" />
                  Meu Perfil
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="moderation" className="gap-2">
                    <Shield className="h-4 w-4" />
                    Moderação
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="feed" className="space-y-6">
                <CommunityFeed />
              </TabsContent>

              <TabsContent value="ranking" className="space-y-6">
                <CommunityRanking />
              </TabsContent>

              <TabsContent value="profile" className="space-y-6">
                <UserCommunityProfile />
              </TabsContent>

              {isAdmin && (
                <TabsContent value="moderation" className="space-y-6">
                  <ModerationPanel />
                </TabsContent>
              )}
            </Tabs>
          </div>

          <div className="space-y-6">
            <SuggestedFollows />
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
