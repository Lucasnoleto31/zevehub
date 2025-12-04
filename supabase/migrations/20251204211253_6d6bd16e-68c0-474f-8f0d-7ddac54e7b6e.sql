-- Create opportunities table for admin-posted trading operations
CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Day Trade', 'Swing Trade', 'Position')),
  ativo TEXT NOT NULL,
  entrada NUMERIC NOT NULL,
  alvos NUMERIC[] NOT NULL DEFAULT '{}',
  stop NUMERIC NOT NULL,
  resultado TEXT DEFAULT 'Em aberto' CHECK (resultado IN ('Gain', 'Stop', 'Em aberto')),
  descricao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Everyone can view opportunities
CREATE POLICY "Todos podem ver oportunidades"
ON public.opportunities
FOR SELECT
USING (true);

-- Only admins can create opportunities
CREATE POLICY "Apenas admins podem criar oportunidades"
ON public.opportunities
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Only admins can update opportunities
CREATE POLICY "Apenas admins podem atualizar oportunidades"
ON public.opportunities
FOR UPDATE
USING (is_admin(auth.uid()));

-- Only admins can delete opportunities
CREATE POLICY "Apenas admins podem deletar oportunidades"
ON public.opportunities
FOR DELETE
USING (is_admin(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();