import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FolderKanban, BarChart3, CreditCard, Settings, Layout, Component, Palette } from "lucide-react";
import buildableLogo from "@/assets/buildify-logo.png";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: FolderKanban, label: "Projects", href: "/dashboard" },
  { icon: BarChart3, label: "Usage", href: "/dashboard/usage" },
  { icon: CreditCard, label: "Billing", href: "/dashboard/billing" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

const libraryItems = [
  { icon: Layout, label: "Templates", href: "/dashboard/templates" },
  { icon: Component, label: "Components", href: "/dashboard/components" },
  { icon: Palette, label: "Backgrounds", href: "/dashboard/backgrounds" },
];

export default function DashboardSidebar() {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard" || location.pathname.startsWith("/dashboard/project");
    }
    return location.pathname === href;
  };

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 h-full w-60 bg-sidebar-background border-r border-sidebar-border flex flex-col z-50"
    >
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-3">
          <img src={buildableLogo} alt="Buildable" className="h-8 w-8" />
          <span className="font-bold text-lg" style={{ fontFamily: "'Funnel Display', sans-serif" }}>
            Buildable
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.label}>
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  isActive(item.href) && "text-foreground bg-primary/10 border-l-2 border-primary",
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Library Section */}
        <div className="mt-6 pt-4 border-t border-sidebar-border">
          <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Library
          </p>
          <ul className="space-y-1">
            {libraryItems.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    isActive(item.href) && "text-foreground bg-primary/10 border-l-2 border-primary",
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="px-3 py-2 text-xs text-muted-foreground">© 2026 Buildable Labs</div>
      </div>
    </motion.aside>
  );
}
