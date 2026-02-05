import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Check, Zap, Users, Building2, Info, Loader2 } from 'lucide-react';
import Aurora from '@/components/Aurora';
import Navbar from '@/components/Navbar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface CreditTierWithStripe {
  credits: number;
  price: number;
  priceId: string | null;
}

// Fetch credit tiers from database
function useCreditTiers() {
  return useQuery({
    queryKey: ['credit-tiers-with-stripe'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_tiers')
        .select('*')
        .order('credits', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
}

const faqs = [
  {
    question: 'What is Buildable?',
    answer: 'Buildable is an AI-powered development platform that helps you build web applications faster with intelligent code generation, debugging assistance, and architectural guidance.',
  },
  {
    question: 'How do credits work?',
    answer: 'Credits are used for AI-powered actions. Simple questions cost 0.15 credits, while full page creation costs 1.15 credits. You can see the exact cost before each action. Credits reset monthly, and unused credits can roll over on paid plans.',
  },
  {
    question: 'Can I upgrade or downgrade anytime?',
    answer: 'Yes! You can change your plan or credit tier at any time. Upgrades take effect immediately, and downgrades apply at the end of your current billing period.',
  },
  {
    question: 'What happens when I run out of credits?',
    answer: 'When you run out of credits, you can either wait for your daily bonus credits (5/day on paid plans), purchase a top-up, or upgrade your plan. Your projects remain accessible.',
  },
  {
    question: 'What does "credit rollover" mean?',
    answer: 'Credit rollover means unused monthly credits carry over to the next month (up to 2x your monthly limit). This is available on Pro and Business plans.',
  },
  {
    question: 'Is my code kept private?',
    answer: 'Absolutely. Your code and projects are private by default on paid plans. We use industry-standard encryption and never share your data with third parties.',
  },
];

interface PlanCardProps {
  name: string;
  tagline: string;
  basePrice: number;
  icon: React.ElementType;
  features: string[];
  bestFor: string[];
  creditTiers?: CreditTierWithStripe[];
  isEnterprise?: boolean;
  isAnnual: boolean;
  onSubscribe?: (priceId: string) => void;
  isCheckoutLoading?: boolean;
  isAuthenticated?: boolean;
  currentPlanType?: string;
}

function PlanCard({ 
  name, 
  tagline, 
  basePrice, 
  icon: Icon, 
  features, 
  bestFor,
  creditTiers,
  isEnterprise,
  isAnnual,
  onSubscribe,
  isCheckoutLoading,
  isAuthenticated,
  currentPlanType,
}: PlanCardProps) {
  const [selectedCredits, setSelectedCredits] = useState(
    creditTiers?.[0]?.credits?.toString() || ''
  );

  const selectedTier = creditTiers?.find(
    (t) => t.credits.toString() === selectedCredits
  );

  const monthlyPrice = isAnnual && selectedTier 
    ? Math.round(selectedTier.price * 0.8) 
    : selectedTier?.price || basePrice;

  const isCurrentPlan = currentPlanType === name.toLowerCase();

  const handleSubscribe = () => {
    if (selectedTier?.priceId && onSubscribe) {
      onSubscribe(selectedTier.priceId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`glass-card p-6 flex flex-col h-full ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
    >
      {/* Plan Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl font-bold">{name}</h3>
          {isCurrentPlan && (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
              Current Plan
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{tagline}</p>
      </div>

      {/* Price */}
      <div className="mb-4">
        {isEnterprise ? (
          <div>
            <span className="text-3xl font-bold">Custom</span>
            <p className="text-sm text-muted-foreground mt-1">Flexible plans</p>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">${monthlyPrice}</span>
              <span className="text-muted-foreground">per month</span>
              <span className="text-xs text-muted-foreground ml-1">incl. VAT</span>
            </div>
            {isAnnual && selectedTier && (
              <p className="text-xs text-secondary mt-1">
                Save ${Math.round(selectedTier.price * 12 * 0.2)}/year
              </p>
            )}
          </div>
        )}
      </div>

      {/* Credit Selector */}
      {creditTiers && creditTiers.length > 0 && (
        <div className="mb-4">
          <Select value={selectedCredits} onValueChange={setSelectedCredits}>
            <SelectTrigger className="w-full glass-button border-border/50">
              <SelectValue placeholder="Select credits" />
            </SelectTrigger>
            <SelectContent>
              {creditTiers.map((tier) => (
                <SelectItem key={tier.credits} value={tier.credits.toString()}>
                  {tier.credits.toLocaleString()} credits / month
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* CTA Button */}
      {isEnterprise ? (
        <Link
          to="/contact"
          className="block text-center py-3 rounded-lg font-medium glass-button mb-6"
        >
          Book a demo
        </Link>
      ) : isAuthenticated ? (
        <Button
          onClick={handleSubscribe}
          disabled={isCheckoutLoading || !selectedTier?.priceId || isCurrentPlan}
          className="w-full py-3 rounded-lg font-medium gradient-button mb-6"
        >
          {isCheckoutLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : isCurrentPlan ? (
            'Current Plan'
          ) : (
            name === 'Pro' ? 'Upgrade to Pro' : 'Upgrade to Business'
          )}
        </Button>
      ) : (
        <Link
          to="/sign-up"
          className="block text-center py-3 rounded-lg font-medium gradient-button mb-6"
        >
          {name === 'Pro' ? 'Get Started' : 'Get Started'}
        </Link>
      )}

      {/* Features Header */}
      <p className="text-sm text-muted-foreground mb-3">
        {name === 'Pro' ? 'Includes' : name === 'Business' ? 'Everything in Pro, plus' : 'Everything in Business, plus'}
      </p>

      {/* Features */}
      <ul className="space-y-2 mb-6 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {/* Best For */}
      <div className="mt-auto pt-4 border-t border-border/30">
        <p className="text-xs text-muted-foreground mb-2">Best for</p>
        <div className="flex flex-wrap gap-2">
          {bestFor.map((item) => (
            <span
              key={item}
              className="text-xs px-2 py-1 rounded-full bg-muted/50 text-muted-foreground"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoading: plansLoading } = useSubscriptionPlans();
  const { data: creditTiersData, isLoading: tiersLoading } = useCreditTiers();
  const { startCheckout, isLoading: isCheckoutLoading } = useStripeCheckout();
  const { subscription } = useCredits();
  const { user } = useAuth();

  // Handle canceled checkout
  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      toast({
        title: 'Checkout Canceled',
        description: 'Your checkout was canceled. You can try again anytime.',
      });
      navigate('/pricing', { replace: true });
    }
  }, [searchParams, navigate]);

  // Transform database tiers to component format
  const proCreditTiers: CreditTierWithStripe[] = creditTiersData
    ?.filter(t => t.plan_type === 'pro')
    .map(t => ({
      credits: t.credits,
      price: t.price_cents / 100,
      priceId: t.stripe_price_id,
    })) || [];

  const businessCreditTiers: CreditTierWithStripe[] = creditTiersData
    ?.filter(t => t.plan_type === 'business')
    .map(t => ({
      credits: t.credits,
      price: t.price_cents / 100,
      priceId: t.stripe_price_id,
    })) || [];

  const handleSubscribe = (priceId: string) => {
    startCheckout(priceId);
  };

  const plans = [
    {
      name: 'Pro',
      tagline: 'For solo builders and creators',
      basePrice: 15,
      icon: Zap,
      creditTiers: proCreditTiers,
      features: [
        'Prompt → website generation',
        'Prompt → app UI generation',
        'Code export (React / Vite)',
        'Unlimited projects',
        'Private & public projects',
        'Credit rollover',
        'Daily bonus credits (5/day)',
        'Custom domains',
        'Remove Buildable branding',
        'On-demand credit top-ups',
      ],
      bestFor: ['Solo devs', 'Roblox creators', 'Students', 'Indie SaaS builders'],
    },
    {
      name: 'Business',
      tagline: 'For teams and studios',
      basePrice: 29,
      icon: Users,
      creditTiers: businessCreditTiers,
      features: [
        'Team workspaces',
        'Shared projects',
        'Up to 5 team members',
        'Role-based access (Owner / Editor / Viewer)',
        'Internal preview links',
        'Personal sandbox projects',
        'Design templates',
        'Advanced AI generation modes',
        'SSO (Google, GitHub)',
      ],
      bestFor: ['Agencies', 'Small studios', 'Roblox Milsim teams', 'Startup teams'],
    },
    {
      name: 'Enterprise',
      tagline: 'For large orgs & platforms',
      basePrice: 0,
      icon: Building2,
      isEnterprise: true,
      features: [
        'Unlimited team members',
        'Custom credit plans',
        'Dedicated support',
        'Onboarding & training',
        'Group-based access control',
        'Audit logs',
        'SCIM provisioning',
        'Custom design systems',
        'Private deployments',
        'SLA & priority infrastructure',
      ],
      bestFor: ['Large studios', 'Platforms', 'Companies with internal tools'],
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 z-0">
        <Aurora
          colorStops={["#666bff", "#ce2c2c", "#29ff90"]}
          blend={0.59}
          amplitude={1.0}
          speed={1.5}
        />
      </div>

      <div className="relative z-10">
        <Navbar />

        <section className="min-h-screen flex flex-col items-center px-6 pt-32 pb-24">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Buildable <span className="text-gradient">Pricing</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Scale your creative output with flexible credit-based plans. Upgrade or downgrade anytime.
            </p>
          </motion.div>

          {/* Annual Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-3 mb-12"
          >
            <Label htmlFor="annual-toggle" className={!isAnnual ? 'text-foreground' : 'text-muted-foreground'}>
              Monthly
            </Label>
            <Switch
              id="annual-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label htmlFor="annual-toggle" className={isAnnual ? 'text-foreground' : 'text-muted-foreground'}>
              Annual
            </Label>
            {isAnnual && (
              <span className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary ml-2">
                Save 20%
              </span>
            )}
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto w-full mb-16">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <PlanCard
                  {...plan}
                  isAnnual={isAnnual}
                  isEnterprise={plan.isEnterprise}
                  onSubscribe={handleSubscribe}
                  isCheckoutLoading={isCheckoutLoading}
                  isAuthenticated={!!user}
                  currentPlanType={subscription?.plan_type}
                />
              </motion.div>
            ))}
          </div>

          {/* Credit Costs Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="glass-card p-8 max-w-4xl mx-auto w-full mb-16"
          >
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-2xl font-bold">Credit Usage</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Credits are deducted based on the complexity of each action</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Light Usage</h4>
                <div className="flex justify-between text-sm">
                  <span>AI Chat Message</span>
                  <span className="text-secondary font-medium">0.10 credits</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Question Answer</span>
                  <span className="text-secondary font-medium">0.15 credits</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Code Export</span>
                  <span className="text-secondary font-medium">0.25 credits</span>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Standard Usage</h4>
                <div className="flex justify-between text-sm">
                  <span>Component Generation</span>
                  <span className="text-secondary font-medium">0.50 credits</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Image Generation</span>
                  <span className="text-secondary font-medium">0.75 credits</span>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Heavy Usage</h4>
                <div className="flex justify-between text-sm">
                  <span>Full Page Creation</span>
                  <span className="text-secondary font-medium">1.15 credits</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Deployment</span>
                  <span className="text-secondary font-medium">Free</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Fair Usage Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="glass-card p-8 max-w-4xl mx-auto w-full mb-16"
          >
            <h2 className="text-2xl font-bold text-center mb-6">
              Fair Usage & Protection
            </h2>
            <ul className="grid md:grid-cols-2 gap-4">
              <li className="flex items-center gap-3 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                Monthly credits reset on billing date
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                Rate limiting: 1 request every 5-10 seconds
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                Cancel anytime, no questions asked
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                Credit rollover up to 2x monthly limit
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                Daily bonus: 5 credits/day on paid plans
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                On-demand top-ups available anytime
              </li>
            </ul>
          </motion.div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="max-w-3xl mx-auto w-full"
          >
            <h2 className="text-2xl font-bold text-center mb-8">
              Frequently Asked Questions
            </h2>
            <Accordion type="single" collapsible className="glass-card p-6">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-border/50">
                  <AccordionTrigger className="text-left hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
