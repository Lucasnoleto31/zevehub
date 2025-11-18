import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash } from "lucide-react";

interface HashtagFilterProps {
  hashtags: string[];
  selectedHashtag: string | null;
  onSelectHashtag: (hashtag: string | null) => void;
}

export function HashtagFilter({ hashtags, selectedHashtag, onSelectHashtag }: HashtagFilterProps) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 mb-3">
        <Hash className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Tags Populares</h3>
      </div>
      <ScrollArea className="h-auto max-h-40">
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedHashtag === null ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/20 transition-colors"
            onClick={() => onSelectHashtag(null)}
          >
            Todas
          </Badge>
          {hashtags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedHashtag === tag ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/20 transition-colors"
              onClick={() => onSelectHashtag(tag)}
            >
              #{tag}
            </Badge>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
