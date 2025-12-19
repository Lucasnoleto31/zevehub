-- Add type column to strategies table to differentiate manual from robot strategies
ALTER TABLE public.strategies 
ADD COLUMN type text NOT NULL DEFAULT 'manual';

-- Update existing strategies that might be robot strategies (if any)
-- This assumes robot strategies were created differently, adjust as needed

-- Create index for better filtering performance
CREATE INDEX idx_strategies_type ON public.strategies(type);