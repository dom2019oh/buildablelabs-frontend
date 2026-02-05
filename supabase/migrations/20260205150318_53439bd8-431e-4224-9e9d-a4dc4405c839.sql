-- =====================================================
-- STRIPE INTEGRATION SCHEMA UPDATES
-- =====================================================

-- Add Stripe columns to credit_tiers table
ALTER TABLE public.credit_tiers 
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_annual_price_id TEXT;

-- Add stripe_price_id to user_subscriptions (already has stripe_customer_id and stripe_subscription_id)
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- =====================================================
-- 100% RLS POLICY ENFORCEMENT
-- =====================================================

-- USER_CREDITS: Remove INSERT policy - only RPC/triggers can create
DROP POLICY IF EXISTS "Users can insert their own credits" ON public.user_credits;

-- USER_CREDITS: Remove any UPDATE policy - only RPC functions
DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;

-- USER_CREDITS: Remove any DELETE policy
DROP POLICY IF EXISTS "Users can delete their own credits" ON public.user_credits;

-- USER_CREDITS: Ensure SELECT only policy exists
DROP POLICY IF EXISTS "Users can view their own credits" ON public.user_credits;
CREATE POLICY "Users can view their own credits" 
ON public.user_credits 
FOR SELECT 
USING (auth.uid() = user_id);

-- USER_SUBSCRIPTIONS: Remove INSERT policy - only webhook can create
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;

-- USER_SUBSCRIPTIONS: Remove UPDATE policy - only webhook can update
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;

-- USER_SUBSCRIPTIONS: Remove DELETE policy
DROP POLICY IF EXISTS "Users can delete their own subscription" ON public.user_subscriptions;

-- USER_SUBSCRIPTIONS: Ensure SELECT only policy exists
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view their own subscription" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

-- CREDIT_TRANSACTIONS: Ensure only SELECT (immutable log)
DROP POLICY IF EXISTS "Users can insert transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users can update transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Users can delete transactions" ON public.credit_transactions;

-- CREDIT_TRANSACTIONS: Ensure SELECT only policy
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.credit_transactions;
CREATE POLICY "Users can view their own transactions" 
ON public.credit_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

-- CREDIT_TIERS: Public read only
DROP POLICY IF EXISTS "Anyone can view credit tiers" ON public.credit_tiers;
CREATE POLICY "Anyone can view credit tiers" 
ON public.credit_tiers 
FOR SELECT 
USING (true);

-- CREDIT_ACTION_COSTS: Public read for active costs only
DROP POLICY IF EXISTS "Anyone can view active action costs" ON public.credit_action_costs;
CREATE POLICY "Anyone can view active action costs" 
ON public.credit_action_costs 
FOR SELECT 
USING (is_active = true);

-- =====================================================
-- POPULATE STRIPE IDS INTO CREDIT_TIERS
-- =====================================================

-- Pro 50 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKjW0ffydSy5b',
  stripe_price_id = 'price_1SxU4FDInYgfvKAUuaqRZ7A6'
WHERE plan_type = 'pro' AND credits = 50;

-- Pro 100 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKjXAj4sqLRFS',
  stripe_price_id = 'price_1SxU4GDInYgfvKAUoffPWo6z'
WHERE plan_type = 'pro' AND credits = 100;

-- Pro 200 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKj4DJI0J0RAR',
  stripe_price_id = 'price_1SxU4HDInYgfvKAUNhHVmlUK'
WHERE plan_type = 'pro' AND credits = 200;

-- Pro 300 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKjYEGxaOxZUy',
  stripe_price_id = 'price_1SxU4IDInYgfvKAUlYNN95JS'
WHERE plan_type = 'pro' AND credits = 300;

-- Pro 400 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKjpcHUvBDlIj',
  stripe_price_id = 'price_1SxU4JDInYgfvKAU1ErstfLl'
WHERE plan_type = 'pro' AND credits = 400;

-- Pro 500 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKj3hNLjhwqTi',
  stripe_price_id = 'price_1SxU4KDInYgfvKAUFi5Bmqzz'
WHERE plan_type = 'pro' AND credits = 500;

