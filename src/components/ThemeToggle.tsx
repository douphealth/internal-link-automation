import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function ThemeToggle({ variant = 'icon' }: { variant?: 'icon' | 'full' }) {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark') || 
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  // Initialize on mount
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') {
      document.documentElement.classList.add('dark');
      setDark(true);
    } else if (stored === 'light') {
      document.documentElement.classList.remove('dark');
      setDark(false);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
      setDark(true);
    }
  }, []);

  if (variant === 'full') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDark(d => !d)}
        className="w-full justify-start gap-2 text-[13px] text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground px-3 py-2.5 h-auto rounded-xl"
      >
        {dark ? <Sun className="h-[17px] w-[17px] text-sidebar-foreground/60" /> : <Moon className="h-[17px] w-[17px] text-sidebar-foreground/60" />}
        {dark ? 'Light Mode' : 'Dark Mode'}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setDark(d => !d)}
      className="h-9 w-9 rounded-xl"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
