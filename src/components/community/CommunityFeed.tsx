import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CreatePostDialog } from "./CreatePostDialog";
import { PostCard } from "./PostCard";
import { CategoryFilter } from "./CategoryFilter";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  "Todos",
  "Análises Técnicas",
  "Ações",
  "FIIs",
  "Criptomoedas",
  "Estratégias de Trading",
  "Macroeconomia",
  "Resultados dos Robôs",
  "Dúvidas",
  "Avisos Importantes"
];

export function CommunityFeed() {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showFollowingOnly, setShowFollowingOnly] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: posts, isLoading } = useQuery({
    queryKey: ["community-posts", selectedCategory, searchQuery, showFollowingOnly, currentUser?.id],
    queryFn: async () => {
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
        .order("created_at", { ascending: false });

      if (selectedCategory !== "Todos") {
        query = query.eq("category", selectedCategory);
      }

      if (searchQuery) {
        query = query.ilike("content", `%${searchQuery}%`);
      }

      let data = (await query).data;
      if ((await query).error) throw (await query).error;

      // Filtrar por seguindo se ativado
      if (showFollowingOnly && currentUser) {
        const { data: following } = await supabase
          .from("user_follows")
          .select("following_id")
          .eq("follower_id", currentUser.id);

        const followingIds = following?.map(f => f.following_id) || [];
        data = data?.filter(post => followingIds.includes(post.user_id));
      }

      return data;
    },
  });

  return (
    <div className="space-y-6">
      {/* Header com busca e criar post */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Criar Post
        </Button>
      </div>

      {/* Filtro de categorias e seguindo */}
      <div className="space-y-4">
        <CategoryFilter
          categories={CATEGORIES}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
        
        {currentUser && (
          <div className="flex justify-center">
            <Button
              variant={showFollowingOnly ? "default" : "outline"}
              onClick={() => setShowFollowingOnly(!showFollowingOnly)}
              size="sm"
            >
              {showFollowingOnly ? "Mostrando: Seguindo" : "Mostrar apenas seguindo"}
            </Button>
          </div>
        )}
      </div>

      {/* Lista de posts */}
      <div className="space-y-4">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full" />
              </div>
            ))}
          </>
        ) : posts && posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-muted-foreground">Nenhum post encontrado</p>
          </div>
        )}
      </div>

      <CreatePostDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        categories={CATEGORIES.filter((c) => c !== "Todos")}
      />
    </div>
  );
}
