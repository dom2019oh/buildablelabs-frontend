import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Box, Copy, Check, ChevronRight, Sparkles, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

// Component categories
const COMPONENT_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'navbar', label: 'Navbars' },
  { id: 'hero', label: 'Heroes' },
  { id: 'features', label: 'Features' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'testimonials', label: 'Testimonials' },
  { id: 'cta', label: 'CTAs' },
  { id: 'footer', label: 'Footers' },
];

// Components data with previews
const COMPONENTS = [
  {
    id: 'navbar-glass',
    name: 'Glass Navbar',
    category: 'navbar',
    description: 'Modern glassmorphism navigation with blur effects',
    preview: (
      <div className="w-full p-3">
        <div className="backdrop-blur-xl bg-white/10 border border-white/10 rounded-lg p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-md bg-gradient-to-br from-purple-500 to-pink-500" />
            <span className="text-[10px] font-bold text-white">Brand</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-gray-400">Links</span>
            <button className="px-2 py-0.5 text-[8px] rounded bg-white text-black">CTA</button>
          </div>
        </div>
      </div>
    ),
    code: `export default function GlassNavbar() { /* ... */ }`,
  },
  {
    id: 'hero-gradient',
    name: 'Gradient Hero',
    category: 'hero',
    description: 'Bold gradient background with animated elements',
    preview: (
      <div className="w-full h-full bg-gradient-to-br from-purple-900 via-zinc-900 to-pink-900 p-3 flex flex-col items-center justify-center text-center">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-purple-300 text-[8px] mb-2">
          <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
          Beta
        </span>
        <h3 className="text-[10px] font-bold text-white">Build Something</h3>
        <div className="flex gap-1 mt-2">
          <button className="px-2 py-0.5 text-[6px] rounded bg-white text-black">Start</button>
          <button className="px-2 py-0.5 text-[6px] rounded border border-white/20 text-white">Demo</button>
        </div>
      </div>
    ),
    code: `export default function GradientHero() { /* ... */ }`,
  },
  {
    id: 'features-bento',
    name: 'Bento Features',
    category: 'features',
    description: 'Modern bento-style grid layout for features',
    preview: (
      <div className="w-full h-full bg-zinc-900 p-2">
        <div className="grid grid-cols-3 gap-1 h-full">
          <div className="col-span-2 p-1.5 rounded-md bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10">
            <div className="w-3 h-3 rounded bg-purple-500/30 mb-1" />
            <span className="text-[8px] text-white">Feature 1</span>
          </div>
          <div className="p-1.5 rounded-md bg-white/5 border border-white/10">
            <div className="w-3 h-3 rounded bg-blue-500/30 mb-1" />
            <span className="text-[8px] text-white">Feature 2</span>
          </div>
        </div>
      </div>
    ),
    code: `export default function BentoFeatures() { /* ... */ }`,
  },
  {
    id: 'pricing-modern',
    name: 'Modern Pricing',
    category: 'pricing',
    description: 'Clean pricing cards with gradient accent',
    preview: (
      <div className="w-full h-full bg-zinc-900 p-2 flex items-center justify-center gap-1">
        <div className="p-1.5 rounded-md bg-white/5 border border-white/10 flex-1">
          <span className="text-[8px] text-white block">Starter</span>
          <span className="text-[10px] font-bold text-white">$9</span>
        </div>
        <div className="p-1.5 rounded-md bg-gradient-to-b from-purple-600/20 to-pink-600/20 border border-purple-500/30 flex-1 relative">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-[5px] text-white">Popular</div>
          <span className="text-[8px] text-white block mt-1">Pro</span>
          <span className="text-[10px] font-bold text-white">$29</span>
        </div>
      </div>
    ),
    code: `export default function ModernPricing() { /* ... */ }`,
  },
  {
    id: 'testimonials-cards',
    name: 'Testimonial Cards',
    category: 'testimonials',
    description: 'Elegant testimonial cards with ratings',
    preview: (
      <div className="w-full h-full bg-zinc-900 p-2 flex items-center justify-center">
        <div className="p-2 rounded-md bg-white/5 border border-white/10">
          <div className="flex gap-0.5 mb-1">
            {[1,2,3,4,5].map(i => <span key={i} className="text-yellow-400 text-[8px]">★</span>)}
          </div>
          <p className="text-[7px] text-gray-300 italic mb-1">"Amazing product!"</p>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
            <span className="text-[6px] text-white">User</span>
          </div>
        </div>
      </div>
    ),
    code: `export default function TestimonialCards() { /* ... */ }`,
  },
  {
    id: 'cta-gradient',
    name: 'Gradient CTA',
    category: 'cta',
    description: 'Eye-catching call-to-action with gradient',
    preview: (
      <div className="w-full h-full bg-zinc-900 p-2 flex items-center justify-center">
        <div className="rounded-lg bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 p-3 text-center">
          <h3 className="text-[9px] font-bold text-white mb-1">Ready to start?</h3>
          <button className="px-2 py-0.5 text-[7px] rounded bg-white text-black">Get Started</button>
        </div>
      </div>
    ),
    code: `export default function GradientCTA() { /* ... */ }`,
  },
  {
    id: 'footer-modern',
    name: 'Modern Footer',
    category: 'footer',
    description: 'Comprehensive footer with columns',
    preview: (
      <div className="w-full bg-zinc-900 border-t border-white/10 p-2">
        <div className="flex justify-between">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gradient-to-br from-purple-500 to-pink-500" />
            <span className="text-[8px] text-white font-bold">Brand</span>
          </div>
          <div className="flex gap-2 text-[7px] text-gray-400">
            <span>Product</span>
            <span>Company</span>
            <span>Legal</span>
          </div>
        </div>
      </div>
    ),
    code: `export default function ModernFooter() { /* ... */ }`,
  },
];

export default function ComponentsLibraryView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  const filteredComponents = COMPONENTS.filter((component) => {
    const matchesSearch = component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      component.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || component.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCopyCode = async (id: string, code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Box className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Components</h1>
            <Badge variant="outline" className="ml-2 border-purple-500/50 text-purple-400">
              <Lock className="h-3 w-3 mr-1" />
              Pro
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Copy-paste ready components for your projects
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search components..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-zinc-800/50 border-zinc-700"
        />
      </div>

      {/* Categories */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {COMPONENT_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeCategory === category.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-700'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredComponents.map((component, index) => (
          <motion.div
            key={component.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group bg-zinc-800/50 rounded-xl border border-zinc-700 overflow-hidden hover:border-primary/50 transition-all cursor-pointer"
            onClick={() => setSelectedComponent(selectedComponent === component.id ? null : component.id)}
          >
            {/* Preview */}
            <div className="h-28 bg-zinc-900 relative overflow-hidden">
              {component.preview}
            </div>

            {/* Info */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-sm text-foreground">{component.name}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyCode(component.id, component.code);
                  }}
                >
                  {copiedId === component.id ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {component.description}
              </p>
            </div>

            {/* Expanded Code View */}
            <AnimatePresence>
              {selectedComponent === component.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-zinc-700 bg-zinc-900/50"
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Component Code</span>
                      <Badge variant="secondary" className="text-[10px]">
                        <Sparkles className="h-2.5 w-2.5 mr-1" />
                        React + Tailwind
                      </Badge>
                    </div>
                    <pre className="text-xs text-muted-foreground bg-zinc-900 rounded p-2 overflow-x-auto">
                      <code>{component.code}</code>
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {filteredComponents.length === 0 && (
        <div className="text-center py-12">
          <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No components found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
