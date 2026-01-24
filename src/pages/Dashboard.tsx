import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Folder, Clock, MoreHorizontal, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';

const mockProjects = [
  {
    id: 'proj-1234-5678-9abc-def0',
    name: 'E-commerce Store',
    description: 'Full-stack online shop with payments',
    updatedAt: '2 hours ago',
  },
  {
    id: 'proj-2345-6789-abcd-ef01',
    name: 'Portfolio Website',
    description: 'Personal portfolio with animations',
    updatedAt: '1 day ago',
  },
  {
    id: 'proj-3456-789a-bcde-f012',
    name: 'SaaS Dashboard',
    description: 'Analytics dashboard with charts',
    updatedAt: '3 days ago',
  },
];

export default function Dashboard() {
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
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold mb-2">Your Projects</h1>
              <p className="text-muted-foreground">Create and manage your Buildify projects</p>
            </div>
            <Link
              to="/project-new"
              className="gradient-button flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Project
            </Link>
          </motion.div>

          {/* Credits Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-card p-6 mb-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Credits Remaining</h3>
                  <p className="text-muted-foreground text-sm">Your monthly usage</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-gradient">87 / 100</div>
                <p className="text-muted-foreground text-sm">credits this month</p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                style={{ width: '87%' }}
              />
            </div>
          </motion.div>

          {/* Projects Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create New Project Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Link
                to="/project-new"
                className="glass-card h-full min-h-[200px] flex flex-col items-center justify-center gap-4 hover:border-primary/30 transition-colors cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <span className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  Create New Project
                </span>
              </Link>
            </motion.div>

            {/* Project Cards */}
            {mockProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + (index + 1) * 0.1 }}
              >
                <Link
                  to={`/project/${project.id}`}
                  className="glass-card p-6 block hover:border-primary/30 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Folder className="w-5 h-5 text-primary" />
                    </div>
                    <button 
                      className="text-muted-foreground hover:text-foreground p-1"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {project.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{project.updatedAt}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
