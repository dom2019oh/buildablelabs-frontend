import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

export interface OnboardingStatus {
  completed: boolean;
  skipped: boolean;
  isLoading: boolean;
}

export function useOnboarding() {
  const [status, setStatus] = useState<OnboardingStatus>({
    completed: false,
    skipped: false,
    isLoading: true
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setStatus({ completed: false, skipped: false, isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('user_onboarding')
        .select('completed, skipped')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        // If no record exists, create one
        await supabase
          .from('user_onboarding')
          .insert({ id: user.id });
        
        setStatus({ completed: false, skipped: false, isLoading: false });
        return;
      }

      setStatus({
        completed: data.completed,
        skipped: data.skipped,
        isLoading: false
      });
    };

    checkOnboarding();
  }, []);

  const redirectIfNeeded = () => {
    if (status.isLoading) return;
    
    const protectedRoutes = ['/dashboard', '/project', '/settings', '/profile'];
    const isProtectedRoute = protectedRoutes.some(route => 
      location.pathname.startsWith(route)
    );

    if (isProtectedRoute && !status.completed && !status.skipped) {
      navigate('/onboarding');
    }
  };

  return { ...status, redirectIfNeeded };
}

export async function saveOnboardingAnswers(
  answers: Record<string, string>,
  completed: boolean,
  skipped: boolean
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('No user found');

  const { error } = await supabase
    .from('user_onboarding')
    .update({
      q1: answers.q1 || null,
      q2: answers.q2 || null,
      q3: answers.q3 || null,
      q4: answers.q4 || null,
      q5: answers.q5 || null,
      q6: answers.q6 || null,
      completed,
      skipped
    })
    .eq('id', user.id);

  if (error) throw error;

  // Send welcome email when onboarding is completed (not skipped)
  if (completed) {
    try {
      const displayName = answers.q1 || user.email?.split('@')[0] || 'there';
      
      await supabase.functions.invoke('send-welcome-email', {
        body: {
          email: user.email,
          displayName
        }
      });
      
      console.log('Welcome email sent successfully');
    } catch (emailError) {
      // Don't block onboarding completion if email fails
      console.error('Failed to send welcome email:', emailError);
    }
  }
}
