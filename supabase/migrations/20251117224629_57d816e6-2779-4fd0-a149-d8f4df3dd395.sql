-- Criar tabela de contas
CREATE TABLE financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 100),
  type text NOT NULL CHECK (type IN ('bank', 'cash', 'credit_card', 'investment')),
  balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL' CHECK (length(currency) = 3),
  is_active boolean DEFAULT true,
  color text CHECK (color ~ '^hsl\([0-9]+,\s*[0-9]+%,\s*[0-9]+%\)$'),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE financial_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas para contas
CREATE POLICY "Usuários podem ver suas próprias contas"
ON financial_accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias contas"
ON financial_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias contas"
ON financial_accounts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias contas"
ON financial_accounts FOR DELETE
USING (auth.uid() = user_id);

-- Adicionar coluna de conta nas transações
ALTER TABLE personal_finances
ADD COLUMN account_id uuid REFERENCES financial_accounts(id);

-- Criar tabela de transferências entre contas
CREATE TABLE account_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  from_account_id uuid NOT NULL REFERENCES financial_accounts(id),
  to_account_id uuid NOT NULL REFERENCES financial_accounts(id),
  amount numeric NOT NULL CHECK (amount > 0),
  transfer_date date NOT NULL,
  description text CHECK (length(description) <= 500),
  created_at timestamp with time zone DEFAULT now(),
  CHECK (from_account_id != to_account_id)
);

-- Habilitar RLS para transferências
ALTER TABLE account_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias transferências"
ON account_transfers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias transferências"
ON account_transfers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias transferências"
ON account_transfers FOR DELETE
USING (auth.uid() = user_id);

-- Criar tabela de transações recorrentes
CREATE TABLE recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL CHECK (length(trim(title)) > 0 AND length(title) <= 200),
  amount numeric NOT NULL CHECK (amount > 0),
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text NOT NULL CHECK (length(trim(category)) > 0 AND length(category) <= 100),
  account_id uuid REFERENCES financial_accounts(id),
  description text CHECK (length(description) <= 500),
  tags text[],
  frequency text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  start_date date NOT NULL,
  end_date date,
  next_execution_date date NOT NULL,
  day_of_month integer CHECK (day_of_month >= 1 AND day_of_month <= 31),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Habilitar RLS para recorrentes
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias transações recorrentes"
ON recurring_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias transações recorrentes"
ON recurring_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias transações recorrentes"
ON recurring_transactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias transações recorrentes"
ON recurring_transactions FOR DELETE
USING (auth.uid() = user_id);

-- Triggers para updated_at
CREATE TRIGGER update_financial_accounts_updated_at
BEFORE UPDATE ON financial_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recurring_transactions_updated_at
BEFORE UPDATE ON recurring_transactions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Função para criar conta padrão para novos usuários
CREATE OR REPLACE FUNCTION create_default_account()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO financial_accounts (user_id, name, type, color)
  VALUES (NEW.id, 'Conta Principal', 'bank', 'hsl(210, 70%, 50%)');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_default_account_on_user_creation
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION create_default_account();