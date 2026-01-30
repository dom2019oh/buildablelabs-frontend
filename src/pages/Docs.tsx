import { motion } from 'framer-motion';
import { Book, Code, Zap, Layers, Palette, Server, ChevronRight } from 'lucide-react';
import Navbar from '@/components/Navbar';

const docSections = [
  {
    icon: Zap,
    title: 'Getting Started',
    description: 'Learn the basics of Buildable and create your first project.',
    articles: ['Quick Start Guide', 'Your First Project', 'Understanding Credits'],
  },
  {
    icon: Code,
    title: 'Prompting Guide',
    description: 'Master the art of writing effective prompts.',
    articles: ['Writing Good Prompts', 'Iterating on Designs', 'Advanced Techniques'],
  },
  {
    icon: Layers,
    title: 'Features',
    description: 'Explore all the features Buildable offers.',
    articles: ['AI Generation', 'Code Export', 'Custom Domains', 'Collaboration'],
  },
  {
    icon: Palette,
    title: 'Customization',
    description: 'Customize your projects to match your brand.',
    articles: ['Styling & Themes', 'Custom Components', 'Design Systems'],
  },
  {
    icon: Server,
    title: 'Backend & Data',
    description: 'Add authentication, databases, and APIs.',
    articles: ['Database Setup', 'Authentication', 'API Integration', 'Payments'],
  },
];

export default function Docs() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-6">
              <Book className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Documentation</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Learn <span className="text-gradient">Buildable</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to build amazing products with AI.
            </p>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-12"
          >
            <div className="glass-card p-2 input-glow">
              <input
                type="text"
                placeholder="Search documentation..."
                className="w-full px-4 py-3 bg-transparent focus:outline-none"
              />
            </div>
          </motion.div>

          {/* Doc Sections */}
          <div className="space-y-6">
            {docSections.map((section, index) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
                className="glass-card p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <section.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{section.title}</h3>
                    <p className="text-muted-foreground mb-4">{section.description}</p>
                    <div className="space-y-2">
                      {section.articles.map((article) => (
                        <button
                          key={article}
                          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group w-full text-left"
                        >
                          <ChevronRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span>{article}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
