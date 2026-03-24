/**
 * Concurrency context types.
 * Defines worker pool and task scheduling interfaces.
 */

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';
export type TaskStatus = 'queued' | 'running' | 'complete' | 'error' | 'cancelled';

export interface WorkerTask<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  readonly type: string;
  readonly priority: TaskPriority;
  readonly input: TInput;
  readonly status: TaskStatus;
  readonly result?: TOutput;
  readonly error?: string;
  readonly createdAt: number;
  readonly startedAt?: number;
  readonly completedAt?: number;
}

export interface WorkerInfo {
  readonly id: string;
  readonly status: 'idle' | 'busy' | 'terminated';
  readonly currentTaskId: string | null;
  readonly tasksCompleted: number;
}

export interface PoolStats {
  readonly totalWorkers: number;
  readonly busyWorkers: number;
  readonly idleWorkers: number;
  readonly queuedTasks: number;
  readonly completedTasks: number;
  readonly failedTasks: number;
}

export interface BackpressureConfig {
  readonly maxQueueSize: number;
  readonly highWaterMark: number;
  readonly lowWaterMark: number;
}
