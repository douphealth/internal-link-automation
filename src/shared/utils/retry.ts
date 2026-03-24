/**
 * Retry utility with exponential backoff and jitter.
 * Used across services for resilient API calls.
 */

import { Result, Ok, Err } from '@/shared/kernel/Result';
import { BATCH_CONFIG } from '@/shared/config/constants';

export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Base delay in ms (default: 1000) */
  baseDelay?: number;
  /** Maximum delay cap in ms (default: 30000) */
  maxDelay?: number;
  /** Whether to add jitter (default: true) */
  jitter?: boolean;
  /** Optional predicate to decide if error is retryable */
  isRetryable?: (error: unknown) => boolean;
}

/**
 * Execute an async function with retry logic.
 * Uses exponential backoff with optional jitter.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<Result<T, Error>> {
  const {
    maxAttempts = BATCH_CONFIG.MAX_RETRIES,
    baseDelay = BATCH_CONFIG.RETRY_BASE_DELAY_MS,
    maxDelay = 30_000,
    jitter = true,
    isRetryable = () => true,
  } = options;

  let lastError: Error = new Error('No attempts made');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      return Ok(result);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === maxAttempts || !isRetryable(err)) {
        return Err(lastError);
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      const finalDelay = jitter
        ? delay * (0.5 + Math.random() * 0.5)
        : delay;

      await sleep(finalDelay);
    }
  }

  return Err(lastError);
}

/** Promise-based sleep */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
