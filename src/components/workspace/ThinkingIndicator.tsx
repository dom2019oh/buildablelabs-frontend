import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface ThinkingIndicatorProps {
  isVisible: boolean;
  taskType?: string;
  modelUsed?: string;
  currentAction?: string;
}

// Dynamic action messages that cycle during generation
const ACTION_MESSAGES = [
  "Reading your request...",
  "Analyzing project structure...",
  "Planning changes...",
  "Writing components...",
  "Generating code...",
  "Applying styles...",
  "Validating output...",
  "Finishing up...",
];

export default function ThinkingIndicator({ 
  isVisible, 
  taskType, 
  currentAction 
}: ThinkingIndicatorProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  // Cycle through action messages
  useEffect(() => {
    if (!isVisible) {
      setMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % ACTION_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const displayMessage = currentAction || ACTION_MESSAGES[messageIndex];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="flex items-center gap-3 px-4 py-3"
        >
          {/* Animated sparkle icon */}
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="text-primary"
          >
            <Sparkles className="h-5 w-5" />
          </motion.div>

          {/* Thinking text */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              Thinking
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                key={messageIndex}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 5 }}
                className="text-sm text-muted-foreground"
              >
                — {displayMessage}
              </motion.span>
            </AnimatePresence>
          </div>

          {/* Animated dots */}
          <div className="flex gap-1 ml-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-1 w-1 rounded-full bg-primary"
                animate={{
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
