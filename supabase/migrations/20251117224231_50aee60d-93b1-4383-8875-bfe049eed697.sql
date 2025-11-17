-- Adicionar coluna de tags na tabela personal_finances
ALTER TABLE personal_finances
ADD COLUMN tags text[];

-- Criar tabela de orçamentos por categoria
CREATE TABLE category_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  budget_amount numeric NOT NULL CHECK (budget_amount > 0),
  month date NOT NULL,
  alert_threshold numeric DEFAULT 80 CHECK (alert_threshold > 0 AND alert_threshold <= 100),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, category, month)
);

-- Habilitar RLS
ALTER TABLE category_budgets ENABLE ROW LEVEL SECURITY;

-- Políticas para orçamentos
CREATE POLICY "Usuários podem ver seus próprios orçamentos"
ON category_budgets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios orçamentos"
ON category_budgets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios orçamentos"
ON category_budgets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios orçamentos"
ON category_budgets FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_category_budgets_updated_at
BEFORE UPDATE ON category_budgets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Função para verificar status do orçamento
CREATE OR REPLACE FUNCTION check_budget_status(
  p_user_id uuid,
  p_category text,
  p_month date
)
RETURNS TABLE (
  budget_amount numeric,
  spent_amount numeric,
  percentage numeric,
  alert_threshold numeric,
  should_alert boolean
) AS $$
BEGIN
  RETURN QUERY
  WITH budget AS (
    SELECT 
      cb.budget_amount,
      cb.alert_threshold
    FROM category_budgets cb
    WHERE cb.user_id = p_user_id
      AND cb.category = p_category
      AND cb.month = p_month
  ),
  spent AS (
    SELECT 
      COALESCE(SUM(pf.amount), 0) as total_spent
    FROM personal_finances pf
    WHERE pf.user_id = p_user_id
      AND pf.category = p_category
      AND pf.type = 'expense'
      AND DATE_TRUNC('month', pf.transaction_date) = DATE_TRUNC('month', p_month)
  )
  SELECT 
    budget.budget_amount,
    spent.total_spent,
    CASE 
      WHEN budget.budget_amount > 0 
      THEN (spent.total_spent / budget.budget_amount * 100)
      ELSE 0
    END as percentage,
    budget.alert_threshold,
    CASE 
      WHEN budget.budget_amount > 0 AND spent.total_spent >= (budget.budget_amount * budget.alert_threshold / 100)
      THEN true
      ELSE false
    END as should_alert
  FROM budget, spent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;