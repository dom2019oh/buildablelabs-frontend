
# Stripe Integration with Credit System

## Summary

This plan implements full Stripe payment integration for the credit-based subscription system with:
1. **26 Stripe Products** - 13 Pro credit tiers + 13 Business credit tiers (monthly recurring)
2. **Stripe Webhook Edge Function** - Handles subscription lifecycle events
3. **Enhanced RLS Policies** - 100% bulletproof credit protection
4. **Billing UI Upgrade** - Replace placeholder with functional subscription management

---

## Part 1: Create Stripe Products

### Pro Plan Credit Tiers (13 products)
Each product is a monthly recurring subscription with professional descriptions:

| Credits | Price | Product Name | Description |
|---------|-------|--------------|-------------|
| 50 | $15/mo | Buildable Pro 50 | Perfect for casual builders. 50 AI credits monthly for quick edits and simple projects. |
| 100 | $20/mo | Buildable Pro 100 | Ideal for hobbyists. 100 AI credits monthly for regular website maintenance. |
| 200 | $25/mo | Buildable Pro 200 | Great for active creators. 200 AI credits monthly for building multiple pages. |
| 300 | $35/mo | Buildable Pro 300 | Solid choice for freelancers. 300 AI credits monthly for client projects. |
| 400 | $45/mo | Buildable Pro 400 | Enhanced productivity. 400 AI credits monthly for frequent builders. |
| 500 | $55/mo | Buildable Pro 500 | Power user tier. 500 AI credits monthly for serious development. |
| 750 | $75/mo | Buildable Pro 750 | Professional builder. 750 AI credits monthly for high-output workflows. |
| 1000 | $95/mo | Buildable Pro 1K | Advanced creator. 1,000 AI credits monthly for intensive projects. |
| 1500 | $135/mo | Buildable Pro 1.5K | Heavy usage. 1,500 AI credits monthly for rapid prototyping. |
| 2000 | $175/mo | Buildable Pro 2K | Expert level. 2,000 AI credits monthly for full-scale development. |
| 3000 | $250/mo | Buildable Pro 3K | Studio grade. 3,000 AI credits monthly for complex applications. |
| 5000 | $400/mo | Buildable Pro 5K | Enterprise ready. 5,000 AI credits monthly for large projects. |
| 10000 | $700/mo | Buildable Pro 10K | Ultimate builder. 10,000 AI credits monthly for unlimited creativity. |

### Business Plan Credit Tiers (12 products)
| Credits | Price | Product Name | Description |
|---------|-------|--------------|-------------|
| 100 | $29/mo | Buildable Business 100 | Team starter. 100 AI credits monthly with team collaboration. |
| 200 | $39/mo | Buildable Business 200 | Small team. 200 AI credits monthly for growing studios. |
| 300 | $49/mo | Buildable Business 300 | Active team. 300 AI credits monthly for regular workflows. |
| 400 | $59/mo | Buildable Business 400 | Productive team. 400 AI credits monthly for consistent output. |
| 500 | $69/mo | Buildable Business 500 | Power team. 500 AI credits monthly for agency work. |
| 750 | $95/mo | Buildable Business 750 | Studio tier. 750 AI credits monthly for professional teams. |
| 1000 | $120/mo | Buildable Business 1K | Agency grade. 1,000 AI credits monthly for client work. |
| 1500 | $170/mo | Buildable Business 1.5K | High volume. 1,500 AI credits monthly for rapid delivery. |
| 2000 | $220/mo | Buildable Business 2K | Enterprise team. 2,000 AI credits monthly for scale. |
| 3000 | $320/mo | Buildable Business 3K | Large studio. 3,000 AI credits monthly for complex projects. |
| 5000 | $500/mo | Buildable Business 5K | Enterprise scale. 5,000 AI credits monthly for large teams. |
| 10000 | $900/mo | Buildable Business 10K | Ultimate team. 10,000 AI credits monthly for unlimited output. |

---

## Part 2: Database Schema Updates

### Add Stripe Product IDs to credit_tiers table
```sql
ALTER TABLE public.credit_tiers 
ADD COLUMN stripe_product_id TEXT,
ADD COLUMN stripe_price_id TEXT,
ADD COLUMN stripe_annual_price_id TEXT;
```

### Add stripe_price_id to user_subscriptions
```sql
ALTER TABLE public.user_subscriptions 
ADD COLUMN stripe_price_id TEXT;
```

---

## Part 3: RLS Policy Audit & Fixes

Current RLS policies need strengthening to achieve 100% protection:

### user_credits table
Current issues:
- Users can INSERT their own credits (potential abuse vector)
- No UPDATE policy via RLS (only via RPC functions - good)

**Fix**: Remove INSERT policy, only allow via RPC/triggers
```sql
-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own credits" ON public.user_credits;

-- All credit modifications MUST go through RPC functions with SECURITY DEFINER
```

### credit_transactions table
Current: Users can only SELECT their own transactions - GOOD
Verify: No INSERT/UPDATE/DELETE by users - CORRECT

### user_subscriptions table
Current issues:
- Users can INSERT their own subscription (should only be via webhook/trigger)
- Users can UPDATE their own subscription (dangerous - could change plan_type)

**Fix**: 
```sql
-- Drop dangerous policies
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;

-- Only allow SELECT
-- All modifications via Stripe webhook with service role
```

