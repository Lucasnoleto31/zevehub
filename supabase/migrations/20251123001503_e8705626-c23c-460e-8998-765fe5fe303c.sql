-- Drop existing policies
DROP POLICY IF EXISTS "Admins podem gerenciar todas as operações" ON trading_operations;
DROP POLICY IF EXISTS "Admins podem ver todas as operações" ON trading_operations;
DROP POLICY IF EXISTS "Usuários autenticados podem ver todas as operações" ON trading_operations;

-- Policy para usuários verem suas próprias operações + operações de admins
CREATE POLICY "Usuários podem ver suas operações e operações de admins"
ON trading_operations
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  is_admin(user_id)
);

-- Policy para usuários criarem suas próprias operações
CREATE POLICY "Usuários podem criar suas próprias operações"
ON trading_operations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy para usuários atualizarem suas próprias operações
CREATE POLICY "Usuários podem atualizar suas próprias operações"
ON trading_operations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policy para usuários deletarem suas próprias operações
CREATE POLICY "Usuários podem deletar suas próprias operações"
ON trading_operations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Policy para admins gerenciarem todas as operações
CREATE POLICY "Admins podem gerenciar todas as operações"
ON trading_operations
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));