-- Pro 750 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKjHhpvKbERRx',
  stripe_price_id = 'price_1SxU4LDInYgfvKAU53nM6n9p'
WHERE plan_type = 'pro' AND credits = 750;

-- Pro 1000 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKjICJWnAQlFo',
  stripe_price_id = 'price_1SxU4NDInYgfvKAU3MeCacTc'
WHERE plan_type = 'pro' AND credits = 1000;

-- Pro 1500 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKjvnVNhHbzYt',
  stripe_price_id = 'price_1SxU4ODInYgfvKAUKR3zsqwK'
WHERE plan_type = 'pro' AND credits = 1500;

-- Pro 2000 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKjUVCovXIrD3',
  stripe_price_id = 'price_1SxU4PDInYgfvKAUxlQCF0jX'
WHERE plan_type = 'pro' AND credits = 2000;

-- Pro 3000 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKjUSICbWg9cc',
  stripe_price_id = 'price_1SxU4QDInYgfvKAU9Z6v9zkz'
WHERE plan_type = 'pro' AND credits = 3000;

-- Pro 5000 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKj3P2vXGmhnW',
  stripe_price_id = 'price_1SxU4RDInYgfvKAU18YDz5Mb'
WHERE plan_type = 'pro' AND credits = 5000;

-- Pro 10000 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKj6st1hAKtcQ',
  stripe_price_id = 'price_1SxU4SDInYgfvKAUOKE6WI4X'
WHERE plan_type = 'pro' AND credits = 10000;

-- Business 100 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKk0pIkMSloS4',
  stripe_price_id = 'price_1SxU4XDInYgfvKAU2DHMEEVj'
WHERE plan_type = 'business' AND credits = 100;

-- Business 200 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKkDaU2TUF1ue',
  stripe_price_id = 'price_1SxU4ZDInYgfvKAU3jIdKgw9'
WHERE plan_type = 'business' AND credits = 200;

-- Business 300 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKk4hcZMng6W7',
  stripe_price_id = 'price_1SxU4aDInYgfvKAUSCLSjPOH'
WHERE plan_type = 'business' AND credits = 300;

-- Business 400 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKkffEavhxt5S',
  stripe_price_id = 'price_1SxU4bDInYgfvKAUYC2iTVwD'
WHERE plan_type = 'business' AND credits = 400;

-- Business 500 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKklUArOAqoSf',
  stripe_price_id = 'price_1SxU4cDInYgfvKAUXiAkNrPf'
WHERE plan_type = 'business' AND credits = 500;

-- Business 750 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKkotIvQP69t6',
  stripe_price_id = 'price_1SxU4dDInYgfvKAUl3L1lMbE'
WHERE plan_type = 'business' AND credits = 750;

-- Business 1000 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKkgVm6ijiMAK',
  stripe_price_id = 'price_1SxU4fDInYgfvKAUreK9i2rc'
WHERE plan_type = 'business' AND credits = 1000;

-- Business 1500 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKkuSUEllzhMi',
  stripe_price_id = 'price_1SxU4gDInYgfvKAUblM1rRr2'
WHERE plan_type = 'business' AND credits = 1500;

-- Business 2000 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKkuRTjvsPsC4',
  stripe_price_id = 'price_1SxU4hDInYgfvKAUllZ3Agwf'
WHERE plan_type = 'business' AND credits = 2000;

-- Business 3000 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKkC7i2s2dtXR',
  stripe_price_id = 'price_1SxU4iDInYgfvKAU3HSfyWtt'
WHERE plan_type = 'business' AND credits = 3000;

-- Business 5000 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKk0Ku499WLiO',
  stripe_price_id = 'price_1SxU4kDInYgfvKAU2mTi8rIW'
WHERE plan_type = 'business' AND credits = 5000;

-- Business 10000 credits
UPDATE public.credit_tiers SET 
  stripe_product_id = 'prod_TvKkhNpIn2M9rT',
  stripe_price_id = 'price_1SxU4lDInYgfvKAUX1ywAi5h'
WHERE plan_type = 'business' AND credits = 10000;