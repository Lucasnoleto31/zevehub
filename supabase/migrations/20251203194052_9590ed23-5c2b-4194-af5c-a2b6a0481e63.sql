-- Adicionar colunas faltantes na tabela usuario_metricas_financas
ALTER TABLE public.usuario_metricas_financas 
ADD COLUMN IF NOT EXISTS media_7_dias numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS previsao_fim_mes numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS desvio_padrao_14 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS modelo_orcamento text DEFAULT '50/30/20';

-- Adicionar coluna meta_valor na tabela categorias_financas
ALTER TABLE public.categorias_financas 
ADD COLUMN IF NOT EXISTS meta_valor numeric DEFAULT 0;