-- Criar bucket de storage para comprovantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false);

-- Políticas para o bucket de comprovantes
CREATE POLICY "Usuários podem fazer upload de seus comprovantes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuários podem ver seus próprios comprovantes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuários podem deletar seus próprios comprovantes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Adicionar coluna de attachment_url na tabela personal_finances
ALTER TABLE personal_finances
ADD COLUMN attachment_url text;

-- Criar tabela de categorias personalizadas
CREATE TABLE finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  icon text,
  color text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;

-- Políticas para categorias
CREATE POLICY "Usuários podem ver suas próprias categorias"
ON finance_categories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias categorias"
ON finance_categories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias categorias"
ON finance_categories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias categorias"
ON finance_categories FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_finance_categories_updated_at
BEFORE UPDATE ON finance_categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Inserir categorias padrão para cada usuário
CREATE OR REPLACE FUNCTION create_default_finance_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Categorias de despesa padrão
  INSERT INTO finance_categories (user_id, name, type, icon, color)
  VALUES
    (NEW.id, 'Alimentação', 'expense', '🍔', 'hsl(0, 70%, 50%)'),
    (NEW.id, 'Transporte', 'expense', '🚗', 'hsl(210, 70%, 50%)'),
    (NEW.id, 'Moradia', 'expense', '🏠', 'hsl(120, 50%, 50%)'),
    (NEW.id, 'Saúde', 'expense', '💊', 'hsl(340, 70%, 50%)'),
    (NEW.id, 'Educação', 'expense', '📚', 'hsl(280, 70%, 50%)'),
    (NEW.id, 'Lazer', 'expense', '🎮', 'hsl(50, 70%, 50%)'),
    (NEW.id, 'Outros', 'expense', '📦', 'hsl(180, 50%, 50%)');
  
  -- Categorias de receita padrão
  INSERT INTO finance_categories (user_id, name, type, icon, color)
  VALUES
    (NEW.id, 'Salário', 'income', '💰', 'hsl(140, 70%, 50%)'),
    (NEW.id, 'Investimentos', 'income', '📈', 'hsl(200, 70%, 50%)'),
    (NEW.id, 'Freelance', 'income', '💼', 'hsl(260, 70%, 50%)'),
    (NEW.id, 'Outros', 'income', '💵', 'hsl(90, 70%, 50%)');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar categorias padrão quando um novo usuário é criado
CREATE TRIGGER create_default_categories_on_user_creation
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION create_default_finance_categories();