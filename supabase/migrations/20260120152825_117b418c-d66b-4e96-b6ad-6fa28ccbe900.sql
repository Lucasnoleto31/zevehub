-- Create table for economic calendar events
CREATE TABLE public.economic_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  country TEXT NOT NULL DEFAULT 'BR',
  impact TEXT NOT NULL DEFAULT 'medium' CHECK (impact IN ('low', 'medium', 'high')),
  category TEXT NOT NULL DEFAULT 'other',
  previous_value TEXT,
  forecast_value TEXT,
  actual_value TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_pattern TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.economic_events ENABLE ROW LEVEL SECURITY;

-- Everyone can view economic events (public data)
CREATE POLICY "Anyone can view economic events" 
ON public.economic_events 
FOR SELECT 
USING (true);

-- Only admins can manage events
CREATE POLICY "Admins can insert economic events" 
ON public.economic_events 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update economic events" 
ON public.economic_events 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete economic events" 
ON public.economic_events 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_economic_events_updated_at
BEFORE UPDATE ON public.economic_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for faster queries
CREATE INDEX idx_economic_events_date ON public.economic_events(event_date);
CREATE INDEX idx_economic_events_country ON public.economic_events(country);
CREATE INDEX idx_economic_events_impact ON public.economic_events(impact);

-- Insert some initial important events for 2025
INSERT INTO public.economic_events (title, description, event_date, event_time, country, impact, category) VALUES
('Copom - Decisão Taxa Selic', 'Reunião do Comitê de Política Monetária do Banco Central', '2025-01-29', '18:30', 'BR', 'high', 'monetary_policy'),
('IPCA - Inflação Mensal', 'Índice Nacional de Preços ao Consumidor Amplo', '2025-02-12', '09:00', 'BR', 'high', 'inflation'),
('PIB Brasil - Trimestral', 'Produto Interno Bruto trimestral', '2025-03-04', '09:00', 'BR', 'high', 'gdp'),
('FOMC - Decisão Fed Funds', 'Decisão de taxa de juros do Federal Reserve', '2025-01-29', '16:00', 'US', 'high', 'monetary_policy'),
('Non-Farm Payroll', 'Relatório de emprego não-agrícola dos EUA', '2025-02-07', '10:30', 'US', 'high', 'employment'),
('CPI USA - Inflação', 'Índice de Preços ao Consumidor americano', '2025-02-12', '10:30', 'US', 'high', 'inflation'),
('Copom - Decisão Taxa Selic', 'Reunião do Comitê de Política Monetária do Banco Central', '2025-03-19', '18:30', 'BR', 'high', 'monetary_policy'),
('FOMC - Decisão Fed Funds', 'Decisão de taxa de juros do Federal Reserve', '2025-03-19', '16:00', 'US', 'high', 'monetary_policy'),
('Non-Farm Payroll', 'Relatório de emprego não-agrícola dos EUA', '2025-03-07', '10:30', 'US', 'high', 'employment');