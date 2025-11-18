-- Adicionar campo tags na tabela community_posts
ALTER TABLE community_posts 
ADD COLUMN IF NOT EXISTS tags text[];

-- Criar índice para busca de tags
CREATE INDEX IF NOT EXISTS idx_community_posts_tags ON community_posts USING GIN(tags);

-- Atualizar posts existentes para extrair hashtags do conteúdo
UPDATE community_posts
SET tags = (
  SELECT array_agg(DISTINCT lower(tag[1]))
  FROM regexp_matches(content, '#([a-zA-Z0-9_]+)', 'g') AS tag
)
WHERE tags IS NULL OR array_length(tags, 1) IS NULL;