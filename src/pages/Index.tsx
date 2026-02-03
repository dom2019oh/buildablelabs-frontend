import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Plus, ArrowUp } from "lucide-react";
import FloatingLines from "@/components/FloatingLines";
import RotatingText from "@/components/RotatingText";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";

const rotatingWords = [
  "Website!",
  "Game!",
  "App!",
  "Dashboard!",
  "Portfolio!",
  "Store!",
  "Blog!",
  "Tool!",
  "API!",
  "Chatbot!",
  "Landing Page!",
];

const placeholderVariants = [
  "create a landing page",
  "build a todo app",
  "design a dashboard",
  "make a blog platform",
  "create an e-commerce store",
  "build a chat application",
  "design a portfolio site",
  "make a booking system",
  "create a social media app",
  "build a project management tool",
  "design a fitness tracker",
  "make a recipe website",
  "create an analytics dashboard",
  "build a music player",
  "design a weather app",
  "make a note-taking app",
  "create a video streaming site",
  "build a quiz game",
  "design a real estate platform",
  "make a job board",
  "create a learning management system",
  "build a CRM dashboard",
  "design a travel booking site",
  "make an inventory system",
  "create a survey builder",
  "build a calendar app",
  "design a file sharing platform",
  "make a cryptocurrency tracker",
  "create a restaurant menu",
  "build an event management app",
  "design a team collaboration tool",
  "make a habit tracker",
  "create a podcast platform",
  "build a code snippet manager",
  "design an invoice generator",
  "make a kanban board",
  "create a customer support portal",
  "build a meditation app",
  "design a newsletter platform",
  "make a marketplace",
  "create a dating app",
  "build a budgeting tool",
  "design a documentation site",
  "make a feedback collector",
  "create a URL shortener",
  "build a status page",
  "design an AI chatbot",
  "make a link in bio page",
  "create a waitlist page",
  "build a pricing calculator",
];

export default function Index() {
  const [prompt, setPrompt] = useState("");
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholderIndex((prev) => (prev + 1) % placeholderVariants.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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
        linesGradient={["#000000", "#ffffff", "#d1d5db"]}
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
          {/* Rotating Text Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="flex items-center gap-3 text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            <span>Build a...</span>
            <RotatingText
              texts={rotatingWords}
              mainClassName="px-3 sm:px-4 md:px-5 bg-zinc-900 text-white overflow-hidden py-1 sm:py-2 md:py-3 justify-center rounded-xl border border-border/50"
              staggerFrom="last"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-120%", opacity: 0 }}
              staggerDuration={0.02}
              splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
              transition={{ type: "spring", damping: 35, stiffness: 300 }}
              rotationInterval={2000}
            />
          </motion.div>

          {/* Prompt Input Box - Lovable Style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
            className="w-full max-w-2xl mx-auto"
          >
            <form onSubmit={handleSubmit} className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 p-4 rounded-2xl shadow-2xl">
              {/* Main Input Area with Rotating Placeholder */}
              <div className="mb-4 relative min-h-[28px]">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full bg-transparent text-base focus:outline-none text-foreground relative z-10"
                />
                {!prompt && (
                  <div className="absolute inset-0 flex items-center pointer-events-none text-muted-foreground/60">
                    <span>Ask Buildable to </span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={currentPlaceholderIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="ml-1"
                      >
                        {placeholderVariants[currentPlaceholderIndex]}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Bottom Toolbar - Lovable Style */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="w-10 h-10 rounded-full border border-zinc-700 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-zinc-600 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Plan
                  </button>
                  <button
                    type="button"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M8 6v12M4 10v4M16 6v12M20 10v4" />
                    </svg>
                  </button>
                  <button
                    type="submit"
                    className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-foreground hover:bg-zinc-600 transition-colors"
                  >
                    <ArrowUp className="w-5 h-5" />
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
              <Link to="/dashboard" className="glass-button flex items-center gap-2">
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link to="/sign-up" className="glass-button flex items-center gap-2">
                Try Buildable
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