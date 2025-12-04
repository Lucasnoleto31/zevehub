-- Tabela para salvar configurações de gerenciamento de risco
CREATE TABLE public.risk_management_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  capital numeric NOT NULL DEFAULT 10000,
  payoff numeric NOT NULL DEFAULT 2,
  stop_pontos numeric NOT NULL DEFAULT 150,
  taxa_acerto numeric NOT NULL DEFAULT 50,
  ativo text NOT NULL DEFAULT 'WIN',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.risk_management_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários podem ver suas próprias configurações"
ON public.risk_management_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias configurações"
ON public.risk_management_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias configurações"
ON public.risk_management_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_risk_management_settings_updated_at
BEFORE UPDATE ON public.risk_management_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();