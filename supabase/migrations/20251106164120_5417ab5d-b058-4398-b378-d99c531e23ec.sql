-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  operation_id UUID REFERENCES public.trading_operations(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para notificações
CREATE POLICY "Usuários podem ver suas próprias notificações"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias notificações"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode criar notificações"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Habilitar realtime para notificações
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Habilitar realtime para trading_operations
ALTER TABLE public.trading_operations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_operations;

-- Função para criar notificações quando uma operação é registrada
CREATE OR REPLACE FUNCTION public.notify_new_operation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Notificar todos os usuários exceto o que criou a operação
  FOR user_record IN 
    SELECT DISTINCT p.id 
    FROM public.profiles p
    WHERE p.id != NEW.user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, operation_id)
    VALUES (
      user_record.id,
      'new_operation',
      'Nova Operação Registrada',
      'Uma nova operação de ' || NEW.asset || ' foi registrada com resultado de R$ ' || NEW.result::TEXT,
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger para criar notificações
CREATE TRIGGER on_operation_created
  AFTER INSERT ON public.trading_operations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_operation();