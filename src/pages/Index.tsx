import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Plus, MessageSquare } from "lucide-react";
import FloatingLines from "@/components/FloatingLines";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const [prompt, setPrompt] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

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
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Floating Lines Background */}
      <FloatingLines
        linesGradient={["#000000", "#ffffff", "#9ca3af"]}
        enabledWaves={["top", "middle", "bottom"]}
        lineCount={5}
        lineDistance={5}
        bendRadius={5}
        bendStrength={-0.5}
        interactive={true}
        parallax={true}
      />

      {/* Content */}
      <div className="relative z-10">
        <Navbar />

        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6">
          {/* Prompt Input Box with Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="w-full max-w-2xl mx-auto"
          >
            <form onSubmit={handleSubmit} className="glass-card p-4 input-glow rounded-2xl">
              {/* Main Input Area */}
              <div className="mb-4">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What do you want to build?"
                  className="w-full bg-transparent text-base focus:outline-none placeholder:text-muted-foreground/50 text-foreground"
                />
              </div>

              {/* Bottom Toolbar */}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8"
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
        </section>

        {/* Footer */}
        <footer className="absolute bottom-0 left-0 right-0 py-6 px-6 border-t border-border/30">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">© 2026 Buildable. All rights reserved.</span>
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
