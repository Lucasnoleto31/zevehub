-- Remover políticas antigas que restringem visualização
DROP POLICY IF EXISTS "Usuários podem ver suas próprias operações" ON public.trading_operations;
DROP POLICY IF EXISTS "Usuários podem criar suas próprias operações" ON public.trading_operations;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias operações" ON public.trading_operations;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias operações" ON public.trading_operations;

-- Criar política para todos os usuários autenticados visualizarem todas as operações
CREATE POLICY "Usuários autenticados podem ver todas as operações"
ON public.trading_operations
FOR SELECT
TO authenticated
USING (true);

-- Manter políticas de admin para gerenciamento
-- (a política "Admins podem ver todas as operações" já existe e continuará funcionando)
-- Garantir que apenas admins podem inserir, atualizar e deletar