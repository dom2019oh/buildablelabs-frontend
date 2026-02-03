import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 30 days in seconds
const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
    }
  };

  useEffect(() => {
    // Check if user wants to be remembered
    const rememberMe = localStorage.getItem('buildable_remember_me') === 'true';
    const sessionExpiry = localStorage.getItem('buildable_session_expiry');

    // Set up auth state listener BEFORE getting session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid Supabase client deadlock
          setTimeout(() => fetchProfile(session.user.id), 0);
          
          // If remember me is enabled, check if we need to refresh session
          if (rememberMe && event === 'TOKEN_REFRESHED') {
            // Extend the expiry on token refresh
            localStorage.setItem('buildable_session_expiry', 
              String(Date.now() + 30 * 24 * 60 * 60 * 1000)
            );
          }
        } else {
          setProfile(null);
          // Clear session expiry when logged out
          localStorage.removeItem('buildable_session_expiry');
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Check if the remember me session is still valid
      if (rememberMe && sessionExpiry) {
        const expiryTime = parseInt(sessionExpiry, 10);
        if (Date.now() > expiryTime) {
          // Session has expired, sign out
          supabase.auth.signOut();
          localStorage.removeItem('buildable_remember_me');
          localStorage.removeItem('buildable_session_expiry');
          setLoading(false);
          return;
        }
      }

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
        
        // Proactively refresh session if remember me is enabled
        if (rememberMe) {
          // Refresh session to keep it alive for 30 days
          supabase.auth.refreshSession().then(({ data }) => {
            if (data.session) {
              // Update expiry on successful refresh
              localStorage.setItem('buildable_session_expiry', 
                String(Date.now() + 30 * 24 * 60 * 60 * 1000)
              );
            }
          });
        }
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    localStorage.removeItem('buildable_remember_me');
    localStorage.removeItem('buildable_session_expiry');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
