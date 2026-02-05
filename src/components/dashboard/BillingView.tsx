import { motion } from 'framer-motion';
import { CreditCard, Sparkles, TrendingUp, Calendar, ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCredits } from '@/hooks/useCredits';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function BillingView() {
  const { credits, subscription, transactions, totalCredits, isLoading } = useCredits();
  const { openBillingPortal, isLoading: isPortalLoading } = useStripeCheckout();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Handle success/cancel redirects from Stripe
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast({
        title: 'Subscription Activated!',
        description: 'Your subscription is now active. Credits have been added to your account.',
      });
      // Remove query params
      navigate('/dashboard/billing', { replace: true });
    }
  }, [searchParams, navigate]);

  const isPaid = subscription?.plan_type !== 'free';
  const hasStripeSubscription = !!subscription?.stripe_subscription_id;

  // Get recent transactions (last 10)
  const recentTransactions = transactions?.slice(0, 10) || [];

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <CreditCard className="w-6 h-6" />
          Billing
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your subscription and credits
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Plan */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass-card p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-medium mb-1">Current Plan</h3>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold capitalize">
                    {subscription?.plan_type || 'Free'}
                  </span>
                  {isPaid && (
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="w-3 h-3" />
                      {subscription?.is_annual ? 'Annual' : 'Monthly'}
                    </Badge>
                  )}
                  {!isPaid && (
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="w-3 h-3" />
                      Beta
                    </Badge>
                  )}
                </div>
              </div>
              {isPaid && subscription?.price_cents && (
                <div className="text-right">
                  <span className="text-2xl font-bold">
                    ${(subscription.price_cents / 100).toFixed(0)}
                  </span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                </div>
              )}
            </div>

            {isPaid && subscription && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {subscription.selected_credits.toLocaleString()} credits/month
                  </span>
                </div>
                {subscription.billing_period_end && (
                  <div className="flex items-center gap-1">
                    <span>Renews {format(new Date(subscription.billing_period_end), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {hasStripeSubscription ? (
                <Button
                  onClick={() => openBillingPortal()}
                  disabled={isPortalLoading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isPortalLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  Manage Subscription
                </Button>
              ) : (
                <Button
                  onClick={() => navigate('/pricing')}
                  className="gradient-button"
                >
                  Upgrade Plan
                </Button>
              )}
              {isPaid && (
                <Button
                  variant="ghost"
                  onClick={() => navigate('/pricing')}
                >
                  Change Plan
                </Button>
              )}
            </div>
          </motion.div>

          {/* Credit Balance */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Credit Balance</h3>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-secondary" />
                <span className="text-2xl font-bold">{totalCredits.toLocaleString()}</span>
                <span className="text-muted-foreground text-sm">credits</span>
              </div>
            </div>

            {credits && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Monthly</p>
                  <p className="font-semibold">{Number(credits.monthly_credits).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Bonus</p>
                  <p className="font-semibold">{Number(credits.bonus_credits).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Rollover</p>
                  <p className="font-semibold">{Number(credits.rollover_credits).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Top-up</p>
                  <p className="font-semibold">{Number(credits.topup_credits).toLocaleString()}</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Recent Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-6"
          >
            <h3 className="font-medium mb-4">Recent Activity</h3>
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {tx.description || tx.transaction_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <div className={`text-sm font-medium ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No transactions yet
              </p>
            )}
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <h3 className="font-medium mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/pricing')}
              >
                View Pricing Plans
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/dashboard/usage')}
              >
                View Detailed Usage
              </Button>
            </div>
          </motion.div>

          {/* Beta Info */}
          {!isPaid && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-card p-6"
            >
              <h3 className="font-medium mb-2">Beta Access</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Full access to all features during beta</li>
                <li>• Daily bonus credits available</li>
                <li>• Early access to new features</li>
                <li>• Priority support feedback channel</li>
              </ul>
            </motion.div>
          )}

          {/* Subscription Status */}
          {isPaid && subscription && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="glass-card p-6"
            >
              <h3 className="font-medium mb-3">Subscription Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                    {subscription.status}
                  </Badge>
                </div>
                {subscription.billing_period_start && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Period Start</span>
                    <span>{format(new Date(subscription.billing_period_start), 'MMM d, yyyy')}</span>
                  </div>
                )}
                {subscription.billing_period_end && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Period End</span>
                    <span>{format(new Date(subscription.billing_period_end), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
