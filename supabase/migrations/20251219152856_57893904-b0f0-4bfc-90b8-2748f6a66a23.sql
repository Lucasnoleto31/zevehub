-- Fix linter: RLS enabled but no policies (ai_classification_logs)
ALTER TABLE public.ai_classification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ai classification logs"
ON public.ai_classification_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ai classification logs"
ON public.ai_classification_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ai classification logs"
ON public.ai_classification_logs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ai classification logs"
ON public.ai_classification_logs
FOR DELETE
USING (auth.uid() = user_id);

-- Fix linter: function search_path mutable
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;