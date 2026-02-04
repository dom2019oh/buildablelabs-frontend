import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout, Menu, DollarSign, MessageSquareQuote, Sparkles, LayoutGrid, Zap } from 'lucide-react';

interface PreviewShowcaseProps {
  isVisible: boolean;
}

// Component library showcase cards
const SHOWCASE_TEMPLATES = [
  {
    id: 'hero',
    title: 'Hero Sections',
    description: 'Bold gradient backgrounds with animated elements',
    icon: Sparkles,
    gradient: 'from-purple-600 to-pink-600',
    preview: (
      <div className="w-full h-full bg-gradient-to-br from-purple-900 via-zinc-900 to-pink-900 p-4 flex flex-col items-center justify-center text-center">
        <span className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-white/10 text-purple-300 text-[10px] mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Now in Beta
        </span>
        <h3 className="text-sm font-bold text-white mb-1">Build Something</h3>
        <h3 className="text-sm font-bold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent">Extraordinary</h3>
        <div className="flex gap-2 mt-3">
          <button className="px-2 py-1 text-[8px] rounded bg-white text-black">Start</button>
          <button className="px-2 py-1 text-[8px] rounded border border-white/20 text-white">Demo</button>
        </div>
      </div>
    ),
  },
  {
    id: 'navbar',
    title: 'Navigation',
    description: 'Glassmorphism navbars with blur effects',
    icon: Menu,
    gradient: 'from-blue-600 to-cyan-600',
    preview: (
      <div className="w-full h-full bg-zinc-900 p-4">
        <div className="w-full backdrop-blur-xl bg-white/10 border border-white/10 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-purple-500 to-pink-500" />
            <span className="text-xs font-bold text-white">Brand</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-400">Products</span>
            <span className="text-[10px] text-gray-400">Features</span>
            <button className="px-2 py-1 text-[8px] rounded bg-white text-black">Get Started</button>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'features',
    title: 'Feature Grids',
    description: 'Modern bento-style layouts for features',
    icon: LayoutGrid,
    gradient: 'from-emerald-600 to-teal-600',
    preview: (
      <div className="w-full h-full bg-zinc-900 p-4">
        <div className="grid grid-cols-3 gap-2 h-full">
          <div className="col-span-2 p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10">
            <div className="w-5 h-5 rounded-md bg-purple-500/30 flex items-center justify-center mb-1">
              <Zap className="h-3 w-3 text-purple-300" />
            </div>
            <h4 className="text-[10px] font-bold text-white">Lightning Fast</h4>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <div className="w-5 h-5 rounded-md bg-blue-500/30 mb-1" />
            <h4 className="text-[10px] font-bold text-white">Secure</h4>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <div className="w-5 h-5 rounded-md bg-green-500/30 mb-1" />
            <h4 className="text-[10px] font-bold text-white">Fast</h4>
          </div>
          <div className="col-span-2 p-2 rounded-lg bg-white/5 border border-white/10">
            <div className="w-5 h-5 rounded-md bg-orange-500/30 mb-1" />
            <h4 className="text-[10px] font-bold text-white">Beautiful Design</h4>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'pricing',
    title: 'Pricing Tables',
    description: 'Clean pricing cards with conversion focus',
    icon: DollarSign,
    gradient: 'from-amber-600 to-orange-600',
    preview: (
      <div className="w-full h-full bg-zinc-900 p-4 flex items-center justify-center gap-2">
        <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex-1">
          <h4 className="text-[10px] font-medium text-white">Starter</h4>
          <div className="text-sm font-bold text-white">$9</div>
        </div>
        <div className="p-2 rounded-lg bg-gradient-to-b from-purple-600/20 to-pink-600/20 border border-purple-500/30 flex-1 relative">
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-[6px] font-medium text-white">Popular</div>
          <h4 className="text-[10px] font-medium text-white mt-1">Pro</h4>
          <div className="text-sm font-bold text-white">$29</div>
        </div>
        <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex-1">
          <h4 className="text-[10px] font-medium text-white">Team</h4>
          <div className="text-sm font-bold text-white">$99</div>
        </div>
      </div>
    ),
  },
  {
    id: 'testimonials',
    title: 'Testimonials',
    description: 'Social proof sections that build trust',
    icon: MessageSquareQuote,
    gradient: 'from-rose-600 to-red-600',
    preview: (
      <div className="w-full h-full bg-zinc-900 p-4 flex items-center justify-center">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 max-w-[180px]">
          <div className="flex gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-yellow-400 text-[10px]">★</span>
            ))}
          </div>
          <p className="text-[10px] text-gray-300 mb-2 italic">"This platform changed everything for our team."</p>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-400" />
            <div>
              <div className="text-[9px] font-medium text-white">Sarah Chen</div>
              <div className="text-[8px] text-gray-500">CEO, TechCorp</div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'cta',
    title: 'Call to Action',
    description: 'Compelling CTAs that drive conversions',
    icon: Layout,
    gradient: 'from-violet-600 to-indigo-600',
    preview: (
      <div className="w-full h-full bg-gradient-to-br from-purple-900 to-black p-4 flex flex-col items-center justify-center text-center">
        <h3 className="text-sm font-bold text-white mb-1">Ready to get started?</h3>
        <p className="text-[10px] text-gray-400 mb-3">Join thousands of builders today.</p>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-[10px] rounded-lg bg-white text-black font-medium">Start Free</button>
          <button className="px-3 py-1.5 text-[10px] rounded-lg border border-white/20 text-white">Contact</button>
        </div>
      </div>
    ),
  },
];

