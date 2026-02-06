-- Create a trigger to auto-create user_onboarding row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_onboarding (id, completed, skipped)
  VALUES (NEW.id, false, false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach trigger to auth.users
CREATE TRIGGER on_auth_user_created_onboarding
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_onboarding();

-- Backfill: insert onboarding rows for any existing users who don't have one
INSERT INTO public.user_onboarding (id, completed, skipped)
SELECT id, false, false FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_onboarding)
ON CONFLICT (id) DO NOTHING;