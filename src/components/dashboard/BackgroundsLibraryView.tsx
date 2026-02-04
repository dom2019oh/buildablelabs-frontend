import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Palette, Copy, Check, Lock, Sparkles, Play } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Background categories
const BACKGROUND_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'gradient', label: 'Gradients' },
  { id: 'animated', label: 'Animated' },
  { id: 'mesh', label: 'Mesh' },
  { id: 'pattern', label: 'Patterns' },
  { id: 'aurora', label: 'Aurora' },
];

// Backgrounds data
const BACKGROUNDS = [
  {
    id: 'gradient-purple-pink',
    name: 'Purple Pink Gradient',
    category: 'gradient',
    isAnimated: false,
    preview: 'bg-gradient-to-br from-purple-900 via-zinc-900 to-pink-900',
    code: `className="bg-gradient-to-br from-purple-900 via-zinc-900 to-pink-900"`,
  },
  {
    id: 'gradient-blue-cyan',
    name: 'Ocean Blue',
    category: 'gradient',
    isAnimated: false,
    preview: 'bg-gradient-to-br from-blue-900 via-zinc-900 to-cyan-900',
    code: `className="bg-gradient-to-br from-blue-900 via-zinc-900 to-cyan-900"`,
  },
  {
    id: 'gradient-emerald',
    name: 'Emerald Forest',
    category: 'gradient',
    isAnimated: false,
    preview: 'bg-gradient-to-br from-emerald-900 via-zinc-900 to-teal-900',
    code: `className="bg-gradient-to-br from-emerald-900 via-zinc-900 to-teal-900"`,
  },
  {
    id: 'gradient-sunset',
    name: 'Sunset Glow',
    category: 'gradient',
    isAnimated: false,
    preview: 'bg-gradient-to-br from-orange-900 via-red-900 to-pink-900',
    code: `className="bg-gradient-to-br from-orange-900 via-red-900 to-pink-900"`,
  },
  {
    id: 'animated-pulse',
    name: 'Pulsing Orbs',
    category: 'animated',
    isAnimated: true,
    preview: 'bg-zinc-900',
    customPreview: (
      <div className="absolute inset-0 overflow-hidden bg-zinc-900">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-pink-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
    ),
    code: `<div className="relative overflow-hidden bg-zinc-900">
  <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
  <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-pink-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
</div>`,
  },
  {
    id: 'mesh-gradient',
    name: 'Mesh Gradient',
    category: 'mesh',
    isAnimated: false,
    preview: '',
    customPreview: (
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(at 40% 20%, hsla(288,80%,42%,0.5) 0px, transparent 50%),
            radial-gradient(at 80% 0%, hsla(340,80%,42%,0.4) 0px, transparent 50%),
            radial-gradient(at 0% 50%, hsla(220,80%,50%,0.3) 0px, transparent 50%),
            radial-gradient(at 80% 100%, hsla(180,80%,40%,0.3) 0px, transparent 50%),
            radial-gradient(at 0% 100%, hsla(280,80%,50%,0.2) 0px, transparent 50%)
          `,
          backgroundColor: '#0a0a0a'
        }}
      />
    ),
    code: `style={{
  background: \`
    radial-gradient(at 40% 20%, hsla(288,80%,42%,0.5) 0px, transparent 50%),
    radial-gradient(at 80% 0%, hsla(340,80%,42%,0.4) 0px, transparent 50%),
    radial-gradient(at 0% 50%, hsla(220,80%,50%,0.3) 0px, transparent 50%),
    radial-gradient(at 80% 100%, hsla(180,80%,40%,0.3) 0px, transparent 50%),
    radial-gradient(at 0% 100%, hsla(280,80%,50%,0.2) 0px, transparent 50%)
  \`,
  backgroundColor: '#0a0a0a'
}}`,
  },
  {
    id: 'pattern-dots',
    name: 'Dot Pattern',
    category: 'pattern',
    isAnimated: false,
    preview: 'bg-zinc-900',
    customPreview: (
      <div 
        className="absolute inset-0 bg-zinc-900"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />
    ),
    code: `style={{
  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
  backgroundSize: '20px 20px'
}}`,
  },
  {
    id: 'pattern-grid',
    name: 'Grid Pattern',
    category: 'pattern',
    isAnimated: false,
    preview: 'bg-zinc-900',
    customPreview: (
      <div 
        className="absolute inset-0 bg-zinc-900"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px'
        }}
      />
    ),
    code: `style={{
  backgroundImage: \`
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
  \`,
  backgroundSize: '30px 30px'
}}`,
  },
  {
    id: 'aurora-green',
    name: 'Aurora Borealis',
    category: 'aurora',
    isAnimated: true,
    preview: 'bg-zinc-900',
    customPreview: (
      <div className="absolute inset-0 overflow-hidden bg-zinc-950">
        <div className="absolute top-0 left-1/4 w-1/2 h-32 bg-gradient-to-b from-emerald-500/40 via-cyan-500/30 to-transparent blur-2xl transform -skew-x-12 animate-pulse" />
        <div className="absolute top-4 left-1/3 w-1/3 h-24 bg-gradient-to-b from-green-400/30 via-teal-500/20 to-transparent blur-xl transform skew-x-12 animate-pulse" style={{ animationDelay: '0.5s' }} />
      </div>
    ),
    code: `<div className="relative overflow-hidden bg-zinc-950">
  <div className="absolute top-0 left-1/4 w-1/2 h-32 bg-gradient-to-b from-emerald-500/40 via-cyan-500/30 to-transparent blur-2xl transform -skew-x-12 animate-pulse" />
  <div className="absolute top-4 left-1/3 w-1/3 h-24 bg-gradient-to-b from-green-400/30 via-teal-500/20 to-transparent blur-xl transform skew-x-12 animate-pulse" />
</div>`,
  },
];

export default function BackgroundsLibraryView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredBackgrounds = BACKGROUNDS.filter((bg) => {
    const matchesSearch = bg.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || bg.category === activeCategory;
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
            <Palette className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Backgrounds</h1>
            <Badge variant="outline" className="ml-2 border-purple-500/50 text-purple-400">
              <Lock className="h-3 w-3 mr-1" />
              Pro
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Beautiful backgrounds for your projects
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search backgrounds..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-zinc-800/50 border-zinc-700"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 flex-wrap">
        {BACKGROUND_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === category.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-zinc-800 text-muted-foreground hover:text-foreground hover:bg-zinc-700'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Backgrounds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredBackgrounds.map((bg, index) => (
          <motion.div
            key={bg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group bg-zinc-800/50 rounded-xl border border-zinc-700 overflow-hidden hover:border-primary/50 transition-all"
          >
            {/* Preview */}
            <div className={`h-32 relative overflow-hidden ${bg.preview}`}>
              {bg.customPreview}
              {bg.isAnimated && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="text-[10px] bg-zinc-900/80">
                    <Play className="h-2.5 w-2.5 mr-1" />
                    Animated
                  </Badge>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3 flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sm text-foreground">{bg.name}</h3>
                <p className="text-xs text-muted-foreground capitalize">{bg.category}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleCopyCode(bg.id, bg.code)}
              >
                {copiedId === bg.id ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredBackgrounds.length === 0 && (
        <div className="text-center py-12">
          <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No backgrounds found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