export default function PreviewShowcase({ isVisible }: PreviewShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-rotate cards every 4 seconds
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SHOWCASE_TEMPLATES.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="h-full flex flex-col items-center justify-center bg-zinc-900 p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-2xl font-bold text-white mb-2">What would you like to build?</h2>
        <p className="text-muted-foreground">
          Describe your idea or explore our component library
        </p>
      </motion.div>

      {/* Showcase Cards - Carousel */}
      <div className="relative w-full max-w-4xl h-64">
        <AnimatePresence mode="popLayout">
          {SHOWCASE_TEMPLATES.map((template, index) => {
            const isActive = index === activeIndex;
            const offset = index - activeIndex;
            
            // Only render visible cards (active, +1, -1)
            if (Math.abs(offset) > 1 && !isActive) return null;
            
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, scale: 0.8, x: offset > 0 ? 200 : -200 }}
                animate={{
                  opacity: isActive ? 1 : 0.4,
                  scale: isActive ? 1 : 0.85,
                  x: offset * 260,
                  zIndex: isActive ? 10 : 0,
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="absolute left-1/2 top-0 -translate-x-1/2 w-60 cursor-pointer"
                onClick={() => setActiveIndex(index)}
              >
                <div 
                  className={`
                    bg-zinc-800 rounded-2xl overflow-hidden
                    border-2 transition-colors duration-300
                    ${isActive ? 'border-primary shadow-2xl shadow-primary/20' : 'border-zinc-700'}
                  `}
                >
                  {/* Template Preview */}
                  <div className="h-36 relative overflow-hidden">
                    {template.preview}
                  </div>
                  
                  {/* Template Info */}
                  <div className="p-4 bg-zinc-800">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1.5 rounded-md bg-gradient-to-br ${template.gradient}`}>
                        <template.icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <h3 className="font-semibold text-sm text-white">{template.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{template.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Dots Indicator */}
      <div className="flex gap-2 mt-8">
        {SHOWCASE_TEMPLATES.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`
              h-2 rounded-full transition-all duration-300
              ${index === activeIndex ? 'w-8 bg-primary' : 'w-2 bg-zinc-600 hover:bg-zinc-500'}
            `}
          />
        ))}
      </div>

      {/* Feature Pills */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap gap-2 mt-8 justify-center"
      >
        {['React', 'TypeScript', 'Tailwind', 'Framer Motion', 'Component Library'].map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 rounded-full bg-zinc-800 text-xs text-muted-foreground border border-zinc-700"
          >
            {tag}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
