import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-gradient-to-b from-card/80 to-muted/30 py-14 sm:py-20 px-6 text-center"
    >
      <div className="mb-5 rounded-2xl bg-muted/80 p-4 ring-1 ring-border/50">
        <Icon className="h-7 w-7 text-muted-foreground/60" />
      </div>
      <h3 className="text-base sm:text-lg font-bold">{title}</h3>
      <p className="mt-1.5 text-[13px] text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}