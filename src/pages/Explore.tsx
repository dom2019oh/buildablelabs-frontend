import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Heart, Eye, ExternalLink } from 'lucide-react';
import Navbar from '@/components/Navbar';

const showcaseProjects = [
  {
    id: '1',
    name: 'SaaS Dashboard',
    author: 'Jane Doe',
    likes: 234,
    views: 1200,
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
  },
  {
    id: '2',
    name: 'E-commerce Store',
    author: 'John Smith',
    likes: 189,
    views: 890,
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
  },
  {
    id: '3',
    name: 'Portfolio Site',
    author: 'Alex Johnson',
    likes: 156,
    views: 756,
    image: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&h=300&fit=crop',
  },
  {
    id: '4',
    name: 'Blog Platform',
    author: 'Sarah Williams',
    likes: 142,
    views: 678,
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=400&h=300&fit=crop',
  },
  {
    id: '5',
    name: 'Fitness App',
    author: 'Mike Brown',
    likes: 128,
    views: 543,
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=300&fit=crop',
  },
  {
    id: '6',
    name: 'Recipe Website',
    author: 'Emily Davis',
    likes: 115,
    views: 432,
    image: 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=400&h=300&fit=crop',
  },
];

export default function Explore() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Explore <span className="text-gradient">Community</span> Projects
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get inspired by what others are building with Buildify.
            </p>
          </motion.div>

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col md:flex-row gap-4 mb-12"
          >
            <div className="flex-1 glass-card p-2 input-glow">
              <div className="flex items-center gap-3 px-3">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  className="flex-1 py-2 bg-transparent focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {['All', 'SaaS', 'E-commerce', 'Portfolio', 'Landing'].map((filter) => (
                <button
                  key={filter}
                  className="glass-button px-4 py-2 text-sm"
                >
                  {filter}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Projects Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {showcaseProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
                className="glass-card overflow-hidden group"
              >
                {/* Preview Image */}
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={project.image}
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                    <Link
                      to={`/project-${project.id}`}
                      className="glass-button flex items-center gap-2 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Project
                    </Link>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold mb-1">{project.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">by {project.author}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {project.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {project.views}
                    </span>
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
