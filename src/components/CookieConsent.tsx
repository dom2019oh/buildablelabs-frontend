import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Small delay before showing popup
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
  };

  const declineCookies = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-zinc-800 border border-zinc-700 rounded-xl p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              We use cookies
            </h3>
            <p className="text-zinc-300 text-sm mb-4">
              We use cookies to enhance your browsing experience, analyze site traffic, and personalize content. 
              By clicking "Accept All", you consent to our use of cookies. Read our{' '}
              <Link to="/privacy" className="text-purple-400 hover:text-purple-300 underline">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link to="/terms" className="text-purple-400 hover:text-purple-300 underline">
                Terms of Service
              </Link>{' '}
              for more information.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={acceptCookies}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Accept All
              </Button>
              <Button 
                onClick={declineCookies}
                variant="outline"
                className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white"
              >
                Decline
              </Button>
            </div>
          </div>
          <button 
            onClick={declineCookies}
            className="text-zinc-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
