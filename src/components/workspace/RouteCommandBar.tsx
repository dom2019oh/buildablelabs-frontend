import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RouteCommandBarProps {
  currentRoute: string;
  onRouteChange: (route: string) => void;
  availableRoutes: string[];
}

export default function RouteCommandBar({
  currentRoute,
  onRouteChange,
  availableRoutes,
}: RouteCommandBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(currentRoute);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter routes based on input
  const filteredRoutes = availableRoutes.filter((route) =>
    route.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Update input when currentRoute changes externally
  useEffect(() => {
    setInputValue(currentRoute);
  }, [currentRoute]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredRoutes.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredRoutes[highlightedIndex]) {
          onRouteChange(filteredRoutes[highlightedIndex]);
          setInputValue(filteredRoutes[highlightedIndex]);
        } else if (inputValue) {
          onRouteChange(inputValue);
        }
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case 'Escape':
        setIsOpen(false);
        setInputValue(currentRoute);
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    setHighlightedIndex(0);
    if (value.startsWith('/') || value === '') {
      setIsOpen(true);
    }
  };

  const handleSelectRoute = (route: string) => {
    onRouteChange(route);
    setInputValue(route);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center bg-muted/50 rounded-lg border border-border/50 focus-within:border-border focus-within:ring-1 focus-within:ring-ring/20">
        <Search className="h-4 w-4 ml-3 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="/"
          className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
        </button>
      </div>

      {isOpen && filteredRoutes.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-auto"
        >
          {filteredRoutes.map((route, index) => (
            <button
              key={route}
              type="button"
              onClick={() => handleSelectRoute(route)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors',
                index === highlightedIndex && 'bg-muted',
                route === currentRoute && 'text-primary font-medium'
              )}
            >
              {route}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
