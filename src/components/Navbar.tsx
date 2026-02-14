import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Settings, BookOpen, HelpCircle, Users, LogOut, User } from "lucide-react";
import buildableLogo from "@/assets/buildable-logo.png";
import buildableText from "@/assets/buildable-text.svg";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navLinks = [
  {
    href: "/",
    label: "Home",
  },
  {
    href: "/pricing",
    label: "Pricing",
  },
  {
    href: "/docs",
    label: "Docs",
  },
  {
    href: "/explore",
    label: "Explore",
  },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "";
  const avatarUrl = profile?.avatar_url;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-3"
    >
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo on the left */}
        <Link to="/" className="flex items-center gap-2">
          <img src={buildableLogo} alt="Buildable" className="h-7 w-7 object-contain" />
          <img src={buildableText} alt="Buildable" className="h-6 object-contain" />
        </Link>

        {/* Links and account on the right */}
        <div className="flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`text-sm font-medium transition-colors duration-200 ${
                location.pathname === link.href ? "text-white" : "text-white/60 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Account dropdown or login button */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all">
                  <Avatar className="h-9 w-9 border border-border/50 hover:border-border transition-colors">
                    <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-popover border border-border shadow-lg z-[100]"
                sideOffset={8}
              >
                <div className="px-3 py-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                      <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-semibold text-foreground truncate">{displayName}</span>
                      <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator />
                <div className="py-1">
                  <DropdownMenuItem asChild>
                    <Link to="/docs" className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span>Documentation</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/docs" className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      <span>Help & Support</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/explore" className="flex items-center gap-3 px-3 py-2 cursor-pointer">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Join Community</span>
                    </Link>
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator />
                <div className="py-1">
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/log-in" className="text-sm font-medium text-white/60 hover:text-white transition-colors">
              Log in
            </Link>
          )}
        </div>
      </div>
    </motion.header>
  );
}
