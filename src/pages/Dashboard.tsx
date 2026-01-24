import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Folder, 
  Clock, 
  MoreHorizontal, 
  Home, 
  FileText, 
  Settings, 
  HelpCircle,
  ArrowRight,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import buildifyLogo from '@/assets/buildify-logo.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mockProjects = [
  {
    id: 'proj-1234-5678-9abc-def0',
    name: 'E-commerce Store',
    description: 'Full-stack online shop with payments',
    updatedAt: '2 hours ago',
    image: null,
  },
  {
    id: 'proj-2345-6789-abcd-ef01',
    name: 'Portfolio Website',
    description: 'Personal portfolio with animations',
    updatedAt: '1 day ago',
    image: null,
  },
  {
    id: 'proj-3456-789a-bcde-f012',
    name: 'SaaS Dashboard',
    description: 'Analytics dashboard with charts',
    updatedAt: '3 days ago',
    image: null,
  },
];

const sidebarItems = [
  { icon: Home, label: 'Home', href: '/dashboard', active: true },
  { icon: FileText, label: 'Docs', href: '/docs' },
  { icon: Sparkles, label: 'Explore', href: '/explore' },
];

const bottomItems = [
  { icon: Settings, label: 'Settings', href: '/settings' },
  { icon: HelpCircle, label: 'Help', href: '/docs' },
];

export default function Dashboard() {
  const [prompt, setPrompt] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const userName = profile?.display_name || user?.email?.split('@')[0] || 'there';
  const userInitial = userName.charAt(0).toUpperCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      // Navigate to new project with prompt
      navigate('/project/new');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`fixed left-0 top-0 h-full bg-sidebar-background border-r border-sidebar-border flex flex-col z-50 transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo */}
        <div className="p-4 flex items-center gap-3">
          <img src={buildifyLogo} alt="Buildify" className="h-8 w-8 flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="font-bold text-lg">Buildify</span>
          )}
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>

        {/* Main Nav */}
        <nav className="flex-1 p-2">
          <ul className="space-y-1">
            {sidebarItems.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.href}
                  className={`sidebar-item ${item.active ? 'active' : ''}`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom Nav */}
        <div className="p-2 border-t border-sidebar-border">
          <ul className="space-y-1">
            {bottomItems.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.href}
                  className="sidebar-item"
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* User Profile */}
        <div className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-primary">{userInitial}</span>
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium truncate">{userName}</div>
                    <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-60'}`}>
        <div className="min-h-screen flex flex-col">
          {/* Hero / Prompt Section */}
          <section className="flex-shrink-0 pt-16 pb-8 px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl mx-auto text-center"
            >
              <h1 className="text-3xl md:text-4xl font-bold mb-8" style={{ fontFamily: "'Sora', sans-serif" }}>
                What do you want to build, {userName}?
              </h1>

              {/* Prompt Input */}
              <form onSubmit={handleSubmit} className="glass-card p-4 input-glow rounded-2xl">
                <div className="mb-4">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the app you want to create..."
                    className="w-full bg-transparent text-base focus:outline-none placeholder:text-muted-foreground/50 text-foreground"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="w-9 h-9 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat
                    </button>
                    <button
                      type="submit"
                      className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center text-background hover:bg-foreground/90 transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </section>

          {/* Projects Section */}
          <section className="flex-1 px-6 pb-12">
            <div className="max-w-6xl mx-auto">
              {/* Section Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex items-center justify-between mb-6"
              >
                <h2 className="text-xl font-semibold">Your Projects</h2>
                <Link
                  to="/project/new"
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  View all
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>

              {/* Projects Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Create New Project Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                >
                  <Link
                    to="/project/new"
                    className="glass-card h-[180px] flex flex-col items-center justify-center gap-3 hover:border-primary/30 transition-all cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      New Project
                    </span>
                  </Link>
                </motion.div>

                {/* Project Cards */}
                {mockProjects.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15 + (index + 1) * 0.05 }}
                  >
                    <Link
                      to={`/project/${project.id}`}
                      className="glass-card h-[180px] flex flex-col hover:border-primary/30 transition-all group overflow-hidden"
                    >
                      {/* Preview Area */}
                      <div className="flex-1 bg-muted/30 flex items-center justify-center">
                        <Folder className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      
                      {/* Info */}
                      <div className="p-3 border-t border-border/50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                              {project.name}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{project.updatedAt}</span>
                            </div>
                          </div>
                          <button 
                            className="text-muted-foreground hover:text-foreground p-1 -mr-1"
                            onClick={(e) => e.preventDefault()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
