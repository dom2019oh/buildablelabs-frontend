import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check, Zap, Rocket, Code2, Crown } from 'lucide-react';
import Aurora from '@/components/Aurora';
import Navbar from '@/components/Navbar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const plans = [
  {
    name: 'Free',
    tagline: 'Discover Buildify',
    price: '$0',
    period: '',
    chatsMax: '2 projects max',
    icon: Zap,
    features: [
      '15 messages per day',
      'Basic AI responses',
      'Memory resets after 24h',
      'Basic guidance',
      'Community support',
      'Public projects only',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Starter',
    tagline: 'For beginners',
    price: '$2.99',
    period: '/month',
    chatsMax: '5 projects max',
    icon: Rocket,
    features: [
      '50 messages per day',
      'Standard response length',
      'Short context memory (~75 msgs)',
      'Code help & bug fixes',
      'Basic services guidance',
      'System design help',
    ],
    cta: 'Subscribe',
    popular: false,
  },
  {
    name: 'Developer',
    tagline: 'For active developers',
    price: '$5.99',
    period: '/month',
    chatsMax: '12 projects max',
    icon: Code2,
    features: [
      '110 messages per day',
      'Larger responses',
      'Deep session memory',
      'Script refactors',
      'System design help',
      'Performance optimization',
    ],
    cta: 'Subscribe',
    popular: true,
  },
  {
    name: 'Pro',
    tagline: 'For power users',
    price: '$13.99',
    period: '/month',
    chatsMax: '20 projects max',
    icon: Crown,
    features: [
      '400 messages per week',
      'Maximum response size',
      'Persistent project memory',
      'Full architecture planning',
      'Large codebase debugging',
      'Advanced optimization patterns',
    ],
    cta: 'Subscribe',
    popular: false,
  },
];

const faqs = [
  {
    question: 'What is Buildify?',
    answer: 'Buildify is an AI-powered development platform that helps you build web applications faster with intelligent code generation, debugging assistance, and architectural guidance.',
  },
  {
    question: 'How do message limits work?',
    answer: 'Message limits determine how many AI interactions you can have per day or week depending on your plan. Limits reset daily at 00:00 UTC for daily plans and weekly for Pro.',
  },
  {
    question: 'Can I upgrade or downgrade anytime?',
    answer: 'Yes! You can change your plan at any time. Upgrades take effect immediately, and downgrades apply at the end of your current billing period.',
  },
  {
    question: 'What happens when my subscription expires?',
    answer: 'Your account will automatically downgrade to the Free tier. You\'ll retain access to your projects but with reduced message limits and features.',
  },
  {
    question: 'What does "session memory" mean?',
    answer: 'Session memory refers to how much context the AI retains during your conversations. Higher tiers have deeper memory, allowing for more coherent long-form development sessions.',
  },
  {
    question: 'Is my code kept private?',
    answer: 'Absolutely. Your code and projects are private by default on paid plans. We use industry-standard encryption and never share your data with third parties.',
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

        <section className="min-h-screen flex flex-col items-center px-6 pt-32 pb-24">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Buildify <span className="text-gradient">Subscriptions</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your development needs. Upgrade or downgrade anytime.
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto w-full mb-16">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`glass-card p-6 relative flex flex-col ${
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

                {/* Plan Header */}
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
                    <plan.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                </div>

                {/* Price */}
                <div className="text-center mb-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>

                {/* Chats Max */}
                <div className="text-center mb-4">
                  <span className="text-sm font-medium text-secondary">{plan.chatsMax}</span>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
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

          {/* Fair Usage Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="glass-card p-8 max-w-3xl mx-auto w-full mb-16"
          >
            <h2 className="text-2xl font-bold text-center mb-6">
              Fair Usage & Protection
            </h2>
            <ul className="grid md:grid-cols-2 gap-4">
              <li className="flex items-center gap-3 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                Limits reset daily at 00:00 UTC
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
                Automatic downgrade when subscription expires
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
