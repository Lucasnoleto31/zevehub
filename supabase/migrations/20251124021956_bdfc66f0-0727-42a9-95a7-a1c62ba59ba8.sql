-- Remover a política de SELECT restritiva
DROP POLICY IF EXISTS "Usuários podem ver suas operações e operações de admins" ON public.trading_operations;

-- Criar nova política que permite todos os usuários autenticados verem todas as operações
CREATE POLICY "Todos os usuários podem ver todas as operações"
ON public.trading_operations
FOR SELECT
TO authenticated
USING (true);