### Summary of RLS Enforcement
| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| user_credits | Own only | RPC only | RPC only | Never |
| credit_transactions | Own only | RPC only | Never | Never |
| user_subscriptions | Own only | Webhook only | Webhook only | Never |
| credit_tiers | All | Admin only | Admin only | Admin only |
| credit_action_costs | Active only | Admin only | Admin only | Admin only |

---

## Part 4: Stripe Webhook Edge Function

Create `supabase/functions/stripe-webhook/index.ts`:

### Webhook Events to Handle:
1. `checkout.session.completed` - New subscription
2. `customer.subscription.updated` - Plan changes
3. `customer.subscription.deleted` - Cancellation
4. `invoice.paid` - Monthly renewal (add credits)
5. `invoice.payment_failed` - Payment failure

### Webhook Logic:
```typescript
// Event: checkout.session.completed
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id;
  const subscriptionId = session.subscription;
  const customerId = session.customer;
  
  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0].price.id;
  
  // Look up credit tier from price ID
  const tier = await getCreditTierByPriceId(priceId);
  
  // Update user_subscriptions (using service role)
  await supabaseAdmin.from('user_subscriptions').upsert({
    user_id: userId,
    plan_type: tier.plan_type,
    selected_credits: tier.credits,
    price_cents: tier.price_cents,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    stripe_price_id: priceId,
    is_annual: subscription.items.data[0].price.recurring.interval === 'year',
    status: 'active',
    billing_period_start: new Date(subscription.current_period_start * 1000),
    billing_period_end: new Date(subscription.current_period_end * 1000),
  });
  
  // Add monthly credits
  await supabaseAdmin.rpc('add_credits', {
    p_user_id: userId,
    p_amount: tier.credits,
    p_transaction_type: 'subscription',
    p_description: `${tier.plan_type} subscription - ${tier.credits} credits`,
  });
}
```

---

## Part 5: Checkout Session Edge Function

Create `supabase/functions/create-checkout/index.ts`:

```typescript
// Creates Stripe Checkout session for subscription
export async function createCheckout(req: Request) {
  const { priceId, userId, isAnnual } = await req.json();
  
  // Verify user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  
  // Get or create Stripe customer
  let customerId = await getStripeCustomerId(userId);
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId },
    });
    customerId = customer.id;
  }
  
  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    client_reference_id: userId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/billing?success=true`,
    cancel_url: `${origin}/pricing?canceled=true`,
    subscription_data: {
      metadata: { userId },
    },
  });
  
  return new Response(JSON.stringify({ url: session.url }));
}
```

---

## Part 6: Billing Portal Edge Function

Create `supabase/functions/billing-portal/index.ts`:

```typescript
// Opens Stripe Customer Portal for managing subscription
export async function createPortalSession(req: Request) {
  const { userId } = await req.json();
  
  // Get Stripe customer ID
  const { data: sub } = await supabaseAdmin
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single();
  
  if (!sub?.stripe_customer_id) {
    return new Response(JSON.stringify({ error: 'No subscription found' }), { status: 404 });
  }
  
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}/dashboard/billing`,
  });
  
  return new Response(JSON.stringify({ url: session.url }));
}
```

---

## Part 7: Updated Billing UI

Replace `src/components/dashboard/BillingView.tsx` with:

- Current plan display (from user_subscriptions)
- Credit balance breakdown (monthly/bonus/rollover/topup)
- "Manage Subscription" button (opens Stripe Portal)
- "Upgrade Plan" button (opens pricing page)
- Credit usage chart (from credit_transactions)
- Next billing date and renewal info

---

## Part 8: Pricing Page Updates

Update `src/pages/Pricing.tsx`:

- Replace static `proCreditTiers` and `businessCreditTiers` with database data
- Add "Subscribe" button that calls `create-checkout` edge function
- Handle success/cancel query params
- Show current plan badge if user already subscribed

---

## Technical Implementation

### Files to Create:
| File | Purpose |
|------|---------|
| `supabase/functions/stripe-webhook/index.ts` | Handle Stripe events |
| `supabase/functions/create-checkout/index.ts` | Create checkout sessions |
| `supabase/functions/billing-portal/index.ts` | Manage subscription portal |
| `src/hooks/useStripeCheckout.ts` | React hook for checkout flow |

### Files to Modify:
| File | Changes |
|------|---------|
| `src/components/dashboard/BillingView.tsx` | Full UI implementation |
| `src/pages/Pricing.tsx` | Stripe checkout integration |
| `src/hooks/useCredits.ts` | Add subscription status helpers |

### Database Migrations:
1. Add Stripe columns to `credit_tiers`
2. Add `stripe_price_id` to `user_subscriptions`
3. Tighten RLS policies on credit tables
4. Update `credit_tiers` with Stripe IDs after product creation

### Stripe Products to Create:
- 13 Pro tier products (monthly recurring)
- 12 Business tier products (monthly recurring)
- Optionally: 25 annual variants (20% discount)

---

## Security Guarantees

1. **Credits cannot be self-modified** - All credit changes go through SECURITY DEFINER functions
2. **Subscriptions are Stripe-controlled** - Only webhook can modify subscription data
3. **Transaction log is immutable** - Users can only read, never write
4. **RLS is enforced at database level** - Even if frontend is compromised, backend is secure
5. **Webhook signature verification** - All Stripe events are cryptographically verified

