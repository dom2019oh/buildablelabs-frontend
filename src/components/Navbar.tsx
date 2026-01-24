import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import buildifyLogo from '@/assets/buildify-logo.png';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
  { href: '/explore', label: 'Explore' },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[min(980px,calc(100vw-3rem))]"
    >
      <nav className="glass-nav w-full px-6 py-3 flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2 logo-shine overflow-hidden">
          <img 
            src={buildifyLogo} 
            alt="Buildify" 
            className="h-8 w-8 object-contain"
          />
          <span className="text-lg font-semibold text-foreground">Buildify</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === link.href
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/log-in"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </Link>
          <Link
            to="/sign-up"
            className="gradient-button text-sm py-2 px-4"
          >
            Get Started
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}
