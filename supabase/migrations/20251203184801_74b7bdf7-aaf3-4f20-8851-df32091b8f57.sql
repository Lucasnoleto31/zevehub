-- Tabela de categorias financeiras
CREATE TABLE public.categorias_financas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'despesa',
  cor TEXT NOT NULL DEFAULT '#4F46E5',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de lançamentos financeiros
CREATE TABLE public.lancamentos_financas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  valor NUMERIC NOT NULL,
  categoria_id UUID REFERENCES public.categorias_financas(id) ON DELETE SET NULL,
  descricao TEXT,
  recorrente BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de métricas do usuário
CREATE TABLE public.usuario_metricas_financas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  salario_mensal NUMERIC NOT NULL DEFAULT 0,
  mes_referencia TEXT,
  sobra_calculada NUMERIC NOT NULL DEFAULT 0,
  valor_diario_meta NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categorias_financas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_financas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_metricas_financas ENABLE ROW LEVEL SECURITY;

-- RLS Policies para categorias_financas
CREATE POLICY "Usuários podem ver suas categorias" ON public.categorias_financas
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar suas categorias" ON public.categorias_financas
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar suas categorias" ON public.categorias_financas
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar suas categorias" ON public.categorias_financas
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies para lancamentos_financas
CREATE POLICY "Usuários podem ver seus lançamentos" ON public.lancamentos_financas
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar seus lançamentos" ON public.lancamentos_financas
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus lançamentos" ON public.lancamentos_financas
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus lançamentos" ON public.lancamentos_financas
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies para usuario_metricas_financas
CREATE POLICY "Usuários podem ver suas métricas" ON public.usuario_metricas_financas
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar suas métricas" ON public.usuario_metricas_financas
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar suas métricas" ON public.usuario_metricas_financas
  FOR UPDATE USING (auth.uid() = user_id);

-- Inserir categorias padrão (trigger para novos usuários)
CREATE OR REPLACE FUNCTION public.create_default_finance_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categorias_financas (user_id, nome, tipo, cor) VALUES
    (NEW.id, 'Alimentação', 'despesa', '#EF4444'),
    (NEW.id, 'Transporte', 'despesa', '#F97316'),
    (NEW.id, 'Moradia', 'despesa', '#EAB308'),
    (NEW.id, 'Lazer', 'despesa', '#22C55E'),
    (NEW.id, 'Saúde', 'despesa', '#06B6D4'),
    (NEW.id, 'Educação', 'despesa', '#8B5CF6'),
    (NEW.id, 'Outros', 'despesa', '#64748B'),
    (NEW.id, 'Salário', 'receita', '#10B981'),
    (NEW.id, 'Freelance', 'receita', '#3B82F6');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_created_finance_categories
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_finance_categories();