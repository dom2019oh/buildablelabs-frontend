import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Grainient from '@/components/ui/Grainient';
import CardSwap, { Card } from '@/components/ui/CardSwap';
import { saveOnboardingAnswers } from '@/hooks/useOnboarding';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Sparkles } from 'lucide-react';

const QUESTIONS = [
  {
    id: 'q1',
    question: 'What should Buildable AI call you?',
    type: 'text',
    placeholder: 'Enter your name or nickname...',
    required: true
  },
  {
    id: 'q2',
    question: 'Is this your first time Vibe coding or have you coded before?',
    type: 'radio',
    options: ['First Time Vibe Coding', 'I have coded before'],
    required: true
  },
  {
    id: 'q3',
    question: 'What is your main goal with Buildable?',
    type: 'radio',
    options: [
      'I just want to find out what it can do.',
      'I want to create a Website or Full Stack App.',
      "I'm just testing AIs to see which is the best.",
      'I want to design/build Components with the AI to help my Project.',
      'Other'
    ],
    hasOther: true,
    required: true
  },
  {
    id: 'q4',
    question: 'What are you expecting from Buildable?',
    type: 'textarea',
    placeholder: 'Share your expectations (optional)...',
    required: false
  },
  {
    id: 'q5',
    question: 'Working solo or in a team?',
    type: 'radio',
    options: ['Solo', 'Team'],
    required: false
  },
  {
    id: 'q6',
    question: 'How did you find Buildable?',
    type: 'radio',
    options: ['Instagram', 'Direct', 'Google search', 'Youtube', 'ChatGPT', 'GrokAI', 'Other'],
    required: false
  }
];

const SHOWCASE_MESSAGES = [
  "Build stunning websites in minutes",
  "AI-powered design assistance",
  "From idea to deployment, faster",
  "Create without limits",
  "Your vision, our technology",
  "Design smarter, not harder",
  "The future of web development"
];

