/**
 * Realtime batch progress hook.
 * Subscribes to Supabase Realtime for live batch job updates.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BatchProgress } from '../types';

export function useRealtimeProgress(batchJobId: string | null) {
  const [progress, setProgress] = useState<BatchProgress | null>(null);

  useEffect(() => {
    if (!batchJobId) return;

    // Initial fetch
    supabase
      .from('batch_jobs')
      .select('*')
      .eq('id', batchJobId)
      .single()
      .then(({ data }) => {
        if (data) {
          setProgress({
            id: data.id,
            status: data.status as BatchProgress['status'],
            phase: data.phase as BatchProgress['phase'],
            progress: data.progress ?? 0,
            total: data.total ?? 0,
            error: data.error,
          });
        }
      });

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`batch-${batchJobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'batch_jobs',
          filter: `id=eq.${batchJobId}`,
        },
        (payload) => {
          const d = payload.new as Record<string, unknown>;
          setProgress({
            id: d.id as string,
            status: d.status as BatchProgress['status'],
            phase: d.phase as BatchProgress['phase'],
            progress: (d.progress as number) ?? 0,
            total: (d.total as number) ?? 0,
            error: d.error as string | null,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [batchJobId]);

  return {
    progress,
    isRunning: progress?.status === 'running',
    isComplete: progress?.status === 'complete',
    hasError: progress?.status === 'error',
    percentage:
      progress && progress.total > 0
        ? Math.round((progress.progress / progress.total) * 100)
        : 0,
  };
}
