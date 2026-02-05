import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [onboardingStatus, setOnboardingStatus] = useState<{
    completed: boolean;
    skipped: boolean;
    isLoading: boolean;
  }>({ completed: false, skipped: false, isLoading: true });

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) {
        setOnboardingStatus({ completed: false, skipped: false, isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('user_onboarding')
        .select('completed, skipped')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        // If no record exists, user needs onboarding
        setOnboardingStatus({ completed: false, skipped: false, isLoading: false });
        return;
      }

      setOnboardingStatus({
        completed: data.completed,
        skipped: data.skipped,
        isLoading: false
      });
    };

    if (!loading && user) {
      checkOnboarding();
    } else if (!loading) {
      setOnboardingStatus({ completed: false, skipped: false, isLoading: false });
    }
  }, [user, loading]);

  if (loading || onboardingStatus.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login with the intended destination
    return <Navigate to="/log-in" state={{ from: location }} replace />;
  }

  // If onboarding not completed and not skipped, redirect to onboarding
  if (!onboardingStatus.completed && !onboardingStatus.skipped) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