const TEMPLATE_CARDS = [
  { 
    title: 'SaaS Dashboard', 
    description: 'Modern admin panel with analytics',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop'
  },
  { 
    title: 'E-commerce Store', 
    description: 'Full-featured online shop',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop'
  },
  { 
    title: 'Portfolio Site', 
    description: 'Showcase your creative work',
    image: 'https://images.unsplash.com/photo-1545665277-5937489579f2?w=600&h=400&fit=crop'
  },
  { 
    title: 'Landing Page', 
    description: 'High-converting marketing pages',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop'
  },
  { 
    title: 'Blog Platform', 
    description: 'Content-first publishing',
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&h=400&fit=crop'
  },
  { 
    title: 'Mobile App UI', 
    description: 'Responsive app interfaces',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&h=400&fit=crop'
  },
  { 
    title: 'Documentation', 
    description: 'Developer-friendly docs',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop'
  },
  { 
    title: 'Social Network', 
    description: 'Community-driven platform',
    image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=400&fit=crop'
  }
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [otherText, setOtherText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showcaseIndex, setShowcaseIndex] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: string })?.returnTo || '/dashboard';

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if already completed/skipped
      const { data } = await supabase
        .from('user_onboarding')
        .select('completed, skipped')
        .eq('id', user.id)
        .single();

      if (data?.completed || data?.skipped) {
        navigate(returnTo, { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  // Rotate showcase messages
  useEffect(() => {
    const interval = setInterval(() => {
      setShowcaseIndex((prev) => (prev + 1) % SHOWCASE_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentQuestion = QUESTIONS[currentStep];
  const canSkip = currentStep >= 3;
  const isLastQuestion = currentStep === QUESTIONS.length - 1;

  const handleAnswer = (value: string) => {
    if (currentQuestion.hasOther && value === 'Other') {
      setAnswers({ ...answers, [currentQuestion.id]: `Other: ${otherText}` });
    } else {
      setAnswers({ ...answers, [currentQuestion.id]: value });
    }
  };

  const handleNext = async () => {
    if (isLastQuestion) {
      await handleFinish();
    } else {
      setCurrentStep((prev) => prev + 1);
      setOtherText('');
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await saveOnboardingAnswers(answers, false, true);
      navigate(returnTo);
    } catch (error) {
      console.error('Failed to skip onboarding:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await saveOnboardingAnswers(answers, true, false);
      navigate(returnTo);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCurrentAnswerValid = () => {
    if (!currentQuestion.required) return true;
    const answer = answers[currentQuestion.id];
    if (!answer) return false;
    if (currentQuestion.hasOther && answer === 'Other' && !otherText.trim()) return false;
    return true;
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Questions */}
      <div className="w-full lg:w-1/2 bg-zinc-900 flex flex-col">
        <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-12">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
              <span>{currentStep + 1}</span>
              <span>/</span>
              <span>{QUESTIONS.length}</span>
            </div>
            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-semibold text-white mb-6">
              {currentQuestion.question}
            </h2>

            {currentQuestion.type === 'text' && (
              <Input
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswer(e.target.value)}
                placeholder={currentQuestion.placeholder}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12"
              />
            )}

            {currentQuestion.type === 'textarea' && (
              <Textarea
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswer(e.target.value)}
                placeholder={currentQuestion.placeholder}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 min-h-[120px]"
              />
            )}

            {currentQuestion.type === 'radio' && (
              <RadioGroup
                value={answers[currentQuestion.id]?.startsWith('Other:') ? 'Other' : answers[currentQuestion.id] || ''}
                onValueChange={handleAnswer}
                className="space-y-3"
              >
                {currentQuestion.options?.map((option) => (
                  <div key={option} className="flex items-center space-x-3">
                    <RadioGroupItem 
                      value={option} 
                      id={option}
                      className="border-zinc-600 text-purple-500"
                    />
                    <Label 
                      htmlFor={option}
                      className="text-zinc-300 cursor-pointer hover:text-white transition-colors"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion.hasOther && answers[currentQuestion.id]?.startsWith('Other') && (
              <Input
                value={otherText}
                onChange={(e) => {
                  setOtherText(e.target.value);
                  setAnswers({ ...answers, [currentQuestion.id]: `Other: ${e.target.value}` });
                }}
                placeholder="Please specify..."
                className="mt-4 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleNext}
              disabled={!isCurrentAnswerValid() || isSubmitting}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 h-12"
            >
              {isSubmitting ? 'Saving...' : isLastQuestion ? 'Finish' : 'Next'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            {canSkip && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isSubmitting}
                className="text-zinc-400 hover:text-white"
              >
                Skip for now
              </Button>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="px-8 md:px-16 lg:px-20 py-6 border-t border-zinc-800">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} Buildable Labs. All rights reserved.
          </p>
        </footer>
      </div>

      {/* Right Side - Animated Background */}
      <div className="hidden lg:block w-1/2 relative overflow-hidden">
        <Grainient
          color1="#4f4a4f"
          color2="#ccc7e1"
          color3="#121212"
          timeSpeed={0.25}
          colorBalance={0}
          warpStrength={1}
          warpFrequency={5}
          warpSpeed={2}
          warpAmplitude={50}
          blendAngle={0}
          blendSoftness={0.05}
          rotationAmount={500}
          noiseScale={2}
          grainAmount={0.1}
          grainScale={2}
          grainAnimated={false}
          contrast={1.5}
          gamma={1}
          saturation={1}
          centerX={0}
          centerY={0}
          zoom={0.9}
        />

        {/* Rotating Text */}
        <div className="absolute top-12 left-0 right-0 text-center z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-sm rounded-full">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span 
              key={showcaseIndex}
              className="text-white font-medium animate-fade-in"
            >
              {SHOWCASE_MESSAGES[showcaseIndex]}
            </span>
          </div>
        </div>

        {/* Card Swap */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{ height: '600px', width: '100%', position: 'relative' }}>
            <CardSwap
              cardDistance={80}
              verticalDistance={80}
              delay={4000}
              pauseOnHover={true}
              width={400}
              height={280}
            >
              {TEMPLATE_CARDS.map((template, i) => (
                <Card 
                  key={i} 
                  className="overflow-hidden flex flex-col bg-zinc-900/95 backdrop-blur-sm border-zinc-700/50"
                >
                  {/* Image */}
                  <div className="h-[180px] w-full overflow-hidden">
                    <img 
                      src={template.image} 
                      alt={template.title}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                    />
                  </div>
                  {/* Content */}
                  <div className="p-4 flex flex-col justify-end flex-1 bg-gradient-to-t from-zinc-900 to-zinc-900/80">
                    <h3 className="text-lg font-semibold text-white mb-1">{template.title}</h3>
                    <p className="text-sm text-zinc-400">{template.description}</p>
                  </div>
                </Card>
              ))}
            </CardSwap>
          </div>
        </div>
      </div>
    </div>
  );
}
