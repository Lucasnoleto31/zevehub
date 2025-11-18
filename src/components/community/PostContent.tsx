import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface PostContentProps {
  content: string;
}

export function PostContent({ content }: PostContentProps) {
  const [processedContent, setProcessedContent] = useState<JSX.Element[]>([]);

  useEffect(() => {
    async function processContent() {
      const parts: JSX.Element[] = [];
      const regex = /(#[a-zA-Z0-9_]+)|(@[a-zA-Z0-9_]+)/g;
      let lastIndex = 0;
      let match;
      let index = 0;

      while ((match = regex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(
            <span key={`text-${index++}`}>
              {content.substring(lastIndex, match.index)}
            </span>
          );
        }

        const matchText = match[0];
        
        if (matchText.startsWith("#")) {
          const tag = matchText.slice(1);
          parts.push(
            <Link
              key={`hashtag-${index++}`}
              to={`/hashtag/${tag.toLowerCase()}`}
              className="text-primary hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {matchText}
            </Link>
          );
        } else if (matchText.startsWith("@")) {
          const username = matchText.slice(1).toLowerCase();
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .ilike("full_name", `%${username}%`);

          // Buscar correspondência exata primeiro, depois parcial
          const profile = profiles?.find(p => 
            p.full_name?.toLowerCase() === username ||
            p.full_name?.toLowerCase().includes(username)
          );

          if (profile) {
            parts.push(
              <Link
                key={`mention-${index++}`}
                to={`/perfil/${profile.id}`}
                className="text-[#10b981] hover:underline font-medium"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                {matchText}
              </Link>
            );
          } else {
            parts.push(
              <span key={`mention-${index++}`} className="text-[#10b981] font-medium">
                {matchText}
              </span>
            );
          }
        }

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < content.length) {
        parts.push(
          <span key={`text-${index++}`}>{content.substring(lastIndex)}</span>
        );
      }

      setProcessedContent(parts);
    }

    processContent();
  }, [content]);

  return <>{processedContent}</>;
}
