/**
 * COMPONENT LIBRARY
 * Re-usable UI components for AI generation.
 */

export interface ComponentTemplate {
  id: string;
  name: string;
  description: string;
  category: 'navbar' | 'hero' | 'features' | 'pricing' | 'testimonials' | 'cta' | 'footer';
  code: string;
}

export const COMPONENT_LIBRARY: ComponentTemplate[] = [
  // ─────────────────────────────────────────────────────────────────
  // NAVBAR
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'glass-navbar',
    name: 'Glass Navbar',
    description: 'Fixed glassmorphism navbar with logo, nav links, and CTA button.',
    category: 'navbar',
    code: `<nav className="fixed top-0 left-0 w-full bg-white/5 backdrop-blur-xl border-b border-white/10 z-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
    <span className="font-bold text-lg text-white">Brand</span>
    <div className="hidden md:flex items-center gap-8">
      <a href="#features" className="text-zinc-400 hover:text-white transition">Features</a>
      <a href="#pricing" className="text-zinc-400 hover:text-white transition">Pricing</a>
      <a href="#contact" className="text-zinc-400 hover:text-white transition">Contact</a>
    </div>
    <a href="/sign-up" className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium text-sm hover:opacity-90">
      Get Started
    </a>
  </div>
</nav>`,
  },
  // ─────────────────────────────────────────────────────────────────
  // HERO
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'gradient-hero',
    name: 'Gradient Hero',
    description: 'Full-width hero with gradient background, headline, and CTA.',
    category: 'hero',
    code: `<section className="relative py-32 px-4 text-center bg-gradient-to-br from-purple-900/40 via-zinc-900 to-pink-900/30">
  <h1 className="text-5xl md:text-6xl font-bold max-w-3xl mx-auto leading-tight text-white">
    Build Something <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Amazing</span>
  </h1>
  <p className="text-zinc-400 text-lg md:text-xl mt-6 max-w-xl mx-auto">
    The all-in-one platform to ship your next project in record time.
  </p>
  <div className="mt-8 flex justify-center gap-4">
    <a href="/sign-up" className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold text-white hover:opacity-90">
      Get Started
    </a>
    <a href="/learn-more" className="px-6 py-3 rounded-xl border border-zinc-600 font-semibold text-white hover:bg-zinc-800">
      Learn More
    </a>
  </div>
</section>`,
  },
  // ─────────────────────────────────────────────────────────────────
  // FEATURES (Bento Grid)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'bento-features',
    name: 'Bento Grid Features',
    description: 'Modern bento-style grid of features with icons and descriptions.',
    category: 'features',
    code: `<section className="py-24 px-4 max-w-6xl mx-auto">
  <h2 className="text-3xl font-bold text-center text-white mb-12">Features</h2>
  <div className="grid md:grid-cols-3 gap-6">
    <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-6">
      <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 mb-4">⚡</div>
      <h3 className="text-lg font-semibold text-white mb-2">Lightning Fast</h3>
      <p className="text-zinc-400 text-sm">Built for speed from the ground up.</p>
    </div>
    <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-6">
      <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center text-pink-400 mb-4">🔒</div>
      <h3 className="text-lg font-semibold text-white mb-2">Secure</h3>
      <p className="text-zinc-400 text-sm">Enterprise-grade security.</p>
    </div>
    <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-6">
      <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">✨</div>
      <h3 className="text-lg font-semibold text-white mb-2">AI Powered</h3>
      <p className="text-zinc-400 text-sm">Smart features that learn from you.</p>
    </div>
  </div>
</section>`,
  },
  // ─────────────────────────────────────────────────────────────────
  // PRICING
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'pricing-cards',
    name: 'Pricing Cards',
    description: 'Three-tier pricing cards with popular badge.',
    category: 'pricing',
    code: `<section id="pricing" className="py-24 px-4 max-w-5xl mx-auto">
  <h2 className="text-3xl font-bold text-center text-white mb-12">Pricing</h2>
  <div className="grid md:grid-cols-3 gap-6">
    <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-6 flex flex-col">
      <h3 className="text-lg font-semibold text-white">Free</h3>
      <p className="text-3xl font-bold text-white mt-2">$0</p>
      <ul className="mt-6 space-y-3 text-zinc-400 text-sm flex-1">
        <li>✓ 1 project</li>
        <li>✓ Community support</li>
      </ul>
      <button className="mt-6 w-full py-3 rounded-lg border border-zinc-600 text-white font-medium hover:bg-zinc-700">Get Started</button>
    </div>
    <div className="bg-gradient-to-b from-purple-900/30 to-zinc-800/60 border border-purple-500/50 rounded-2xl p-6 flex flex-col relative">
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-semibold">Popular</span>
      <h3 className="text-lg font-semibold text-white">Pro</h3>
      <p className="text-3xl font-bold text-white mt-2">$19<span className="text-sm text-zinc-400">/mo</span></p>
      <ul className="mt-6 space-y-3 text-zinc-400 text-sm flex-1">
        <li>✓ Unlimited projects</li>
        <li>✓ Priority support</li>
        <li>✓ Advanced analytics</li>
      </ul>
      <button className="mt-6 w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90">Upgrade</button>
    </div>
    <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl p-6 flex flex-col">
      <h3 className="text-lg font-semibold text-white">Enterprise</h3>
      <p className="text-3xl font-bold text-white mt-2">Custom</p>
      <ul className="mt-6 space-y-3 text-zinc-400 text-sm flex-1">
        <li>✓ Dedicated support</li>
        <li>✓ Custom integrations</li>
        <li>✓ SLA</li>
      </ul>
      <button className="mt-6 w-full py-3 rounded-lg border border-zinc-600 text-white font-medium hover:bg-zinc-700">Contact Sales</button>
    </div>
  </div>
</section>`,
  },
  // ─────────────────────────────────────────────────────────────────
  // CTA
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'gradient-cta',
    name: 'Gradient CTA',
    description: 'Call-to-action section with gradient background.',
    category: 'cta',
    code: `<section className="py-24 px-4 bg-gradient-to-r from-purple-600/20 via-pink-600/10 to-purple-600/20">
  <div className="max-w-3xl mx-auto text-center">
    <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
    <p className="text-zinc-400 mb-8">Join thousands of creators building with us.</p>
    <a href="/sign-up" className="inline-block px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90">
      Start Free Trial
    </a>
  </div>
</section>`,
  },
  // ─────────────────────────────────────────────────────────────────
  // FOOTER
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'simple-footer',
    name: 'Simple Footer',
    description: 'Minimal footer with logo, links, and copyright.',
    category: 'footer',
    code: `<footer className="py-12 px-4 bg-zinc-900 border-t border-zinc-800">
  <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
    <span className="font-bold text-lg text-white">Brand</span>
    <div className="flex gap-6 text-sm text-zinc-400">
      <a href="/privacy" className="hover:text-white">Privacy</a>
      <a href="/terms" className="hover:text-white">Terms</a>
      <a href="/contact" className="hover:text-white">Contact</a>
    </div>
    <span className="text-zinc-500 text-sm">© 2026 Brand. All rights reserved.</span>
  </div>
</footer>`,
  },
];

export function getComponentsByCategory(category: ComponentTemplate['category']) {
  return COMPONENT_LIBRARY.filter((c) => c.category === category);
}

export function getComponentById(id: string) {
  return COMPONENT_LIBRARY.find((c) => c.id === id);
}
