-- Adicionar coluna pago na tabela lancamentos_financas
ALTER TABLE public.lancamentos_financas 
ADD COLUMN pago boolean NOT NULL DEFAULT false;