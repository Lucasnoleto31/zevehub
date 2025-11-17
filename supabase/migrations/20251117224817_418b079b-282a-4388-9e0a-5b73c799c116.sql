-- Função para atualizar saldo de conta
CREATE OR REPLACE FUNCTION update_account_balance(
  account_id uuid,
  delta numeric
)
RETURNS void AS $$
BEGIN
  UPDATE financial_accounts
  SET balance = balance + delta,
      updated_at = now()
  WHERE id = account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;