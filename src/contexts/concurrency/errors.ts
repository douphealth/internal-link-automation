export type ConcurrencyError =
  | { type: 'POOL_EXHAUSTED'; message: string }
  | { type: 'TASK_TIMEOUT'; message: string; taskId: string }
  | { type: 'WORKER_CRASH'; message: string; workerId: string }
  | { type: 'BACKPRESSURE'; message: string; queueSize: number }
  | { type: 'TASK_CANCELLED'; message: string; taskId: string };
