import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Code2, Sparkles, Palette, Check, FileCode, Settings, Zap, Search, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThinkingIndicatorProps {
  isVisible: boolean;
  taskType?: string;
  modelUsed?: string;
  completedSteps?: string[];
}

// Different thinking phases to cycle through
const THINKING_PHASES = [
  { icon: Search, text: 'Analyzing your request...', color: 'text-purple-400' },
  { icon: Brain, text: 'Planning the solution...', color: 'text-amber-400' },
  { icon: Code2, text: 'Generating code...', color: 'text-blue-400' },
  { icon: Palette, text: 'Polishing the output...', color: 'text-emerald-400' },
];

// Simulated step logs that appear during generation
const STEP_MESSAGES = [
  { icon: Search, text: 'Reading project context', delay: 0 },
  { icon: Brain, text: 'Understanding requirements', delay: 800 },
  { icon: Settings, text: 'Configuring build environment', delay: 1600 },
  { icon: Code2, text: 'Writing component structure', delay: 2400 },
  { icon: Palette, text: 'Applying styles and layout', delay: 3200 },
  { icon: FileCode, text: 'Generating TypeScript code', delay: 4000 },
  { icon: Zap, text: 'Optimizing performance', delay: 4800 },
  { icon: Shield, text: 'Running validation checks', delay: 5600 },
];

export default function ThinkingIndicator({ isVisible, taskType, modelUsed, completedSteps = [] }: ThinkingIndicatorProps) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [completedIndices, setCompletedIndices] = useState<number[]>([]);

  // Cycle through phases while visible
  useEffect(() => {
    if (!isVisible) {
      setCurrentPhase(0);
      setVisibleSteps([]);
      setCompletedIndices([]);
      return;
    }

    const interval = setInterval(() => {
      setCurrentPhase((prev) => (prev + 1) % THINKING_PHASES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Progressively reveal step messages
  useEffect(() => {
    if (!isVisible) return;

    const timers: NodeJS.Timeout[] = [];
    
    STEP_MESSAGES.forEach((step, index) => {
      const showTimer = setTimeout(() => {
        setVisibleSteps((prev) => [...prev, index]);
      }, step.delay);
      timers.push(showTimer);

      // Mark as completed after a delay
      const completeTimer = setTimeout(() => {
        setCompletedIndices((prev) => [...prev, index]);
      }, step.delay + 600);
      timers.push(completeTimer);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [isVisible]);

  const phase = THINKING_PHASES[currentPhase];
  const PhaseIcon = phase.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-lg overflow-hidden bg-gradient-to-r from-primary/5 to-transparent border border-primary/10"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-3 w-3 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">Buildable</span>
            {modelUsed && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {modelUsed}
              </span>
            )}
          </div>

          {/* Main Thinking Animation */}
          <div className="flex items-center gap-3 px-4 pb-3">
            {/* Animated Icon */}
            <motion.div
              key={currentPhase}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center bg-muted/50',
                phase.color
              )}
            >
              <PhaseIcon className="h-4 w-4" />
            </motion.div>

            {/* Text and Progress */}
            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentPhase}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="text-sm text-foreground font-medium"
                >
                  {phase.text}
                </motion.p>
              </AnimatePresence>

              {/* Progress Steps */}
              <div className="flex items-center gap-1 mt-2">
                {THINKING_PHASES.map((_, index) => (
                  <motion.div
                    key={index}
                    className={cn(
                      'h-1 rounded-full transition-all duration-300',
                      index <= currentPhase ? 'bg-primary w-6' : 'bg-muted w-4'
                    )}
                    animate={{
                      scale: index === currentPhase ? [1, 1.1, 1] : 1,
                    }}
                    transition={{ duration: 0.5, repeat: index === currentPhase ? Infinity : 0 }}
                  />
                ))}
              </div>
            </div>

            {/* Spinning Indicator */}
            <div className="relative h-6 w-6">
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-primary/20"
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </div>

          {/* Step-by-Step Log Lines */}
          <div className="border-t border-border/50 bg-muted/20">
            <div className="px-4 py-2 space-y-1.5 max-h-32 overflow-y-auto">
              <AnimatePresence>
                {visibleSteps.map((stepIndex) => {
                  const step = STEP_MESSAGES[stepIndex];
                  const StepIcon = step.icon;
                  const isComplete = completedIndices.includes(stepIndex);
                  
                  return (
                    <motion.div
                      key={stepIndex}
                      initial={{ opacity: 0, x: -20, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <div className={cn(
                        'h-4 w-4 rounded flex items-center justify-center transition-colors',
                        isComplete ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted text-muted-foreground'
                      )}>
                        {isComplete ? (
                          <Check className="h-2.5 w-2.5" />
                        ) : (
                          <StepIcon className="h-2.5 w-2.5" />
                        )}
                      </div>
                      <span className={cn(
                        'text-xs transition-colors',
                        isComplete ? 'text-muted-foreground' : 'text-foreground'
                      )}>
                        {step.text}
                      </span>
                      {isComplete && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-[10px] text-emerald-500 ml-auto"
                        >
                          ✓
                        </motion.span>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {visibleSteps.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  Starting build process...
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
