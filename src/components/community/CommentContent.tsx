import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface CommentContentProps {
  content: string;
}

export function CommentContent({ content }: CommentContentProps) {
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
          const username = matchText.slice(1);
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .ilike("full_name", username)
            .single();

          if (profile) {
          parts.push(
            <Link
              key={`mention-${index++}`}
              to={`/perfil/${profile.id}`}
              className="text-[#10b981] hover:underline font-medium"
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
