-- Add percentual_meta column to categorias_financas table
ALTER TABLE public.categorias_financas
ADD COLUMN percentual_meta numeric DEFAULT 0;