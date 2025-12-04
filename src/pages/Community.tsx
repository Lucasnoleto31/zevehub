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
import { Trophy, User, Users } from "lucide-react";
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
        
        <main className="flex-1 bg-gradient-to-br from-background via-accent/5 to-background relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="particle particle-1" />
            <div className="particle particle-2" />
            <div className="particle particle-3" />
            <div className="particle particle-4" />
            <div className="glow-orb w-96 h-96 bg-primary/20 -top-48 -right-48" />
            <div className="glow-orb w-80 h-80 bg-primary/10 bottom-0 -left-40" />
          </div>

          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border/50 bg-card/80 backdrop-blur-md px-4">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold text-lg hidden sm:block">Comunidade</span>
            </div>
            <div className="flex-1" />
            <NotificationsPopover />
            <MentionsPopover />
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-card/50 border-border/50 hover:bg-card hover:border-primary/30 transition-all">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Perfil</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto bg-card/95 backdrop-blur-md border-border/50">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    Meu Perfil na Comunidade
                  </SheetTitle>
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
                <Button variant="outline" size="sm" className="gap-2 bg-card/50 border-border/50 hover:bg-card hover:border-warning/30 transition-all">
                  <Trophy className="h-4 w-4 text-warning" />
                  <span className="hidden sm:inline">Ranking</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto bg-card/95 backdrop-blur-md border-border/50">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <Trophy className="h-4 w-4 text-warning" />
                    </div>
                    Ranking da Comunidade
                  </SheetTitle>
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

          <div className="container max-w-7xl mx-auto p-4 md:p-6 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Feed Principal */}
              <div className="lg:col-span-8 space-y-6">
                <div className="animate-fade-in">
                  <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    Feed da Comunidade
                  </h1>
                  <p className="text-muted-foreground">
                    Compartilhe análises, estratégias e conecte-se com outros traders
                  </p>
                </div>
                
                {isAdmin && (
                  <div className="space-y-4 animate-fade-in delay-100">
                    <TitlesManagement />
                    <AssignTitles />
                  </div>
                )}
                
                <div className="animate-fade-in delay-200">
                  <QuickPostCard />
                </div>
                <div className="animate-fade-in delay-300">
                  <CommunityFeed />
                </div>
              </div>

              {/* Sidebar Direita */}
              <div className="lg:col-span-4 space-y-4">
                <div className="animate-fade-in delay-100">
                  <UserSearch />
                </div>
                <div className="animate-fade-in delay-200">
                  <TrendingTopics />
                </div>
                <div className="animate-fade-in delay-300">
                  <SuggestedFollows />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
