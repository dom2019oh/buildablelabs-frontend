import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import buildifyLogo from '@/assets/buildify-logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic
    console.log('Login:', { email, password });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="min-h-screen flex items-center justify-center px-6 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="glass-card p-8">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <img src={buildifyLogo} alt="Buildify" className="h-10 w-10" />
              <span className="text-2xl font-bold">Buildify</span>
            </div>

            <h1 className="text-2xl font-bold text-center mb-2">Welcome back</h1>
            <p className="text-muted-foreground text-center mb-8">
              Sign in to continue building
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <div className="relative input-glow">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted/50 border border-border focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password</label>
                <div className="relative input-glow">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted/50 border border-border focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-border" />
                  <span className="text-muted-foreground">Remember me</span>
                </label>
                <Link to="#" className="text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>

              <button type="submit" className="gradient-button w-full flex items-center justify-center gap-2">
                Sign In
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-center text-muted-foreground text-sm mt-6">
              Don't have an account?{' '}
              <Link to="/sign-up" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
