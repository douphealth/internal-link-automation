import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff } from '@/shared/kernel/Retry';
import { Ok, Err, isOk, isErr } from '@/shared/kernel/Result';

describe('retryWithBackoff', () => {
  it('returns Ok on first success', async () => {
    const result = await retryWithBackoff(() => Promise.resolve(Ok(42)));
    expect(isOk(result)).toBe(true);
    if (result.ok) expect(result.value).toBe(42);
  });

  it('retries on failure then succeeds', async () => {
    let attempt = 0;
    const result = await retryWithBackoff(
      () => {
        attempt++;
        return Promise.resolve(attempt >= 2 ? Ok('done') : Err('not yet'));
      },
      { maxAttempts: 3, baseDelayMs: 10 }
    );
    expect(isOk(result)).toBe(true);
    expect(attempt).toBe(2);
  });

  it('returns RETRY_EXHAUSTED after max attempts', async () => {
    const result = await retryWithBackoff(
      () => Promise.resolve(Err('always fails')),
      { maxAttempts: 2, baseDelayMs: 10 }
    );
    expect(isErr(result)).toBe(true);
  });

  it('calls onRetry callback', async () => {
    const onRetry = vi.fn();
    await retryWithBackoff(
      () => Promise.resolve(Err('fail')),
      { maxAttempts: 3, baseDelayMs: 10, onRetry }
    );
    expect(onRetry).toHaveBeenCalledTimes(2);
  });
});
