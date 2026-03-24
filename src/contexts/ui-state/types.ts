/**
 * UI State context types.
 */

export type AppView = 'dashboard' | 'suggestions' | 'clusters' | 'analytics' | 'settings';
export type BatchPhase = 'init' | 'fetching' | 'embedding' | 'clustering' | 'suggesting' | 'applying' | 'done';
export type BatchStatus = 'idle' | 'running' | 'paused' | 'complete' | 'error';

export interface BatchProgress {
  readonly id: string;
  readonly status: BatchStatus;
  readonly phase: BatchPhase;
  readonly progress: number;
  readonly total: number;
  readonly error: string | null;
}

export interface Notification {
  readonly id: string;
  readonly type: 'info' | 'success' | 'warning' | 'error';
  readonly title: string;
  readonly message: string;
  readonly timestamp: number;
  readonly dismissed: boolean;
}
