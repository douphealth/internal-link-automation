/**
 * Enhanced retry with exponential backoff, jitter, and Result integration.
 */

import { Result, Err, isOk } from './Result';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableCheck?: (error: unknown) => boolean;
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

export interface RetryExhaustedError {
  type: 'RETRY_EXHAUSTED';
  message: string;
  lastError: unknown;
  attempts: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
  jitter: true,
};

function computeDelay(attempt: number, config: RetryConfig): number {
  const exponential = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  const capped = Math.min(exponential, config.maxDelayMs);
  return config.jitter ? Math.random() * capped : capped;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T, E>(
  fn: () => Promise<Result<T, E>>,
  config?: Partial<RetryConfig>
): Promise<Result<T, E | RetryExhaustedError>> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  let lastError: E | undefined;

  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    const result = await fn();

    if (isOk(result)) return result;

    lastError = result.error;

    if (cfg.retryableCheck && !cfg.retryableCheck(result.error)) {
      return result;
    }

    if (attempt < cfg.maxAttempts) {
      const delayMs = computeDelay(attempt, cfg);
      cfg.onRetry?.(attempt, delayMs, result.error);
      await sleep(delayMs);
    }
  }

  return Err({
    type: 'RETRY_EXHAUSTED' as const,
    message: `All ${cfg.maxAttempts} attempts failed`,
    lastError,
    attempts: cfg.maxAttempts,
  } as unknown as E | RetryExhaustedError);
}
