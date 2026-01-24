import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Zap, Code2, Layers, Rocket } from 'lucide-react';
import Aurora from '@/components/Aurora';
import Navbar from '@/components/Navbar';

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Go from idea to production-ready code in minutes, not months.',
  },
  {
    icon: Code2,
    title: 'Clean Code',
    description: 'Modern frameworks, best practices, and scalable architecture.',
  },
  {
    icon: Layers,
    title: 'Full Stack',
    description: 'Frontend, backend, database, auth, and payments out of the box.',
  },
  {
    icon: Rocket,
    title: 'Deploy Ready',
    description: 'Ship immediately with structured, production-quality output.',
  },
];

export default function Index() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 z-0">
        <Aurora
          colorStops={["#de66ff", "#2ccea6", "#5227FF"]}
          blend={0.5}
          amplitude={1.0}
          speed={1}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Navbar />

        {/* Hero Section */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-8"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">AI-Powered Product Builder</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            >
              <span className="text-gradient-aurora">Turn intent into</span>
              <br />
              <span className="text-foreground">working software</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
            >
              Buildify creates complete, production-ready websites and applications
              from a single natural language prompt. No boilerplate, no hassle.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to="/sign-up" className="gradient-button flex items-center gap-2">
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/docs" className="glass-button flex items-center gap-2">
                Learn More
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything you need to <span className="text-gradient">build fast</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                From landing pages to full-stack SaaS, Buildify handles it all.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="glass-card p-6 hover:border-primary/30 transition-colors"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* What Buildify Creates */}
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="glass-card p-8 md:p-12"
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
                What can Buildify create?
              </h2>
              <div className="grid md:grid-cols-2 gap-4 text-muted-foreground">
                {[
                  'Modern marketing websites',
                  'Full-stack web applications',
                  'Dashboards & internal tools',
                  'SaaS with auth & payments',
                  'Mobile responsive web apps',
                  'APIs & database schemas',
                  'Admin panels & CRUD systems',
                  'Design systems & UI components',
                ].map((item, index) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                    <span>{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-border">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                © 2025 Buildify. All rights reserved.
              </span>
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
