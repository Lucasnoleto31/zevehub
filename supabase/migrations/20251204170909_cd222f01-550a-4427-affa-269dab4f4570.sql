-- Adicionar coluna natureza para diferenciar categorias de receita/despesa
ALTER TABLE public.categorias_financas 
ADD COLUMN IF NOT EXISTS natureza text NOT NULL DEFAULT 'despesa';

-- Criar tabela de metas financeiras
CREATE TABLE IF NOT EXISTS public.metas_financeiras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL, -- 'receita', 'despesa', 'reserva', 'investimento'
  valor_alvo numeric NOT NULL DEFAULT 0,
  valor_atual numeric NOT NULL DEFAULT 0,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  descricao text,
  cor text DEFAULT '#06B6D4',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.metas_financeiras ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver suas próprias metas"
ON public.metas_financeiras
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias metas"
ON public.metas_financeiras
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias metas"
ON public.metas_financeiras
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias metas"
ON public.metas_financeiras
FOR DELETE
USING (auth.uid() = user_id);