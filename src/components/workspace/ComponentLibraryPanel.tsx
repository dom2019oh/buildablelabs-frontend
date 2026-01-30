import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Layout, Menu, LayoutGrid, DollarSign, MessageSquareQuote, Sparkles, Copy, Check, ChevronRight, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ComponentTemplate {
  id: string;
  name: string;
  category: 'navbar' | 'footer' | 'pricing' | 'testimonials' | 'hero' | 'features' | 'cta';
  description: string;
  preview: string;
  code: string;
  tags: string[];
}

// Randomized insert messages for each category
const INSERT_MESSAGES: Record<string, string[]> = {
  navbar: [
    "Ohh, that's a slick navbar pick! Want me to insert it into your {page}? It'll take just a moment. ⚡",
    "Great choice on the navigation! Ready to add this to your {page}? Let's make it happen! 🚀",
    "This navbar is going to look amazing! Shall I drop it into your {page}? Just a few seconds! ✨",
    "Nice pick! This nav will really elevate your {page}. Ready for me to insert it?",
    "Ooh, excellent navbar choice! Want this in your {page}? I'll have it done in a flash! 💫",
  ],
  hero: [
    "Now that's a hero section! Ready for me to add it to your {page}? Let's make an impact! 🎯",
    "Bold choice! This hero will grab attention on your {page}. Shall I insert it?",
    "Love it! This hero is going to make your {page} shine. Insert now? ✨",
    "Great hero pick! Want me to drop this into your {page}? Takes just seconds!",
    "That's a powerful first impression! Ready to add it to your {page}? 🚀",
  ],
  features: [
    "Perfect features section! Ready to showcase what you offer on your {page}? 💎",
    "This features layout is clean! Want me to add it to your {page}?",
    "Great choice! These features will really sell it on your {page}. Insert now?",
    "Love the bento grid! Ready for me to drop this into your {page}? ✨",
    "That's going to look amazing! Shall I insert this into your {page}? 🔥",
  ],
  pricing: [
    "Smart pricing section pick! Ready to add it to your {page}? Let's get those conversions! 💰",
    "This pricing layout is clean! Want me to insert it into your {page}?",
    "Great choice! This will make pricing crystal clear on your {page}. Ready?",
    "Ooh, nice pricing table! Shall I drop this into your {page}? ✨",
    "That's a conversion-ready pricing section! Insert into your {page}? 📈",
  ],
  testimonials: [
    "Social proof! This testimonials section will build trust on your {page}. Insert now? 💬",
    "Great testimonials pick! Ready to add some social proof to your {page}?",
    "Love it! These testimonials will convince visitors. Add to your {page}? ⭐",
    "Nice choice! Social proof is key. Want me to insert this into your {page}?",
    "Perfect for building trust! Ready for me to add this to your {page}? 🌟",
  ],
  cta: [
    "That's a compelling CTA! Ready to drive action on your {page}? Let's do it! 🎯",
    "Great CTA choice! Want me to add this conversion magnet to your {page}?",
    "This CTA is going to convert! Shall I insert it into your {page}? 💫",
    "Bold call-to-action! Ready to add it to your {page}? Takes just seconds!",
    "Love it! This CTA will get clicks. Insert into your {page}? 🚀",
  ],
  footer: [
    "Nice footer! The perfect way to wrap up your {page}. Want me to insert it? 📋",
    "Clean footer choice! Ready to add it to your {page}?",
    "That's a solid footer! Shall I drop this into your {page}? ✨",
    "Great footer pick! Want me to add the finishing touch to your {page}?",
    "Perfect ending! Ready for me to insert this footer into your {page}? 🎬",
  ],
};

// Get a random message for a category
function getRandomInsertMessage(category: string, pageName: string = 'landing page'): string {
  const messages = INSERT_MESSAGES[category] || INSERT_MESSAGES.features;
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  return randomMessage.replace('{page}', pageName);
}

