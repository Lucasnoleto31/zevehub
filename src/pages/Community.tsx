import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { QuickPostCard } from "@/components/community/QuickPostCard";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { MentionsPopover } from "@/components/community/MentionsPopover";
import { NotificationsPopover } from "@/components/community/NotificationsPopover";
import { SuggestedFollows } from "@/components/community/SuggestedFollows";
import { TrendingTopics } from "@/components/community/TrendingTopics";
import { UserCommunityProfile } from "@/components/community/UserCommunityProfile";
import { CommunityRanking } from "@/components/community/CommunityRanking";
import { TitlesManagement } from "@/components/community/TitlesManagement";
import { AssignTitles } from "@/components/community/AssignTitles";
import { UserSearch } from "@/components/community/UserSearch";
import { useRealtimeCommunityNotifications } from "@/hooks/useRealtimeCommunityNotifications";
import { Button } from "@/components/ui/button";
import { Trophy, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Community() {
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Ativar notificações em tempo real
  useRealtimeCommunityNotifications(currentUser?.id);

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
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar isAdmin={isAdmin || false} />
        
        <main className="flex-1 bg-background">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <NotificationsPopover />
            <MentionsPopover />
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  Perfil
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Meu Perfil na Comunidade</SheetTitle>
                  <SheetDescription>
                    Veja suas estatísticas e conquistas
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <UserCommunityProfile />
                </div>
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Trophy className="h-4 w-4" />
                  Ranking
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Ranking da Comunidade</SheetTitle>
                  <SheetDescription>
                    Top traders da semana
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <CommunityRanking />
                </div>
              </SheetContent>
            </Sheet>
          </header>

          <div className="container max-w-7xl mx-auto p-4 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Feed Principal */}
              <div className="lg:col-span-8 space-y-4">
                <div>
                  <h1 className="text-2xl font-bold mb-1">Feed da Comunidade</h1>
                  <p className="text-muted-foreground text-sm">
                    Compartilhe análises, estratégias e conecte-se com outros traders
                  </p>
                </div>
                
                {isAdmin && (
                  <div className="space-y-4">
                    <TitlesManagement />
                    <AssignTitles />
                  </div>
                )}
                
                <QuickPostCard />
                <CommunityFeed />
              </div>

              {/* Sidebar Direita */}
              <div className="lg:col-span-4 space-y-4">
                <UserSearch />
                <TrendingTopics />
                <SuggestedFollows />
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
