import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check, Zap, Crown, Building2 } from 'lucide-react';
import Aurora from '@/components/Aurora';
import Navbar from '@/components/Navbar';

const plans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for trying out Buildify',
    icon: Zap,
    features: [
      '5 credits per day',
      'Basic AI generation',
      'Community support',
      'Public projects only',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For serious builders',
    icon: Crown,
    features: [
      '100 credits per month',
      'Advanced AI models',
      'Priority support',
      'Private projects',
      'Custom domains',
      'Export code',
    ],
    cta: 'Start Pro Trial',
    popular: true,
  },
  {
    name: 'Team',
    price: '$49',
    period: '/month',
    description: 'For teams building together',
    icon: Building2,
    features: [
      'Unlimited credits',
      'All Pro features',
      'Team collaboration',
      'SSO & advanced security',
      'Dedicated support',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export default function Pricing() {
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

        <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-32 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, <span className="text-gradient">transparent</span> pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free, scale as you grow. No hidden fees.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`glass-card p-8 relative ${
                  plan.popular ? 'border-primary/50 ring-2 ring-primary/20' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="gradient-button text-xs py-1 px-3">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <plan.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                </div>

                <div className="mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>

                <p className="text-muted-foreground text-sm mb-6">
                  {plan.description}
                </p>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-secondary" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/sign-up"
                  className={`block text-center py-3 rounded-lg font-medium transition-all ${
                    plan.popular
                      ? 'gradient-button'
                      : 'glass-button'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
