import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GenerationPhase } from '@/hooks/useBuildableAI';

interface PipelineProgressBarProps {
  phase: GenerationPhase;
  isVisible: boolean;
  filesDelivered?: number;
}

const PIPELINE_STAGES = [
  { id: 'context', label: 'Analyzing', shortLabel: 'Context' },
  { id: 'intent', label: 'Understanding', shortLabel: 'Intent' },
  { id: 'planning', label: 'Planning', shortLabel: 'Plan' },
  { id: 'generating', label: 'Generating', shortLabel: 'Code' },
  { id: 'validating', label: 'Validating', shortLabel: 'Validate' },
  { id: 'complete', label: 'Complete', shortLabel: 'Done' },
] as const;

type StageId = typeof PIPELINE_STAGES[number]['id'];

function getStageIndex(phase: GenerationPhase['phase']): number {
  const phaseToStage: Record<string, StageId> = {
    starting: 'context',
    context: 'context',
    intent: 'intent',
    planning: 'planning',
    generating: 'generating',
    validating: 'validating',
    repairing: 'validating',
    complete: 'complete',
    error: 'complete',
  };
  const stageId = phaseToStage[phase] || 'context';
  return PIPELINE_STAGES.findIndex(s => s.id === stageId);
}

function StageIcon({ status }: { status: 'done' | 'active' | 'pending' | 'error' }) {
  switch (status) {
    case 'done':
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
        >
          <Check className="w-3 h-3 text-white" />
        </motion.div>
      );
    case 'active':
      return (
        <motion.div
          animate={{ boxShadow: ['0 0 0 0 rgba(139, 92, 246, 0.4)', '0 0 0 8px rgba(139, 92, 246, 0)', '0 0 0 0 rgba(139, 92, 246, 0.4)'] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
        >
          <Loader2 className="w-3 h-3 text-white animate-spin" />
        </motion.div>
      );
    case 'error':
      return (
        <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
          <AlertCircle className="w-3 h-3 text-white" />
        </div>
      );
    default:
      return <div className="w-5 h-5 rounded-full border-2 border-zinc-600 bg-zinc-800" />;
  }
}

export default function PipelineProgressBar({ phase, isVisible, filesDelivered = 0 }: PipelineProgressBarProps) {
  const currentIndex = getStageIndex(phase.phase);
  const isError = phase.phase === 'error';
  const isComplete = phase.phase === 'complete';
  const progress = phase.progress ?? 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          {/* Stage indicators */}
          <div className="flex items-center justify-between mb-2">
            {PIPELINE_STAGES.map((stage, index) => {
              let status: 'done' | 'active' | 'pending' | 'error' = 'pending';
              if (isError && index === currentIndex) status = 'error';
              else if (index < currentIndex || isComplete) status = 'done';
              else if (index === currentIndex) status = 'active';

              return (
                <div key={stage.id} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <StageIcon status={status} />
                    <span className={cn(
                      "text-[10px] font-medium whitespace-nowrap",
                      status === 'done' && "text-emerald-400",
                      status === 'active' && "text-primary",
                      status === 'error' && "text-destructive",
                      status === 'pending' && "text-zinc-500",
                    )}>
                      {stage.shortLabel}
                    </span>
                  </div>
                  {/* Connector line */}
                  {index < PIPELINE_STAGES.length - 1 && (
                    <div className="relative w-8 sm:w-12 h-0.5 mx-1 mt-[-12px]">
                      <div className="absolute inset-0 bg-zinc-700 rounded-full" />
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{
                          width: index < currentIndex || isComplete ? '100%' : index === currentIndex ? '50%' : '0%',
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="relative h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                isError ? "bg-destructive" : isComplete ? "bg-emerald-500" : "bg-gradient-to-r from-primary via-purple-400 to-primary",
              )}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
            {/* Shimmer effect during active generation */}
            {!isComplete && !isError && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              />
            )}
          </div>

          {/* Status text */}
          <div className="flex items-center justify-between mt-1.5">
            <AnimatePresence mode="wait">
              <motion.span
                key={phase.message}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={cn(
                  "text-xs",
                  isError ? "text-destructive" : isComplete ? "text-emerald-400" : "text-muted-foreground",
                )}
              >
                {phase.message || 'Starting...'}
              </motion.span>
            </AnimatePresence>
            {filesDelivered > 0 && !isComplete && (
              <span className="text-xs text-emerald-400 font-mono">
                {filesDelivered} file{filesDelivered !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}