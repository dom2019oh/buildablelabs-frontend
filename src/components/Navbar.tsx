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
      className="fixed top-6 left-0 right-0 z-50 flex justify-center px-6"
    >
      <nav className="glass-nav w-full max-w-2xl px-6 py-3 flex items-center justify-between">
        {/* Logo on the left */}
        <Link to="/" className="flex items-center gap-2 logo-shine overflow-hidden">
          <img 
            src={buildifyLogo} 
            alt="Buildify" 
            className="h-7 w-7 object-contain"
          />
          <span className="text-base font-semibold text-foreground">Buildify</span>
        </Link>

        {/* Links on the right */}
        <div className="flex items-center gap-6">
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
      </nav>
    </motion.header>
  );
}
