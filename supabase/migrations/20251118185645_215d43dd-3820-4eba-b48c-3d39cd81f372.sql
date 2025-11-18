-- Adicionar política para permitir que todos os usuários autenticados vejam perfis públicos
CREATE POLICY "Todos podem ver perfis públicos"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);