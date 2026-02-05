import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Type for credit tier
interface CreditTier {
  id: string;
  plan_type: string;
  credits: number;
  price_cents: number;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
}

// Type for user subscription
interface UserSubscription {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  selected_credits: number;
  plan_type: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    let event: Stripe.Event;

    // Verify webhook signature if secret is set
    if (webhookSecret) {
      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        throw new Error("No Stripe signature found");
      }
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // For development/testing without signature verification
      event = JSON.parse(body);
      logStep("WARNING: Webhook signature verification skipped (no STRIPE_WEBHOOK_SECRET)");
    }

    logStep("Received event", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(stripe, supabaseAdmin, session);
        break;
      }
      
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(stripe, supabaseAdmin, subscription);
        break;
      }
      
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabaseAdmin, subscription);
        break;
      }
      
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(stripe, supabaseAdmin, invoice);
        break;
      }
      
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabaseAdmin, invoice);
        break;
      }
      
      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function handleCheckoutComplete(
  stripe: Stripe,
  supabaseAdmin: SupabaseClient,
  session: Stripe.Checkout.Session
) {
  logStep("Processing checkout.session.completed", { sessionId: session.id });
  
  const userId = session.client_reference_id;
  const subscriptionId = session.subscription as string;
  const customerId = session.customer as string;
  
  if (!userId) {
    throw new Error("No client_reference_id (userId) in session");
  }
  
  // Get subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0].price.id;
  
  logStep("Retrieved subscription", { subscriptionId, priceId, customerId });
  
  // Look up credit tier from price ID
  const { data: tierData, error: tierError } = await supabaseAdmin
    .from("credit_tiers")
    .select("*")
    .eq("stripe_price_id", priceId)
    .single();
  
  if (tierError || !tierData) {
    throw new Error(`Credit tier not found for price ${priceId}`);
  }
  
  const tier = tierData as CreditTier;
  logStep("Found credit tier", { planType: tier.plan_type, credits: tier.credits });
  
  // Update user_subscriptions using service role (bypasses RLS)
  const { error: subError } = await supabaseAdmin
    .from("user_subscriptions")
    .upsert({
      user_id: userId,
      plan_type: tier.plan_type,
      selected_credits: tier.credits,
      price_cents: tier.price_cents,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      stripe_price_id: priceId,
      is_annual: subscription.items.data[0].price.recurring?.interval === "year",
      status: "active",
      billing_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      billing_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  
  if (subError) {
    throw new Error(`Failed to update subscription: ${subError.message}`);
  }
  
  // Add monthly credits via RPC function
  const { error: creditError } = await supabaseAdmin.rpc("add_credits", {
    p_user_id: userId,
    p_amount: tier.credits,
    p_transaction_type: "subscription",
    p_description: `${tier.plan_type.charAt(0).toUpperCase() + tier.plan_type.slice(1)} subscription - ${tier.credits} credits`,
  });
  
  if (creditError) {
    throw new Error(`Failed to add credits: ${creditError.message}`);
  }
  
  logStep("Checkout complete processed successfully", { userId, credits: tier.credits });
}

async function handleSubscriptionUpdated(
  stripe: Stripe,
  supabaseAdmin: SupabaseClient,
  subscription: Stripe.Subscription
) {
  logStep("Processing customer.subscription.updated", { subscriptionId: subscription.id });
  
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0].price.id;
  
  // Find user by stripe_customer_id
  const { data: userSubData, error: findError } = await supabaseAdmin
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();
  
  if (findError || !userSubData) {
    logStep("User not found for customer", { customerId });
    return;
  }
  
  const userSub = userSubData as { user_id: string };
  
  // Look up credit tier from price ID
  const { data: tierData } = await supabaseAdmin
    .from("credit_tiers")
    .select("*")
    .eq("stripe_price_id", priceId)
    .single();
  
  if (!tierData) {
    logStep("Credit tier not found", { priceId });
    return;
  }
  
  const tier = tierData as CreditTier;
  
  // Map Stripe status to our status
  let status: string = subscription.status;
  if (subscription.cancel_at_period_end) {
    status = "canceling";
  }
  
  // Update subscription
  const { error: updateError } = await supabaseAdmin
    .from("user_subscriptions")
    .update({
      plan_type: tier.plan_type,
      selected_credits: tier.credits,
      price_cents: tier.price_cents,
      stripe_price_id: priceId,
      is_annual: subscription.items.data[0].price.recurring?.interval === "year",
      status: status,
      billing_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      billing_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userSub.user_id);
  
  if (updateError) {
    throw new Error(`Failed to update subscription: ${updateError.message}`);
  }
  
  logStep("Subscription updated successfully", { userId: userSub.user_id, status });
}

async function handleSubscriptionDeleted(
  supabaseAdmin: SupabaseClient,
  subscription: Stripe.Subscription
) {
  logStep("Processing customer.subscription.deleted", { subscriptionId: subscription.id });
  
  const customerId = subscription.customer as string;
  
  // Find user by stripe_customer_id
  const { data: userSubData, error: findError } = await supabaseAdmin
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();
  
  if (findError || !userSubData) {
    logStep("User not found for customer", { customerId });
    return;
  }
  
  const userSub = userSubData as { user_id: string };
  
  // Downgrade to free plan
  const { error: updateError } = await supabaseAdmin
    .from("user_subscriptions")
    .update({
      plan_type: "free",
      selected_credits: 0,
      price_cents: 0,
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userSub.user_id);
  
  if (updateError) {
    throw new Error(`Failed to cancel subscription: ${updateError.message}`);
  }
  
  logStep("Subscription canceled successfully", { userId: userSub.user_id });
}

async function handleInvoicePaid(
  stripe: Stripe,
  supabaseAdmin: SupabaseClient,
  invoice: Stripe.Invoice
) {
  logStep("Processing invoice.paid", { invoiceId: invoice.id });
  
  // Skip if this is the first invoice (handled by checkout.session.completed)
  if (invoice.billing_reason === "subscription_create") {
    logStep("Skipping initial subscription invoice (handled by checkout)");
    return;
  }
  
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;
  
  if (!subscriptionId) {
    logStep("No subscription on invoice, skipping");
    return;
  }
  
  // Find user by stripe_customer_id
  const { data: userSubData, error: findError } = await supabaseAdmin
    .from("user_subscriptions")
    .select("user_id, selected_credits, plan_type")
    .eq("stripe_customer_id", customerId)
    .single();
  
  if (findError || !userSubData) {
    logStep("User not found for customer", { customerId });
    return;
  }
  
  const userSub = userSubData as UserSubscription;
  
  // Get subscription to update billing period
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  // Update billing period
  await supabaseAdmin
    .from("user_subscriptions")
    .update({
      status: "active",
      billing_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
      billing_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userSub.user_id);
  
  // Add monthly credits (renewal)
  const { error: creditError } = await supabaseAdmin.rpc("add_credits", {
    p_user_id: userSub.user_id,
    p_amount: userSub.selected_credits,
    p_transaction_type: "subscription",
    p_description: `${userSub.plan_type.charAt(0).toUpperCase() + userSub.plan_type.slice(1)} renewal - ${userSub.selected_credits} credits`,
  });
  
  if (creditError) {
    throw new Error(`Failed to add renewal credits: ${creditError.message}`);
  }
  
  logStep("Invoice paid processed successfully", { userId: userSub.user_id, credits: userSub.selected_credits });
}

async function handlePaymentFailed(
  supabaseAdmin: SupabaseClient,
  invoice: Stripe.Invoice
) {
  logStep("Processing invoice.payment_failed", { invoiceId: invoice.id });
  
  const customerId = invoice.customer as string;
  
  // Find user by stripe_customer_id
  const { data: userSubData, error: findError } = await supabaseAdmin
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();
  
  if (findError || !userSubData) {
    logStep("User not found for customer", { customerId });
    return;
  }
  
  const userSub = userSubData as { user_id: string };
  
  // Update status to past_due
  await supabaseAdmin
    .from("user_subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userSub.user_id);
  
  logStep("Payment failed status updated", { userId: userSub.user_id });
}
