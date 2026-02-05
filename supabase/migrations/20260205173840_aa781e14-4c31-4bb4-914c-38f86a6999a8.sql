-- Create user_onboarding table
CREATE TABLE public.user_onboarding (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  skipped BOOLEAN NOT NULL DEFAULT false,
  q1 TEXT,
  q2 TEXT,
  q3 TEXT,
  q4 TEXT,
  q5 TEXT,
  q6 TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- Users can view their own onboarding record
CREATE POLICY "Users can view their own onboarding"
ON public.user_onboarding
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own onboarding record
CREATE POLICY "Users can update their own onboarding"
ON public.user_onboarding
FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own onboarding record
CREATE POLICY "Users can insert their own onboarding"
ON public.user_onboarding
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create function to auto-create onboarding record on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_onboarding (id)
  VALUES (NEW.user_id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create onboarding record when profile is created
CREATE TRIGGER on_profile_created_create_onboarding
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_onboarding();