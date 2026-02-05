-- Fix: Restrict credit_tiers to authenticated users only (hide Stripe IDs from public)
DROP POLICY IF EXISTS "Anyone can view credit tiers" ON public.credit_tiers;

CREATE POLICY "Authenticated users can view credit tiers" 
ON public.credit_tiers 
FOR SELECT 
TO authenticated
USING (true);