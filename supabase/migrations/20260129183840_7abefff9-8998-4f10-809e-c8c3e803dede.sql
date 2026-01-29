-- Create rate limiting table for AI requests
CREATE TABLE public.ai_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can view their own rate limits
CREATE POLICY "Users can view their own rate limits"
ON public.ai_rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Create function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  p_user_id UUID,
  p_max_requests INTEGER DEFAULT 50,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_request_count INTEGER;
  v_reset_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get or create rate limit record
  INSERT INTO public.ai_rate_limits (user_id, request_count, window_start)
  VALUES (p_user_id, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current state
  SELECT rl.window_start, rl.request_count
  INTO v_window_start, v_request_count
  FROM public.ai_rate_limits rl
  WHERE rl.user_id = p_user_id
  FOR UPDATE;

  -- Check if window has expired
  IF v_window_start + (p_window_minutes || ' minutes')::INTERVAL < now() THEN
    -- Reset window
    UPDATE public.ai_rate_limits
    SET window_start = now(), request_count = 1, updated_at = now()
    WHERE user_id = p_user_id;
    
    v_reset_time := now() + (p_window_minutes || ' minutes')::INTERVAL;
    RETURN QUERY SELECT true, p_max_requests - 1, v_reset_time;
    RETURN;
  END IF;

  -- Check if under limit
  IF v_request_count < p_max_requests THEN
    UPDATE public.ai_rate_limits
    SET request_count = request_count + 1, updated_at = now()
    WHERE user_id = p_user_id;
    
    v_reset_time := v_window_start + (p_window_minutes || ' minutes')::INTERVAL;
    RETURN QUERY SELECT true, p_max_requests - v_request_count - 1, v_reset_time;
    RETURN;
  END IF;

  -- Over limit
  v_reset_time := v_window_start + (p_window_minutes || ' minutes')::INTERVAL;
  RETURN QUERY SELECT false, 0, v_reset_time;
END;
$$;