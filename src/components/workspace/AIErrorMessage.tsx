import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, CreditCard, Clock, WifiOff, Bug, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AIErrorMessageProps {
  error: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

// Map error types to user-friendly messages and icons
function getErrorDetails(error: string) {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes('rate limit') || lowerError.includes('429')) {
    return {
      icon: Clock,
      title: 'Too Many Requests',
      message: 'You\'re sending requests too quickly. Please wait a moment and try again.',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      suggestion: 'Wait 30 seconds before retrying',
      canRetry: true,
    };
  }
  
  if (lowerError.includes('credits') || lowerError.includes('402') || lowerError.includes('payment')) {
    return {
      icon: CreditCard,
      title: 'Credits Exhausted',
      message: 'You\'ve run out of AI credits. Add more credits to continue building.',
      color: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      suggestion: 'Go to Settings → Billing to add credits',
      canRetry: false,
    };
  }
  
  if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('connection')) {
    return {
      icon: WifiOff,
      title: 'Connection Error',
      message: 'Unable to connect to the AI service. Check your internet connection.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      suggestion: 'Check your internet and try again',
      canRetry: true,
    };
  }
  
  if (lowerError.includes('invalid') || lowerError.includes('400')) {
    return {
      icon: Bug,
      title: 'Invalid Request',
      message: 'There was an issue processing your request. This is usually temporary.',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      suggestion: 'Try rephrasing your request',
      canRetry: true,
    };
  }
  
  if (lowerError.includes('timeout')) {
    return {
      icon: Clock,
      title: 'Request Timeout',
      message: 'The AI took too long to respond. Try a simpler request.',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      suggestion: 'Break down complex requests into smaller steps',
      canRetry: true,
    };
  }
  
  // Default error
  return {
    icon: AlertCircle,
    title: 'Something Went Wrong',
    message: error || 'An unexpected error occurred. Our team has been notified.',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    suggestion: 'Try again or contact support if the issue persists',
    canRetry: true,
  };
}

export default function AIErrorMessage({ error, onRetry, isRetrying }: AIErrorMessageProps) {
  const details = getErrorDetails(error);
  const Icon = details.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={cn(
        'rounded-lg border p-4',
        details.bgColor,
        details.borderColor
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0',
          details.bgColor
        )}>
          <Icon className={cn('h-4 w-4', details.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-semibold text-sm', details.color)}>
            {details.title}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            {details.message}
          </p>
          
          {/* Suggestion */}
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <HelpCircle className="h-3 w-3" />
            <span>{details.suggestion}</span>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      {details.canRetry && onRetry && (
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            disabled={isRetrying}
            className="h-7 text-xs"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1.5 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Try Again
              </>
            )}
          </Button>
        </div>
      )}
    </motion.div>
  );
}
