/**
 * Timeout wrapper for async operations.
 * Returns a Result-based timeout error instead of throwing.
 */

import { Result, Err } from './Result';

export interface TimeoutError {
  type: 'TIMEOUT';
  message: string;
  timeoutMs: number;
}

export async function withTimeout<T, E>(
  fn: () => Promise<Result<T, E>>,
  timeoutMs: number,
  label: string = 'Operation'
): Promise<Result<T, E | TimeoutError>> {
  return Promise.race([
    fn(),
    new Promise<Result<never, TimeoutError>>((resolve) =>
      setTimeout(
        () =>
          resolve(
            Err({
              type: 'TIMEOUT',
              message: `${label} timed out after ${timeoutMs}ms`,
              timeoutMs,
            })
          ),
        timeoutMs
      )
    ),
  ]);
}
