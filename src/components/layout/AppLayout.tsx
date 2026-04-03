import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Globe, Link2, BarChart3, Settings, Menu, Zap, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sites', icon: Globe, label: 'Sites' },
  { to: '/suggestions', icon: Link2, label: 'Suggestions' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/50">
        Navigation
      </p>
      {navItems.map(({ to, icon: Icon, label }) => {
        const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
              isActive
                ? 'bg-sidebar-primary/10 text-sidebar-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="nav-active"
                className="absolute inset-0 rounded-xl bg-sidebar-primary/10 border border-sidebar-primary/20"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
              />
            )}
            <Icon className={cn(
              'relative z-10 h-[17px] w-[17px] shrink-0 transition-colors duration-200',
              isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground'
            )} />
            <span className="relative z-10">{label}</span>
            {isActive && (
              <div className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary shadow-glow" />
            )}
          </Link>
        );
      })}
      <div className="pt-2">
        <ThemeToggle variant="full" />
      </div>
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border/50">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-primary/20 to-sidebar-primary/5 border border-sidebar-primary/10">
          <Zap className="h-4.5 w-4.5 text-sidebar-primary" />
          <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-success border-2 border-sidebar-background" />
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-extrabold text-sidebar-accent-foreground tracking-tight leading-none">
            LinkForge
          </span>
          <span className="text-[9px] text-sidebar-primary font-semibold uppercase tracking-[0.15em] mt-0.5">
            Enterprise
          </span>
        </div>
      </div>

      <SidebarNav onNavigate={onNavigate} />

      {/* Pro card */}
      <div className="mt-auto p-4">
        <div className="rounded-xl bg-gradient-to-br from-sidebar-primary/8 to-sidebar-accent/60 border border-sidebar-border/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-5 rounded-md bg-sidebar-primary/15 flex items-center justify-center">
              <Zap className="h-3 w-3 text-sidebar-primary" />
            </div>
            <p className="text-[11px] font-bold text-sidebar-accent-foreground">
              Quick Start
            </p>
          </div>
          <p className="text-[11px] text-sidebar-foreground leading-relaxed">
            Add a site to start discovering link opportunities with AI.
          </p>
          <Link to="/sites">
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 h-7 w-full text-[11px] font-semibold text-sidebar-primary hover:bg-sidebar-primary/10 justify-between group"
            >
              Add Your First Site
              <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col bg-sidebar border-r border-sidebar-border/50 lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border/50 bg-card/80 glass px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-extrabold tracking-tight">LinkForge</span>
          </div>
        </div>
        <ThemeToggle variant="icon" />
      </header>

      {/* Mobile sidebar sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-sidebar border-sidebar-border/50">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="lg:pl-[260px]">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
          <AnimatePresence mode="wait">
            <Outlet />
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
