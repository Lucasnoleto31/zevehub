-- Adicionar coluna data_vencimento na tabela lancamentos_financas
ALTER TABLE public.lancamentos_financas 
ADD COLUMN data_vencimento date;