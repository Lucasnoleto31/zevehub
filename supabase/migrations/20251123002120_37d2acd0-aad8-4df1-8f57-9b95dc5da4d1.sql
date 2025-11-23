-- Corrigir política de visualização de operações
DROP POLICY IF EXISTS "Usuários podem ver suas operações e operações de admins" ON trading_operations;

-- Nova política: usuários veem suas operações + operações de qualquer admin
CREATE POLICY "Usuários podem ver suas operações e operações de admins"
ON trading_operations
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = trading_operations.user_id 
    AND ur.role = 'admin'
  )
);