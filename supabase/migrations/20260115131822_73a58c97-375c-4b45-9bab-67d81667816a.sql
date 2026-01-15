-- Add trial_expires_at column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying of expired trials
CREATE INDEX IF NOT EXISTS idx_profiles_trial_expires_at 
ON public.profiles(trial_expires_at) 
WHERE trial_expires_at IS NOT NULL;

-- Create function to block expired trial users
CREATE OR REPLACE FUNCTION public.block_expired_trial_users()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  blocked_count INTEGER;
BEGIN
  UPDATE public.profiles
  SET access_status = 'bloqueado'
  WHERE trial_expires_at IS NOT NULL
    AND trial_expires_at < NOW()
    AND access_status = 'aprovado';
  
  GET DIAGNOSTICS blocked_count = ROW_COUNT;
  RETURN blocked_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.block_expired_trial_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_expired_trial_users() TO service_role;