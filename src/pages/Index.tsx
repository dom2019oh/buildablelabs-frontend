import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Plus, MessageSquare } from "lucide-react";
import Aurora from "@/components/Aurora";
import Navbar from "@/components/Navbar";
import ShinyText from "@/components/ShinyText";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  // Get the display name from profile, or fallback to email username, or 'there'
  const userName = profile?.display_name || user?.email?.split("@")[0] || "there";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      if (user) {
        navigate("/dashboard");
      } else {
        navigate("/sign-up");
      }
    }
  };

  return (
    <div className="relative min-h-[120vh] overflow-hidden bg-background">
      {/* Aurora Background - Limited to top area */}
      <div className="absolute top-0 left-0 right-0 h-[60vh] z-0 overflow-hidden">
        <Aurora colorStops={["#de66ff", "#2ccea6", "#5227FF"]} blend={0.5} amplitude={1.0} speed={1} />
        {/* Gradient fade to background */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Navbar />

        {/* Hero Section - More top padding for spacing from navbar */}
        <section className="min-h-[80vh] flex flex-col items-center justify-center px-6 pt-40">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto w-full"
          >
            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-5xl font-bold mb-12"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              <ShinyText
                text={`Let's get your build going, ${loading ? "..." : userName}`}
                speed={3}
                delay={1}
                color="hsl(var(--foreground))"
                shineColor="hsl(var(--foreground) / 0.4)"
                spread={120}
                direction="left"
              />
            </motion.h1>

            {/* Prompt Input Box - Simplified */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="w-full max-w-2xl mx-auto mb-10"
            >
              <form onSubmit={handleSubmit} className="glass-card p-4 input-glow rounded-2xl">
                {/* Main Input Area */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ask Buildable to create a dashboard to..."
                    className="w-full bg-transparent text-base focus:outline-none placeholder:text-muted-foreground/50 text-foreground"
                  />
                </div>

                {/* Bottom Toolbar - Simplified */}
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

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              {user ? (
                <Link to="/dashboard" className="gradient-button flex items-center gap-2">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link to="/sign-up" className="gradient-button flex items-center gap-2">
                  Get Started Free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              <Link to="/docs" className="glass-button flex items-center gap-2">
                Learn More
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Spacer for longer page */}
        <div className="h-48" />

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-border">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">© 2025 Buildable. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Docs
              </Link>
              <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
              <Link to="/explore" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Explore
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
