import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Plus, 
  Mic,
  Image,
  Github,
  History,
  Settings,
  Loader2,
  Square,
  ArrowUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface ChatInputV2Props {
  onSend: (content: string) => Promise<void>;
  isSending: boolean;
  isPlanMode: boolean;
  onPlanModeChange: (enabled: boolean) => void;
  projectId: string;
}

export default function ChatInputV2({
  onSend,
  isSending,
  isPlanMode,
  onPlanModeChange,
  projectId,
}: ChatInputV2Props) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const content = input.trim();
    setInput('');
    await onSend(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access to use voice input.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const processAudioWithSTT = async () => {
    if (!audioBlob) return;
    
    setIsProcessingAudio(true);
    try {
      // Upload to Supabase storage
      const fileName = `${projectId}/${Date.now()}.webm`;
      const { data: userData } = await supabase.auth.getUser();
      
      if (!userData.user) {
        throw new Error('Not authenticated');
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('voice-recordings')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('voice-recordings')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('voice_recordings')
        .insert({
          project_id: projectId,
          user_id: userData.user.id,
          audio_url: urlData.publicUrl,
          duration_seconds: recordingTime,
          status: 'processing',
        });

      if (dbError) throw dbError;

      // Call STT edge function
      const { data: sttData, error: sttError } = await supabase.functions.invoke('speech-to-text', {
        body: { audioUrl: urlData.publicUrl },
      });

      if (sttError) throw sttError;

      if (sttData?.transcription) {
        setInput(prev => prev + (prev ? ' ' : '') + sttData.transcription);
        toast({
          title: 'Voice transcribed',
          description: 'Your message has been added to the input.',
        });
      }

      // Clear audio blob
      setAudioBlob(null);
      setRecordingTime(0);
    } catch (error) {
      console.error('STT error:', error);
      toast({
        title: 'Transcription failed',
        description: error instanceof Error ? error.message : 'Could not process audio',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingAudio(false);
    }
  };

  const cancelRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-3 bg-zinc-900 border-t border-zinc-800">
      {/* Audio Preview */}
      {audioBlob && !isRecording && (
        <div className="mb-2 p-2 bg-zinc-800 rounded-lg flex items-center gap-2">
          <audio src={URL.createObjectURL(audioBlob)} controls className="h-8 flex-1" />
          <Button 
            size="sm" 
            onClick={processAudioWithSTT}
            disabled={isProcessingAudio}
            className="h-8"
          >
            {isProcessingAudio ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Transcribe'
            )}
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={cancelRecording}
            className="h-8 text-muted-foreground"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Input Bar - Lovable-style layout */}
      <div className="bg-zinc-800 rounded-2xl border border-zinc-700 focus-within:border-zinc-600 transition-colors">
        {/* Text Input Area - Top */}
        <div className="relative px-4 pt-3 pb-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isPlanMode ? "Describe what to plan..." : "Ask Buildable..."}
            rows={1}
            disabled={isSending || isRecording}
            className="w-full bg-transparent resize-none text-sm placeholder:text-zinc-500 focus:outline-none min-h-[24px] max-h-[150px]"
          />
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm text-red-400">{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>

        {/* Bottom Controls Row */}
        <div className="flex items-center justify-between px-2 pb-2">
          {/* Left side - Plus menu & Visual edits placeholder */}
          <div className="flex items-center gap-1">
            {/* Plus Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-48 bg-zinc-900 border-zinc-700">
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <Image className="h-4 w-4" />
                  Attach image
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <Github className="h-4 w-4" />
                  GitHub
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-700" />
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <History className="h-4 w-4" />
                  History
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                  <Link to={`/dashboard/project/${projectId}/settings`}>
                    <Settings className="h-4 w-4" />
                    Project settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-1">
            {/* Plan Mode Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-3 font-medium transition-colors rounded-lg text-sm",
                    isPlanMode 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                  )}
                  onClick={() => onPlanModeChange(!isPlanMode)}
                >
                  Plan
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Plan mode: AI won't commit changes without approval</p>
              </TooltipContent>
            </Tooltip>

            {/* Voice Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-lg",
                    isRecording 
                      ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" 
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                  )}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isSending || isProcessingAudio}
                >
                  {isRecording ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRecording ? 'Stop recording' : 'Voice input'}</p>
              </TooltipContent>
            </Tooltip>

            {/* Send Button - Circle with arrow */}
            <Button
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full transition-colors",
                input.trim() && !isSending
                  ? "bg-zinc-100 hover:bg-white text-zinc-900"
                  : "bg-zinc-700 text-zinc-500"
              )}
              onClick={handleSend}
              disabled={!input.trim() || isSending}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
