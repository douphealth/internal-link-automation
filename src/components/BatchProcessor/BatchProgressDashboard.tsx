import React from 'react';
import { useRealtimeProgress } from '@/contexts/ui-state/hooks/useRealtimeProgress';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  Database,
  Brain,
  Link,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BatchPhase } from '@/contexts/ui-state/types';

interface Props {
  batchJobId: string | null;
}

const PHASE_CONFIG: Record<BatchPhase, { icon: React.ReactNode; label: string }> = {
  init:       { icon: <Clock className="h-4 w-4" />,          label: 'Initializing' },
  fetching:   { icon: <Database className="h-4 w-4" />,       label: 'Fetching Posts' },
  embedding:  { icon: <Brain className="h-4 w-4" />,          label: 'Computing Embeddings' },
  clustering: { icon: <Zap className="h-4 w-4" />,            label: 'Clustering Content' },
  suggesting: { icon: <Link className="h-4 w-4" />,           label: 'Generating Suggestions' },
  applying:   { icon: <CheckCircle2 className="h-4 w-4" />,   label: 'Applying Links' },
  done:       { icon: <CheckCircle2 className="h-4 w-4" />,   label: 'Complete' },
};

const PHASES: BatchPhase[] = ['fetching', 'embedding', 'clustering', 'suggesting', 'applying', 'done'];

export function BatchProgressDashboard({ batchJobId }: Props) {
  const { progress, isRunning, isComplete, hasError, percentage } =
    useRealtimeProgress(batchJobId);

  if (!batchJobId || !progress) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Clock className="h-8 w-8 mb-3 opacity-40" />
          <p className="text-sm font-medium">No Active Batch</p>
          <p className="text-xs mt-1">Start a batch process to see real-time progress here.</p>
        </CardContent>
      </Card>
    );
  }

  const currentPhaseIndex = PHASES.indexOf(progress.phase as BatchPhase);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRunning && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            {isComplete && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {hasError && <AlertCircle className="h-4 w-4 text-destructive" />}
            <CardTitle className="text-base">Batch Processing</CardTitle>
          </div>
          <Badge variant={isComplete ? 'default' : hasError ? 'destructive' : 'secondary'}>
            {isComplete ? 'Complete' : hasError ? 'Error' : `${percentage}%`}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Overall Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Overall Progress</span>
            <span className="font-mono tabular-nums">{progress.progress} / {progress.total}</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>

        {/* Phase Timeline */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Pipeline Phases</p>
          <div className="space-y-1.5">
            {PHASES.map((phase, idx) => {
              const config = PHASE_CONFIG[phase];
              const isActive = phase === progress.phase;
              const isPast = idx < currentPhaseIndex;
              const isFuture = idx > currentPhaseIndex;

              return (
                <div
                  key={phase}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive && 'bg-primary/10 text-primary font-medium',
                    isPast && 'text-muted-foreground',
                    isFuture && 'text-muted-foreground/50'
                  )}
                >
                  <span className={cn(isPast && 'text-green-500', isActive && 'text-primary')}>
                    {isPast ? <CheckCircle2 className="h-4 w-4" /> : isActive ? <Loader2 className="h-4 w-4 animate-spin" /> : config.icon}
                  </span>
                  <span className="flex-1">{config.label}</span>
                  {isPast && <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">Done</Badge>}
                  {isActive && <Badge variant="outline" className="text-[10px] text-primary border-primary/20">Running</Badge>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {hasError && progress.error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Processing Error</p>
                <p className="text-xs text-destructive/80 mt-0.5">{progress.error}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
