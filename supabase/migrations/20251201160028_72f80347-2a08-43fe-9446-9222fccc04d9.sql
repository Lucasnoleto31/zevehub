ALTER TABLE public.trading_operations ADD COLUMN risk_level TEXT DEFAULT 'MEDIO';
ALTER TABLE public.trading_operations ADD COLUMN raw_note TEXT;
CREATE TABLE public.ai_classification_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operation_id UUID NOT NULL REFERENCES public.trading_operations(id) ON DELETE CASCADE, classified_strategy TEXT NOT NULL, confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1), model_used TEXT DEFAULT 'google/gemini-2.5-flash', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), user_id UUID NOT NULL);
CREATE INDEX idx_ai_logs_operation ON public.ai_classification_logs(operation_id);
CREATE INDEX idx_ai_logs_user ON public.ai_classification_logs(user_id);
ALTER TABLE public.ai_classification_logs ENABLE ROW LEVEL SECURITY;