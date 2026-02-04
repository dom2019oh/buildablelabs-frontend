import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Layout, Sparkles, ArrowRight, Globe } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

// Template categories and data
const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'All Templates' },
  { id: 'landing', label: 'Landing Pages' },
  { id: 'saas', label: 'SaaS' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'blog', label: 'Blog' },
];

const TEMPLATES = [
  {
    id: 'startup-landing',
    name: 'Startup Landing',
    category: 'landing',
    description: 'Modern SaaS startup landing page with hero, features, pricing, and CTA sections.',
    tags: ['React', 'Tailwind', 'Framer Motion'],
    preview: 'bg-gradient-to-br from-purple-900 via-zinc-900 to-pink-900',
    popular: true,
  },
  {
    id: 'saas-dashboard',
    name: 'SaaS Dashboard',
    category: 'saas',
    description: 'Complete dashboard template with analytics, charts, and data tables.',
    tags: ['React', 'Tailwind', 'Recharts'],
    preview: 'bg-gradient-to-br from-blue-900 via-zinc-900 to-cyan-900',
    popular: true,
  },
  {
    id: 'portfolio-minimal',
    name: 'Minimal Portfolio',
    category: 'portfolio',
    description: 'Clean, minimal portfolio for designers and developers.',
    tags: ['React', 'Tailwind', 'Animation'],
    preview: 'bg-gradient-to-br from-zinc-800 to-zinc-900',
    popular: false,
  },
  {
    id: 'ecommerce-store',
    name: 'E-commerce Store',
    category: 'ecommerce',
    description: 'Full-featured online store with product grid, cart, and checkout.',
    tags: ['React', 'Tailwind', 'Stripe'],
    preview: 'bg-gradient-to-br from-emerald-900 via-zinc-900 to-teal-900',
    popular: false,
  },
  {
    id: 'blog-magazine',
    name: 'Blog Magazine',
    category: 'blog',
    description: 'Editorial-style blog with featured posts and category filters.',
    tags: ['React', 'Tailwind', 'MDX'],
    preview: 'bg-gradient-to-br from-orange-900 via-zinc-900 to-red-900',
    popular: false,
  },
  {
    id: 'agency-landing',
    name: 'Agency Landing',
    category: 'landing',
    description: 'Creative agency landing page with portfolio showcase and contact form.',
    tags: ['React', 'Tailwind', 'GSAP'],
    preview: 'bg-gradient-to-br from-violet-900 via-zinc-900 to-indigo-900',
    popular: true,
  },
];

export default function TemplatesLibraryView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const navigate = useNavigate();
  const { user } = useAuth();

  const filteredTemplates = TEMPLATES.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || template.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = (templateId: string) => {
    if (user) {
      // Navigate to create project with template
      navigate(`/dashboard?template=${templateId}`);
    } else {
      navigate('/log-in');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Layout className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Templates</h1>
            <Badge variant="secondary" className="ml-2">
              <Globe className="h-3 w-3 mr-1" />
              Public
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Production-ready templates to kickstart your project
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-zinc-800/50 border-zinc-700"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 flex-wrap">
        {TEMPLATE_CATEGORIES.map((category) => (
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

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group bg-zinc-800/50 rounded-xl border border-zinc-700 overflow-hidden hover:border-primary/50 transition-colors"
          >
            {/* Preview */}
            <div className={`h-40 ${template.preview} relative`}>
              {template.popular && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Popular
                  </Badge>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleUseTemplate(template.id)}
                >
                  Use Template
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {template.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs rounded-md bg-zinc-700 text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Layout className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No templates found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