const componentTemplates: ComponentTemplate[] = [
  // NAVBAR TEMPLATES
  {
    id: 'navbar-glass',
    name: 'Glass Navbar',
    category: 'navbar',
    description: 'Modern glassmorphism navigation with blur effects',
    tags: ['glass', 'modern', 'blur'],
    preview: `<nav class="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/10 border-b border-white/10">
      <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500"></div>
          <span class="font-bold text-lg">Brand</span>
        </div>
        <div class="flex items-center gap-8">
          <a class="text-sm text-gray-300 hover:text-white transition-colors">Products</a>
          <a class="text-sm text-gray-300 hover:text-white transition-colors">Features</a>
          <a class="text-sm text-gray-300 hover:text-white transition-colors">Pricing</a>
          <button class="px-4 py-2 text-sm font-medium rounded-lg bg-white text-black hover:bg-gray-100 transition-colors">Get Started</button>
        </div>
      </div>
    </nav>`,
    code: `export default function GlassNavbar() {
  const navLinks = [
    { href: '/products', label: 'Products' },
    { href: '/features', label: 'Features' },
    { href: '/pricing', label: 'Pricing' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/10 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500" />
          <span className="font-bold text-lg text-white">Brand</span>
        </div>
        <div className="flex items-center gap-8">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-gray-300 hover:text-white transition-colors">
              {link.label}
            </a>
          ))}
          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-white text-black hover:bg-gray-100 transition-colors">
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
}`,
  },
  {
    id: 'navbar-minimal',
    name: 'Minimal Navbar',
    category: 'navbar',
    description: 'Clean, minimal navigation with centered logo',
    tags: ['minimal', 'clean', 'centered'],
    preview: `<nav class="border-b border-gray-800 bg-black">
      <div class="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div class="flex items-center gap-8">
          <a class="text-sm text-gray-400 hover:text-white">About</a>
          <a class="text-sm text-gray-400 hover:text-white">Work</a>
        </div>
        <span class="text-xl font-bold tracking-tight">STUDIO</span>
        <div class="flex items-center gap-8">
          <a class="text-sm text-gray-400 hover:text-white">Blog</a>
          <a class="text-sm text-gray-400 hover:text-white">Contact</a>
        </div>
      </div>
    </nav>`,
    code: `export default function MinimalNavbar() {
  return (
    <nav className="border-b border-gray-800 bg-black">
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a href="/about" className="text-sm text-gray-400 hover:text-white transition-colors">About</a>
          <a href="/work" className="text-sm text-gray-400 hover:text-white transition-colors">Work</a>
        </div>
        <span className="text-xl font-bold tracking-tight text-white">STUDIO</span>
        <div className="flex items-center gap-8">
          <a href="/blog" className="text-sm text-gray-400 hover:text-white transition-colors">Blog</a>
          <a href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">Contact</a>
        </div>
      </div>
    </nav>
  );
}`,
  },

  // HERO TEMPLATES
  {
    id: 'hero-gradient',
    name: 'Gradient Hero',
    category: 'hero',
    description: 'Bold gradient background with animated elements',
    tags: ['gradient', 'bold', 'animated'],
    preview: `<section class="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-black to-pink-900 relative overflow-hidden">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,0,255,0.3),transparent_50%)]"></div>
      <div class="text-center z-10 px-6">
        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-300 text-sm mb-6">
          <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          Now in Beta
        </span>
        <h1 class="text-6xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">Build Something<br/>Extraordinary</h1>
        <p class="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">The next-generation platform for developers who want to create exceptional digital experiences.</p>
        <div class="flex items-center justify-center gap-4">
          <button class="px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-gray-100">Start Building →</button>
          <button class="px-6 py-3 rounded-lg border border-white/20 text-white font-medium hover:bg-white/10">Watch Demo</button>
        </div>
      </div>
    </section>`,
    code: `export default function GradientHero() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-black to-pink-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,0,255,0.3),transparent_50%)]" />
      <div className="text-center z-10 px-6">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-300 text-sm mb-6">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Now in Beta
        </span>
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
          Build Something<br/>Extraordinary
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
          The next-generation platform for developers who want to create exceptional digital experiences.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button className="px-6 py-3 rounded-lg bg-white text-black font-medium hover:bg-gray-100 transition-colors">
            Start Building →
          </button>
          <button className="px-6 py-3 rounded-lg border border-white/20 text-white font-medium hover:bg-white/10 transition-colors">
            Watch Demo
          </button>
        </div>
      </div>
    </section>
  );
}`,
  },

  // FEATURES TEMPLATES
  {
    id: 'features-bento',
    name: 'Bento Grid Features',
    category: 'features',
    description: 'Modern bento-style grid layout for features',
    tags: ['bento', 'grid', 'cards'],
    preview: `<section class="py-24 px-6 bg-black">
      <div class="max-w-6xl mx-auto">
        <h2 class="text-4xl font-bold text-center mb-4">Why Choose Us</h2>
        <p class="text-gray-400 text-center mb-16 max-w-2xl mx-auto">Everything you need to build modern applications</p>
        <div class="grid grid-cols-3 gap-4">
          <div class="col-span-2 p-8 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10">
            <div class="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">⚡</div>
            <h3 class="text-2xl font-bold mb-2">Lightning Fast</h3>
            <p class="text-gray-400">Built for speed with optimized performance and instant updates.</p>
          </div>
          <div class="p-8 rounded-2xl bg-white/5 border border-white/10">
            <div class="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">🔒</div>
            <h3 class="text-xl font-bold mb-2">Secure</h3>
            <p class="text-gray-400 text-sm">Enterprise-grade security built-in.</p>
          </div>
          <div class="p-8 rounded-2xl bg-white/5 border border-white/10">
            <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">📱</div>
            <h3 class="text-xl font-bold mb-2">Responsive</h3>
            <p class="text-gray-400 text-sm">Works perfectly on all devices.</p>
          </div>
          <div class="col-span-2 p-8 rounded-2xl bg-white/5 border border-white/10">
            <div class="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">🎨</div>
            <h3 class="text-2xl font-bold mb-2">Beautiful Design</h3>
            <p class="text-gray-400">Stunning components crafted with attention to every detail.</p>
          </div>
        </div>
      </div>
    </section>`,
    code: `export default function BentoFeatures() {
  const features = [
    { icon: '⚡', title: 'Lightning Fast', description: 'Built for speed with optimized performance and instant updates.', span: 'col-span-2', gradient: 'from-purple-500/20 to-pink-500/20' },
    { icon: '🔒', title: 'Secure', description: 'Enterprise-grade security built-in.', iconBg: 'bg-blue-500/20' },
    { icon: '📱', title: 'Responsive', description: 'Works perfectly on all devices.', iconBg: 'bg-green-500/20' },
    { icon: '🎨', title: 'Beautiful Design', description: 'Stunning components crafted with attention to every detail.', span: 'col-span-2', iconBg: 'bg-orange-500/20' },
  ];

  return (
    <section className="py-24 px-6 bg-black">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 text-white">Why Choose Us</h2>
        <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">Everything you need to build modern applications</p>
        <div className="grid grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <div key={i} className={\`\${feature.span || ''} p-8 rounded-2xl \${feature.gradient ? \`bg-gradient-to-br \${feature.gradient}\` : 'bg-white/5'} border border-white/10\`}>
              <div className={\`w-12 h-12 rounded-xl \${feature.iconBg || 'bg-purple-500/20'} flex items-center justify-center mb-4 text-2xl\`}>{feature.icon}</div>
              <h3 className={\`\${feature.span ? 'text-2xl' : 'text-xl'} font-bold mb-2 text-white\`}>{feature.title}</h3>
              <p className={\`text-gray-400 \${feature.span ? '' : 'text-sm'}\`}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
  },

  // PRICING TEMPLATES
  {
    id: 'pricing-modern',
    name: 'Modern Pricing',
    category: 'pricing',
    description: 'Clean pricing cards with gradient accent',
    tags: ['modern', 'gradient', 'popular'],
    preview: `<section class="py-24 px-6 bg-black">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-4xl font-bold text-center mb-4">Simple Pricing</h2>
        <p class="text-gray-400 text-center mb-16">Choose the plan that works for you</p>
        <div class="grid md:grid-cols-3 gap-6">
          <div class="p-8 rounded-2xl bg-white/5 border border-white/10">
            <h3 class="text-lg font-medium mb-2">Starter</h3>
            <div class="text-4xl font-bold mb-1">$9<span class="text-lg text-gray-400">/mo</span></div>
            <p class="text-gray-400 text-sm mb-6">Perfect for side projects</p>
            <ul class="space-y-3 mb-8 text-sm">
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> 5 Projects</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Basic Support</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> 1GB Storage</li>
            </ul>
            <button class="w-full py-3 rounded-lg border border-white/20 text-white hover:bg-white/10">Get Started</button>
          </div>
          <div class="p-8 rounded-2xl bg-gradient-to-b from-purple-600/20 to-pink-600/20 border border-purple-500/30 relative">
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-xs font-medium">Popular</div>
            <h3 class="text-lg font-medium mb-2">Pro</h3>
            <div class="text-4xl font-bold mb-1">$29<span class="text-lg text-gray-400">/mo</span></div>
            <p class="text-gray-400 text-sm mb-6">For growing businesses</p>
            <ul class="space-y-3 mb-8 text-sm">
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Unlimited Projects</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Priority Support</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> 50GB Storage</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Advanced Analytics</li>
            </ul>
            <button class="w-full py-3 rounded-lg bg-white text-black font-medium hover:bg-gray-100">Get Started</button>
          </div>
          <div class="p-8 rounded-2xl bg-white/5 border border-white/10">
            <h3 class="text-lg font-medium mb-2">Enterprise</h3>
            <div class="text-4xl font-bold mb-1">$99<span class="text-lg text-gray-400">/mo</span></div>
            <p class="text-gray-400 text-sm mb-6">For large teams</p>
            <ul class="space-y-3 mb-8 text-sm">
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Everything in Pro</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Dedicated Support</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Unlimited Storage</li>
              <li class="flex items-center gap-2"><span class="text-green-400">✓</span> Custom Integrations</li>
            </ul>
            <button class="w-full py-3 rounded-lg border border-white/20 text-white hover:bg-white/10">Contact Sales</button>
          </div>
        </div>
      </div>
    </section>`,
    code: `export default function ModernPricing() {
  const plans = [
    {
      name: 'Starter',
      price: '$9',
      description: 'Perfect for side projects',
      features: ['5 Projects', 'Basic Support', '1GB Storage'],
    },
    {
      name: 'Pro',
      price: '$29',
      description: 'For growing businesses',
      features: ['Unlimited Projects', 'Priority Support', '50GB Storage', 'Advanced Analytics'],
      popular: true,
    },
    {
      name: 'Enterprise',
      price: '$99',
      description: 'For large teams',
      features: ['Everything in Pro', 'Dedicated Support', 'Unlimited Storage', 'Custom Integrations'],
    },
  ];

  return (
    <section className="py-24 px-6 bg-black">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 text-white">Simple Pricing</h2>
        <p className="text-gray-400 text-center mb-16">Choose the plan that works for you</p>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.name} className={\`p-8 rounded-2xl relative \${plan.popular ? 'bg-gradient-to-b from-purple-600/20 to-pink-600/20 border border-purple-500/30' : 'bg-white/5 border border-white/10'}\`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-xs font-medium text-white">Popular</div>
              )}
              <h3 className="text-lg font-medium mb-2 text-white">{plan.name}</h3>
              <div className="text-4xl font-bold mb-1 text-white">{plan.price}<span className="text-lg text-gray-400">/mo</span></div>
              <p className="text-gray-400 text-sm mb-6">{plan.description}</p>
              <ul className="space-y-3 mb-8 text-sm text-white">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2"><span className="text-green-400">✓</span> {feature}</li>
                ))}
              </ul>
              <button className={\`w-full py-3 rounded-lg font-medium transition-colors \${plan.popular ? 'bg-white text-black hover:bg-gray-100' : 'border border-white/20 text-white hover:bg-white/10'}\`}>
                {plan.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
  },

  // TESTIMONIALS TEMPLATES
  {
    id: 'testimonials-cards',
    name: 'Testimonial Cards',
    category: 'testimonials',
    description: 'Elegant testimonial cards with ratings',
    tags: ['cards', 'ratings', 'elegant'],
    preview: `<section class="py-24 px-6 bg-black">
      <div class="max-w-6xl mx-auto">
        <h2 class="text-4xl font-bold text-center mb-4">Loved by Developers</h2>
        <p class="text-gray-400 text-center mb-16">See what our community is saying</p>
        <div class="grid md:grid-cols-3 gap-6">
          <div class="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div class="flex gap-1 mb-4">★★★★★</div>
            <p class="text-gray-300 mb-6">"This is hands down the best developer tool I've used. It's saved me countless hours of work."</p>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
              <div>
                <div class="font-medium text-sm">Sarah Chen</div>
                <div class="text-gray-400 text-xs">Senior Developer @ Google</div>
              </div>
            </div>
          </div>
          <div class="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div class="flex gap-1 mb-4">★★★★★</div>
            <p class="text-gray-300 mb-6">"The component library is incredibly well-designed. Every detail has been carefully thought through."</p>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500"></div>
              <div>
                <div class="font-medium text-sm">Alex Rivera</div>
                <div class="text-gray-400 text-xs">Tech Lead @ Stripe</div>
              </div>
            </div>
          </div>
          <div class="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div class="flex gap-1 mb-4">★★★★★</div>
            <p class="text-gray-300 mb-6">"I can't imagine building without it now. The productivity boost is unreal."</p>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500"></div>
              <div>
                <div class="font-medium text-sm">Mike Johnson</div>
                <div class="text-gray-400 text-xs">Founder @ Startup</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>`,
    code: `export default function TestimonialCards() {
  const testimonials = [
    {
      rating: 5,
      quote: "This is hands down the best developer tool I've used. It's saved me countless hours of work.",
      author: 'Sarah Chen',
      role: 'Senior Developer @ Google',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      rating: 5,
      quote: "The component library is incredibly well-designed. Every detail has been carefully thought through.",
      author: 'Alex Rivera',
      role: 'Tech Lead @ Stripe',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      rating: 5,
      quote: "I can't imagine building without it now. The productivity boost is unreal.",
      author: 'Mike Johnson',
      role: 'Founder @ Startup',
      gradient: 'from-orange-500 to-red-500',
    },
  ];

  return (
    <section className="py-24 px-6 bg-black">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 text-white">Loved by Developers</h2>
        <p className="text-gray-400 text-center mb-16">See what our community is saying</p>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex gap-1 mb-4 text-yellow-400">{'★'.repeat(t.rating)}</div>
              <p className="text-gray-300 mb-6">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className={\`w-10 h-10 rounded-full bg-gradient-to-br \${t.gradient}\`} />
                <div>
                  <div className="font-medium text-sm text-white">{t.author}</div>
                  <div className="text-gray-400 text-xs">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
  },

  // CTA TEMPLATES
  {
    id: 'cta-gradient',
    name: 'Gradient CTA',
    category: 'cta',
    description: 'Eye-catching call-to-action with gradient',
    tags: ['gradient', 'bold', 'conversion'],
    preview: `<section class="py-24 px-6">
      <div class="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 p-12 text-center relative overflow-hidden">
        <div class="absolute inset-0 bg-black/20"></div>
        <div class="relative z-10">
          <h2 class="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p class="text-white/80 mb-8 max-w-xl mx-auto">Join thousands of developers who are already building amazing things.</p>
          <div class="flex items-center justify-center gap-4">
            <button class="px-8 py-4 rounded-xl bg-white text-black font-semibold hover:bg-gray-100">Start Free Trial</button>
            <button class="px-8 py-4 rounded-xl border-2 border-white/30 text-white font-medium hover:bg-white/10">Book a Demo</button>
          </div>
        </div>
      </div>
    </section>`,
    code: `export default function GradientCTA() {
  return (
    <section className="py-24 px-6 bg-black">
      <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 p-12 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10">
          <h2 className="text-4xl font-bold mb-4 text-white">Ready to Get Started?</h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">Join thousands of developers who are already building amazing things.</p>
          <div className="flex items-center justify-center gap-4">
            <button className="px-8 py-4 rounded-xl bg-white text-black font-semibold hover:bg-gray-100 transition-colors">Start Free Trial</button>
            <button className="px-8 py-4 rounded-xl border-2 border-white/30 text-white font-medium hover:bg-white/10 transition-colors">Book a Demo</button>
          </div>
        </div>
      </div>
    </section>
  );
}`,
  },

  // FOOTER TEMPLATES
  {
    id: 'footer-modern',
    name: 'Modern Footer',
    category: 'footer',
    description: 'Comprehensive footer with multiple columns',
    tags: ['modern', 'comprehensive', 'links'],
    preview: `<footer class="py-16 px-6 bg-black border-t border-white/10">
      <div class="max-w-6xl mx-auto">
        <div class="grid md:grid-cols-5 gap-8 mb-12">
          <div class="md:col-span-2">
            <div class="flex items-center gap-2 mb-4">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500"></div>
              <span class="font-bold text-lg">Brand</span>
            </div>
            <p class="text-gray-400 text-sm mb-4">Building the future of web development, one component at a time.</p>
            <div class="flex gap-4">
              <a class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">𝕏</a>
              <a class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">GH</a>
              <a class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">LI</a>
            </div>
          </div>
          <div>
            <h4 class="font-medium mb-4">Product</h4>
            <ul class="space-y-2 text-sm text-gray-400">
              <li><a class="hover:text-white">Features</a></li>
              <li><a class="hover:text-white">Pricing</a></li>
              <li><a class="hover:text-white">Changelog</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-medium mb-4">Company</h4>
            <ul class="space-y-2 text-sm text-gray-400">
              <li><a class="hover:text-white">About</a></li>
              <li><a class="hover:text-white">Blog</a></li>
              <li><a class="hover:text-white">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 class="font-medium mb-4">Legal</h4>
            <ul class="space-y-2 text-sm text-gray-400">
              <li><a class="hover:text-white">Privacy</a></li>
              <li><a class="hover:text-white">Terms</a></li>
              <li><a class="hover:text-white">Security</a></li>
            </ul>
          </div>
        </div>
        <div class="pt-8 border-t border-white/10 flex items-center justify-between text-sm text-gray-400">
          <span>© 2025 Brand. All rights reserved.</span>
          <span>Made with ❤️ for developers</span>
        </div>
      </div>
    </footer>`,
    code: `export default function ModernFooter() {
  const columns = [
    { title: 'Product', links: ['Features', 'Pricing', 'Changelog'] },
    { title: 'Company', links: ['About', 'Blog', 'Careers'] },
    { title: 'Legal', links: ['Privacy', 'Terms', 'Security'] },
  ];

  return (
    <footer className="py-16 px-6 bg-black border-t border-white/10">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-5 gap-8 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500" />
              <span className="font-bold text-lg text-white">Brand</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">Building the future of web development, one component at a time.</p>
            <div className="flex gap-4">
              {['𝕏', 'GH', 'LI'].map((icon) => (
                <a key={icon} href="#" className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">{icon}</a>
              ))}
            </div>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-medium mb-4 text-white">{col.title}</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {col.links.map((link) => (
                  <li key={link}><a href="#" className="hover:text-white transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t border-white/10 flex items-center justify-between text-sm text-gray-400">
          <span>© 2025 Brand. All rights reserved.</span>
          <span>Made with ❤️ for developers</span>
        </div>
      </div>
    </footer>
  );
}`,
  },
];

const categoryIcons = {
  navbar: Menu,
  footer: LayoutGrid,
  pricing: DollarSign,
  testimonials: MessageSquareQuote,
  hero: Layout,
  features: Sparkles,
  cta: Zap,
};

const categoryLabels = {
  navbar: 'Navigation',
  footer: 'Footers',
  pricing: 'Pricing',
  testimonials: 'Testimonials',
  hero: 'Hero Sections',
  features: 'Features',
  cta: 'Call to Action',
};

interface ComponentLibraryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertComponent: (component: { name: string; code: string; category: string; chatMessage: string }) => void;
  currentPage?: string;
}

export default function ComponentLibraryPanel({
  isOpen,
  onClose,
  onInsertComponent,
  currentPage = 'landing page',
}: ComponentLibraryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewComponent, setPreviewComponent] = useState<ComponentTemplate | null>(null);

  const categories = Object.keys(categoryIcons) as Array<keyof typeof categoryIcons>;

  const filteredTemplates = componentTemplates.filter((template) => {
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === null || template.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleCopyCode = (template: ComponentTemplate) => {
    navigator.clipboard.writeText(template.code);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsertMe = (template: ComponentTemplate) => {
    // Generate a randomized chat message for this component
    const chatMessage = getRandomInsertMessage(template.category, currentPage);
    
    onInsertComponent({
      name: template.name,
      code: template.code,
      category: template.category,
      chatMessage,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-[900px] max-w-[90vw] bg-background border-l border-border z-50 flex"
          >
            {/* Sidebar with categories */}
            <div className="w-48 flex-shrink-0 border-r border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-semibold text-sm">Library</h2>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedCategory === null
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Layout className="h-4 w-4" />
                  All Components
                </button>

                {categories.map((category) => {
                  const Icon = categoryIcons[category];
                  const count = componentTemplates.filter((t) => t.category === category).length;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                        selectedCategory === category
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1 text-left">{categoryLabels[category]}</span>
                      <span className="text-xs opacity-60">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col">
              {/* Search header */}
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search components..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Components grid */}
              <ScrollArea className="flex-1">
                <div className="p-4 grid grid-cols-2 gap-4">
                  {filteredTemplates.map((template) => (
                    <motion.div
                      key={template.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors"
                    >
                      {/* Preview */}
                      <div
                        className="h-40 overflow-hidden bg-black cursor-pointer"
                        onClick={() => setPreviewComponent(template)}
                      >
                        <div
                          className="w-full h-full transform scale-[0.4] origin-top-left"
                          style={{ width: '250%', height: '250%' }}
                        >
                          <iframe
                            srcDoc={`
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <script src="https://cdn.tailwindcss.com"></script>
                                  <style>body { background: #000; color: white; margin: 0; font-family: system-ui; }</style>
                                </head>
                                <body>${template.preview}</body>
                              </html>
                            `}
                            className="w-full h-full border-0 pointer-events-none"
                            title={template.name}
                          />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm">{template.name}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {categoryLabels[template.category]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
                          {template.description}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-xs gap-1.5"
                            onClick={() => handleCopyCode(template)}
                          >
                            {copiedId === template.id ? (
                              <>
                                <Check className="h-3 w-3" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                Copy Code
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 h-8 text-xs gap-1.5 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                            onClick={() => handleInsertMe(template)}
                          >
                            <Sparkles className="h-3 w-3" />
                            Insert Me!
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {filteredTemplates.length === 0 && (
                    <div className="col-span-2 py-12 text-center text-muted-foreground">
                      <Layout className="h-12 w-12 mx-auto mb-4 opacity-40" />
                      <p className="font-medium">No components found</p>
                      <p className="text-sm">Try a different search term</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Attribution */}
              <div className="p-3 border-t border-border text-center">
                <span className="text-xs text-muted-foreground">
                  Inspired by{' '}
                  <a
                    href="https://reactbits.dev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    ReactBits.dev
                  </a>
                </span>
              </div>
            </div>

            {/* Preview Modal */}
            <AnimatePresence>
              {previewComponent && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-8"
                  onClick={() => setPreviewComponent(null)}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="w-full max-w-4xl rounded-xl overflow-hidden border border-border"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="h-10 flex items-center justify-between px-4 bg-muted border-b border-border">
                      <span className="font-medium text-sm">{previewComponent.name}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewComponent(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="h-[500px] bg-black">
                      <iframe
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <script src="https://cdn.tailwindcss.com"></script>
                              <style>body { background: #000; color: white; margin: 0; font-family: system-ui; }</style>
                            </head>
                            <body>${previewComponent.preview}</body>
                          </html>
                        `}
                        className="w-full h-full border-0"
                        title={previewComponent.name}
                      />
                    </div>
                    <div className="p-4 bg-muted flex items-center justify-end gap-3">
                      <Button variant="outline" onClick={() => handleCopyCode(previewComponent)}>
                        {copiedId === previewComponent.id ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Code
                          </>
                        )}
                      </Button>
                      <Button onClick={() => handleInsertMe(previewComponent)} className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Insert Me!
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
