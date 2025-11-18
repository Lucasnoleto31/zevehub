import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Hash } from "lucide-react";
import { subDays } from "date-fns";

export function TrendingTopics() {
  const { data: trending } = useQuery<{
    categories: { category: string; score: number }[];
    hashtags: { hashtag: string; score: number }[];
  }>({
    queryKey: ["trending-topics"],
    queryFn: async (): Promise<{
      categories: { category: string; score: number }[];
      hashtags: { hashtag: string; score: number }[];
    }> => {
      const lastWeek = subDays(new Date(), 7).toISOString();

      // Buscar posts da última semana com suas reações
      const { data: posts } = await supabase
        .from("community_posts")
        .select(`
          id,
          category,
          content,
          created_at
        `)
        .eq("status", "approved")
        .gte("created_at", lastWeek);

      if (!posts) return { categories: [], hashtags: [] };

      // Contar reações por post
      const { data: reactions } = await supabase
        .from("post_reactions")
        .select("post_id")
        .in("post_id", posts.map(p => p.id));

      // Contar comentários por post
      const { data: comments } = await supabase
        .from("community_comments")
        .select("post_id")
        .in("post_id", posts.map(p => p.id));

      // Calcular score de tendência por categoria
      const categoryScores: Record<string, number> = {};
      
      posts.forEach(post => {
        const postReactions = reactions?.filter(r => r.post_id === post.id).length || 0;
        const postComments = comments?.filter(c => c.post_id === post.id).length || 0;
        const score = postReactions * 2 + postComments * 3;
        
        categoryScores[post.category] = (categoryScores[post.category] || 0) + score;
      });

      // Extrair hashtags do conteúdo
      const hashtagScores: Record<string, number> = {};
      posts.forEach(post => {
        const hashtags = post.content.match(/#[\w]+/g) || [];
        const postReactions = reactions?.filter(r => r.post_id === post.id).length || 0;
        const postComments = comments?.filter(c => c.post_id === post.id).length || 0;
        const score = postReactions * 2 + postComments * 3;
        
        hashtags.forEach(tag => {
          hashtagScores[tag] = (hashtagScores[tag] || 0) + score;
        });
      });

      // Top 5 categorias
      const topCategories = Object.entries(categoryScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category, score]) => ({ category, score }));

      // Top 5 hashtags
      const topHashtags = Object.entries(hashtagScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([hashtag, score]) => ({ hashtag, score }));

      return { categories: topCategories, hashtags: topHashtags };
    },
  });

  if (!trending || (trending.categories?.length === 0 && trending.hashtags?.length === 0)) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Trending Topics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {trending.categories && trending.categories.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Categorias em Alta</h4>
            <div className="flex flex-wrap gap-2">
              {trending.categories.map(({ category, score }) => (
                <Badge key={category} variant="secondary" className="gap-1">
                  {category}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({score})
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {trending.hashtags && trending.hashtags.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Hashtags Populares</h4>
            <div className="flex flex-wrap gap-2">
              {trending.hashtags.map(({ hashtag, score }) => (
                <Badge key={hashtag} variant="outline" className="gap-1">
                  <Hash className="h-3 w-3" />
                  {hashtag.replace('#', '')}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({score})
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
