-- Create table for tax calculations with loss compensation
CREATE TABLE public.tax_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  gross_profit NUMERIC NOT NULL DEFAULT 0,
  accumulated_loss NUMERIC NOT NULL DEFAULT 0,
  taxable_base NUMERIC NOT NULL DEFAULT 0,
  tax_due NUMERIC NOT NULL DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  darf_generated_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, month)
);

-- Enable Row Level Security
ALTER TABLE public.tax_calculations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own tax calculations" 
ON public.tax_calculations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tax calculations" 
ON public.tax_calculations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tax calculations" 
ON public.tax_calculations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tax calculations" 
ON public.tax_calculations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tax_calculations_updated_at
BEFORE UPDATE ON public.tax_calculations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_tax_calculations_user_year ON public.tax_calculations(user_id, year);
CREATE INDEX idx_tax_calculations_year_month ON public.tax_calculations(year, month);