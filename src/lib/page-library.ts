/**
 * PAGE LIBRARY
 * Full-page templates ready for Buildable AI to inject when generating projects.
 * These are used by the edge function as "example" starting points.
 */

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  category: 'auth' | 'dashboard' | 'settings' | 'landing' | 'error' | 'blog' | 'ecommerce';
  path: string; // suggested file path
  code: string; // production-ready TSX
}

export const PAGE_LIBRARY: PageTemplate[] = [
  // ─────────────────────────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'login-page',
    name: 'Login Page',
    description: 'Clean login form with email & password, social buttons, and link to sign up.',
    category: 'auth',
    path: 'src/pages/Login.tsx',
    code: `import React, { useState } from 'react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-4">
      <div className="w-full max-w-md bg-zinc-800/60 backdrop-blur-xl rounded-2xl border border-zinc-700 p-8">
        <h1 className="text-2xl font-bold text-white text-center mb-2">Welcome back</h1>
        <p className="text-zinc-400 text-center mb-8">Sign in to your account</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Sign In
          </button>
        </form>
        <p className="text-center text-zinc-500 mt-6 text-sm">
          Don't have an account?{' '}
          <a href="/sign-up" className="text-purple-400 hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  );
}`,
  },
  {
    id: 'signup-page',
    name: 'Sign Up Page',
    description: 'Registration form with name, email, password, and confirmation.',
    category: 'auth',
    path: 'src/pages/SignUp.tsx',
    code: `import React, { useState } from 'react';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle signup
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-4">
      <div className="w-full max-w-md bg-zinc-800/60 backdrop-blur-xl rounded-2xl border border-zinc-700 p-8">
        <h1 className="text-2xl font-bold text-white text-center mb-2">Create your account</h1>
        <p className="text-zinc-400 text-center mb-8">Start building amazing projects</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Create Account
          </button>
        </form>
        <p className="text-center text-zinc-500 mt-6 text-sm">
          Already have an account?{' '}
          <a href="/log-in" className="text-purple-400 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}`,
  },
  // ─────────────────────────────────────────────────────────────────
  // DASHBOARD
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'dashboard-page',
    name: 'Dashboard',
    description: 'Main dashboard with sidebar, stats cards, and a welcome header.',
    category: 'dashboard',
    path: 'src/pages/Dashboard.tsx',
    code: `import React from 'react';
import { LayoutDashboard, Users, BarChart3, Settings } from 'lucide-react';

const stats = [
  { label: 'Total Users', value: '1,234', icon: Users },
  { label: 'Revenue', value: '$12,456', icon: BarChart3 },
  { label: 'Active Projects', value: '23', icon: LayoutDashboard },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white flex">
      {/* Sidebar */}
      <aside className="w-60 bg-zinc-800 border-r border-zinc-700 flex flex-col">
        <div className="p-5 border-b border-zinc-700 font-bold text-lg">Dashboard</div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-purple-500/10 text-purple-400">
            <LayoutDashboard className="w-5 h-5" /> Overview
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-700/50">
            <Users className="w-5 h-5" /> Users
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-700/50">
            <BarChart3 className="w-5 h-5" /> Analytics
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-700/50">
            <Settings className="w-5 h-5" /> Settings
          </a>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">Welcome back 👋</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-zinc-400 text-sm">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}`,
  },
  // ─────────────────────────────────────────────────────────────────
  // SETTINGS
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'settings-page',
    name: 'Settings Page',
    description: 'User profile settings with avatar, form inputs, and save button.',
    category: 'settings',
    path: 'src/pages/Settings.tsx',
    code: `import React, { useState } from 'react';

export default function Settings() {
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john@example.com');

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xl font-bold">
              JD
            </div>
            <button className="px-4 py-2 rounded-lg border border-zinc-600 text-sm hover:bg-zinc-700 transition">
              Change Avatar
            </button>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <button className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:opacity-90 transition-opacity">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}`,
  },
  // ─────────────────────────────────────────────────────────────────
  // LANDING
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'landing-page',
    name: 'Landing Page',
    description: 'Hero section with CTA, features grid, and footer.',
    category: 'landing',
    path: 'src/pages/Index.tsx',
    code: `import React from 'react';
import { Sparkles, Zap, Shield, ArrowRight } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Lightning Fast', description: 'Built for speed from the ground up.' },
  { icon: Shield, title: 'Secure', description: 'Enterprise-grade security for your data.' },
  { icon: Sparkles, title: 'AI Powered', description: 'Smart features that learn from you.' },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-purple-900/20 to-zinc-900 text-white">
      {/* Hero */}
      <section className="relative py-32 px-4 text-center">
        <h1 className="text-5xl md:text-6xl font-bold max-w-3xl mx-auto leading-tight">
          Build Something <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Amazing</span>
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl mt-6 max-w-xl mx-auto">
          The all-in-one platform to ship your next project in record time.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <a href="/sign-up" className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold flex items-center gap-2 hover:opacity-90">
            Get Started <ArrowRight className="w-4 h-4" />
          </a>
          <a href="/pricing" className="px-6 py-3 rounded-xl border border-zinc-600 font-semibold hover:bg-zinc-800">
            View Pricing
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((f) => (
            <div key={f.title} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                <f.icon className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm">{f.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}`,
  },
  // ─────────────────────────────────────────────────────────────────
  // ERROR (404)
  // ─────────────────────────────────────────────────────────────────
  {
    id: 'not-found-page',
    name: '404 Page',
    description: 'Friendly not-found page with link back to home.',
    category: 'error',
    path: 'src/pages/NotFound.tsx',
    code: `import React from 'react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-900 text-white px-4 text-center">
      <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">404</h1>
      <p className="text-zinc-400 text-lg mt-4 mb-8">Oops! The page you're looking for doesn't exist.</p>
      <a href="/" className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold hover:opacity-90">
        Go Home
      </a>
    </div>
  );
}`,
  },
];

export function getPagesByCategory(category: PageTemplate['category']) {
  return PAGE_LIBRARY.filter((p) => p.category === category);
}

export function getPageById(id: string) {
  return PAGE_LIBRARY.find((p) => p.id === id);
}
