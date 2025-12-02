-- Drop existing SELECT policy for strategies
DROP POLICY IF EXISTS "Usuários podem ver suas próprias estratégias" ON public.strategies;

-- Create new policy allowing all authenticated users to see all strategies
CREATE POLICY "Todos usuários autenticados podem ver todas estratégias"
ON public.strategies
FOR SELECT
TO authenticated
USING (true);