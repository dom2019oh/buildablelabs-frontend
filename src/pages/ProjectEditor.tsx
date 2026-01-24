import { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import { 
  Send, 
  Globe, 
  Code2, 
  Eye, 
  ChevronDown, 
  Plus, 
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Copy,
  MoreHorizontal,
  Zap,
  Sparkles
} from 'lucide-react';
import buildifyLogo from '@/assets/buildify-logo.png';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: "Welcome to your new project! I'm Buildify, your AI-powered product builder. Describe what you want to build, and I'll help you create it. You can ask me to build websites, apps, dashboards, and more.",
    timestamp: new Date(),
  },
];

export default function ProjectEditor() {
  const { projectId } = useParams();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [creditsUsed, setCreditsUsed] = useState(13);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setCreditsUsed((prev) => prev + 1);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I understand you want to: "${input}". I'm working on it now. This is a demo response - in the full version, I would generate the code and show you a live preview!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
    }, 1500);
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Left Panel - Chat */}
      <div className="w-[450px] flex flex-col border-r border-border">
        {/* Project Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src={buildifyLogo} alt="Buildify" className="h-6 w-6" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">My Project</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">
                {projectId?.slice(0, 8)}...
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground glass-card px-3 py-1">
              <Zap className="w-4 h-4 text-primary" />
              <span>{creditsUsed} credits</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${
                message.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'
              } chat-message`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Buildify</span>
                </div>
              )}
              <p className="text-sm">{message.content}</p>
              
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                  <button className="text-muted-foreground hover:text-foreground p-1">
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button className="text-muted-foreground hover:text-foreground p-1">
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                  <button className="text-muted-foreground hover:text-foreground p-1">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button className="text-muted-foreground hover:text-foreground p-1 ml-auto">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border">
          <div className="glass-card p-3 input-glow">
            <div className="flex items-center gap-2 mb-2">
              <button className="text-muted-foreground hover:text-foreground p-1">
                <Plus className="w-5 h-5" />
              </button>
              <button className="text-muted-foreground hover:text-foreground p-1">
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask Buildify..."
                rows={2}
                className="flex-1 bg-transparent resize-none focus:outline-none text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="gradient-button p-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 flex flex-col">
        {/* Preview Header */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center glass-card p-1 rounded-lg">
              <button
                onClick={() => setView('preview')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  view === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                <Globe className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={() => setView('code')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  view === 'code' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                <Code2 className="w-4 h-4" />
                Code
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="glass-card px-3 py-1.5 flex items-center gap-2 text-sm text-muted-foreground">
              <span>/</span>
            </div>
            <button className="glass-button px-4 py-1.5 text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Open
            </button>
            <button className="gradient-button px-4 py-1.5 text-sm">
              Publish
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 bg-muted/30 flex items-center justify-center">
          {view === 'preview' ? (
            <div className="text-center">
              <div className="glass-card p-12 max-w-md">
                <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Preview Area</h2>
                <p className="text-muted-foreground text-sm">
                  Your generated website will appear here. Start by describing what you want to build in the chat.
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full h-full p-4">
              <div className="glass-card h-full p-4 font-mono text-sm">
                <pre className="text-muted-foreground">
{`// Your generated code will appear here
// Start by describing what you want to build

import React from 'react';

export default function App() {
  return (
    <div>
      <h1>Hello, Buildify!</h1>
    </div>
  );
}`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
