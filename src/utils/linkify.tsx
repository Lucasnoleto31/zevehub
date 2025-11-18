import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export async function linkifyContent(content: string): Promise<JSX.Element[]> {
  const parts: JSX.Element[] = [];
  const regex = /(#[a-zA-Z0-9_]+)|(@[a-zA-Z0-9_]+)/g;
  let lastIndex = 0;
  let match;
  let index = 0;

  while ((match = regex.exec(content)) !== null) {
    // Adicionar texto antes da match
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${index++}`}>
          {content.substring(lastIndex, match.index)}
        </span>
      );
    }

    const matchText = match[0];
    
    if (matchText.startsWith("#")) {
      // Hashtag
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
      // Menção
      const username = matchText.slice(1);
      // Buscar o user_id pelo nome
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
            className="text-primary hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {matchText}
          </Link>
        );
      } else {
        parts.push(
          <span key={`mention-${index++}`} className="text-primary font-medium">
            {matchText}
          </span>
        );
      }
    }

    lastIndex = regex.lastIndex;
  }

  // Adicionar texto restante
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${index++}`}>{content.substring(lastIndex)}</span>
    );
  }

  return parts;
}
