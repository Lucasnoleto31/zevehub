import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash, TrendingUp } from "lucide-react";

interface HashtagAutocompleteProps {
  searchTerm: string;
  onSelectHashtag: (hashtag: string) => void;
  position: { top: number; left: number };
}

export function HashtagAutocomplete({
  searchTerm,
  onSelectHashtag,
  position,
}: HashtagAutocompleteProps) {
  const { data: hashtags, isLoading } = useQuery({
    queryKey: ["hashtag-autocomplete", searchTerm],
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

      let filteredTags = Object.entries(tagCounts);

      if (searchTerm.trim()) {
        filteredTags = filteredTags.filter(([tag]) => 
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      return filteredTags
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([tag, count]) => ({ tag, count }));
    },
  });

  if (isLoading || !hashtags || hashtags.length === 0) return null;

  return (
    <Card
      className="fixed z-50 w-72 p-2 shadow-lg border-2"
      style={{ top: position.top, left: position.left }}
    >
      <div className="px-2 py-1 border-b mb-1">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Hash className="h-3 w-3" />
          Hashtags sugeridas
        </p>
      </div>
      <ScrollArea className="max-h-64">
        <div className="space-y-1">
          {hashtags.map(({ tag, count }) => (
            <button
              key={tag}
              onClick={() => onSelectHashtag(tag)}
              className="w-full flex items-center justify-between gap-3 p-2 rounded-md hover:bg-accent transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">#{tag}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                {count}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
