import { useState, useEffect, useRef } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PostCard } from "./PostCard";
import { HashtagFilter } from "./HashtagFilter";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const POSTS_PER_PAGE = 10;

export function CommunityFeed() {
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFollowingOnly, setShowFollowingOnly] = useState(false);
  const observerTarget = useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Buscar hashtags populares
  const { data: popularHashtags } = useQuery({
    queryKey: ["popular-hashtags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("tags")
        .not("tags", "is", null);

      if (error) throw error;

      const allTags = data
        .flatMap(post => post.tags || [])
        .filter(Boolean);

      const tagCounts = allTags.reduce((acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .map(([tag]) => tag);
    },
  });

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["community-posts", selectedHashtag, searchQuery, showFollowingOnly, currentUser?.id],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("community_posts")
        .select(`
          *,
          profiles!community_posts_user_id_fkey (
            full_name,
            avatar_url,
            level,
            points
          )
        `)
        .eq("status", "approved")
        .order("created_at", { ascending: false})
        .range(pageParam * POSTS_PER_PAGE, (pageParam + 1) * POSTS_PER_PAGE - 1);

      if (selectedHashtag) {
        query = query.contains("tags", [selectedHashtag]);
      }

      if (searchQuery) {
        query = query.ilike("content", `%${searchQuery}%`);
      }

      const { data: postsData, error } = await query;
      if (error) throw error;

      let filteredData = postsData || [];
      if (showFollowingOnly && currentUser) {
        const { data: following } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", currentUser.id);

        const followingIds = following?.map(f => f.following_id) || [];
        filteredData = postsData?.filter(post => followingIds.includes(post.user_id)) || [];
      }

      return {
        posts: filteredData,
        nextPage: filteredData.length === POSTS_PER_PAGE ? (pageParam as number) + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = data?.pages.flatMap((page) => page.posts) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 bg-card/80 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl h-11"
          />
        </div>
      </div>

      <HashtagFilter
        hashtags={popularHashtags || []}
        selectedHashtag={selectedHashtag}
        onSelectHashtag={setSelectedHashtag}
      />
      
      {currentUser && (
        <div className="flex justify-center">
          <Button
            variant={showFollowingOnly ? "default" : "outline"}
            onClick={() => setShowFollowingOnly(!showFollowingOnly)}
            size="sm"
            className={`rounded-full transition-all ${
              showFollowingOnly 
                ? "bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/25 hover:shadow-primary/40" 
                : "bg-card/80 border-border/50 hover:border-primary/50"
            }`}
          >
            {showFollowingOnly ? "Mostrando: Seguindo" : "Mostrar apenas seguindo"}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border/50 rounded-2xl p-6 space-y-4 bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ))}
          </>
        ) : posts && posts.length > 0 ? (
          <>
            {posts.map((post, index) => (
              <div 
                key={post.id} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <PostCard post={post} />
              </div>
            ))}
            <div ref={observerTarget} className="flex justify-center py-6">
              {isFetchingNextPage && (
                <div className="flex items-center gap-3 text-muted-foreground bg-card/80 backdrop-blur-sm px-6 py-3 rounded-full border border-border/50">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Carregando mais posts...</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-16 border border-border/50 rounded-2xl bg-card/50 backdrop-blur-sm">
            <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-lg">Nenhum post encontrado</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Seja o primeiro a compartilhar!</p>
          </div>
        )}
      </div>
    </div>
  );
}
