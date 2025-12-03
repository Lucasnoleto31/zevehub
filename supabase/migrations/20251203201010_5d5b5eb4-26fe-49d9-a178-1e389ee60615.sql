-- Adicionar coluna tipo_transacao (receita/despesa) na tabela lancamentos_financas
ALTER TABLE public.lancamentos_financas 
ADD COLUMN tipo_transacao text NOT NULL DEFAULT 'despesa';

-- Adicionar coluna frequencia_recorrencia para definir período da recorrência
ALTER TABLE public.lancamentos_financas 
ADD COLUMN frequencia_recorrencia text DEFAULT NULL;

-- Adicionar constraint para valores válidos
ALTER TABLE public.lancamentos_financas 
ADD CONSTRAINT lancamentos_tipo_transacao_check 
CHECK (tipo_transacao IN ('receita', 'despesa'));

ALTER TABLE public.lancamentos_financas 
ADD CONSTRAINT lancamentos_frequencia_check 
CHECK (frequencia_recorrencia IS NULL OR frequencia_recorrencia IN ('semanal', 'quinzenal', 'mensal', 'anual'));