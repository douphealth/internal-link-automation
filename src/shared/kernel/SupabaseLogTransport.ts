/**
 * Supabase analytics transport for the structured logger.
 * Buffers warn/error/fatal entries and flushes to analytics_events in batches.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger, type LogEntry } from './Logger';

const LOG_BUFFER: LogEntry[] = [];
const FLUSH_INTERVAL = 5_000;
const MAX_BUFFER_SIZE = 50;

async function flushLogs(): Promise<void> {
  if (LOG_BUFFER.length === 0) return;

  const batch = LOG_BUFFER.splice(0, MAX_BUFFER_SIZE);

  const { error } = await supabase
    .from('analytics_events')
    .insert(
      batch.map(entry => ({
        event_type: `log:${entry.level}`,
        payload: entry as unknown as Record<string, unknown>,
      }))
    );

  if (error) {
    console.error('[LogTransport] Failed to flush logs:', error.message);
    if (LOG_BUFFER.length < 500) {
      LOG_BUFFER.unshift(...batch);
    }
  }
}

let flushInterval: ReturnType<typeof setInterval> | null = null;

export function enableSupabaseLogging(): void {
  logger.addTransport((entry) => {
    if (['warn', 'error', 'fatal'].includes(entry.level)) {
      LOG_BUFFER.push(entry);
      if (LOG_BUFFER.length >= MAX_BUFFER_SIZE) {
        flushLogs();
      }
    }
  });

  if (!flushInterval) {
    flushInterval = setInterval(flushLogs, FLUSH_INTERVAL);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      if (LOG_BUFFER.length > 0) {
        flushLogs();
      }
    });
  }
}
