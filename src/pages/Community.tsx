import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { CommunityRanking } from "@/components/community/CommunityRanking";
import { UserCommunityProfile } from "@/components/community/UserCommunityProfile";
import { Trophy, Users, User } from "lucide-react";

export default function Community() {
  const [activeTab, setActiveTab] = useState("feed");

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Zeve Hub - Comunidade</h1>
          <p className="text-muted-foreground">
            Compartilhe análises, estratégias e conecte-se com outros traders
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
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
        </Tabs>
      </div>
    </div>
  );
}
