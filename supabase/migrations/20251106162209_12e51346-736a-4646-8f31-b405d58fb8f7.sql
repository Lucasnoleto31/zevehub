-- Remover policy antiga que limitava visualização apenas aos próprios bots
DROP POLICY IF EXISTS "Usuários podem ver seus próprios bots" ON public.client_bots;

-- Criar nova policy que permite todos os usuários autenticados visualizarem todos os bots
CREATE POLICY "Usuários autenticados podem ver todos os bots"
ON public.client_bots
FOR SELECT
TO authenticated
USING (true);

-- Garantir que apenas admins podem inserir, atualizar e deletar bots
DROP POLICY IF EXISTS "Admins podem gerenciar bots" ON public.client_bots;

CREATE POLICY "Admins podem inserir bots"
ON public.client_bots
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar bots"
ON public.client_bots
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar bots"
ON public.client_bots
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));