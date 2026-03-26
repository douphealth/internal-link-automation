import { describe, it, expect } from 'vitest';
import { withTimeout } from '@/shared/kernel/Timeout';
import { Ok, isOk, isErr, Result } from '@/shared/kernel/Result';

describe('withTimeout', () => {
  it('returns result when operation completes in time', async () => {
    const result = await withTimeout(
      () => Promise.resolve(Ok(42)),
      1000,
      'fast op'
    );
    expect(isOk(result) ? result.value : undefined).toBe(42);
  });

  it('returns timeout error when operation exceeds limit', async () => {
    const result = await withTimeout(
      (): Promise<Result<number, string>> =>
        new Promise((resolve) => setTimeout(() => resolve(Ok(42)), 500)),
      50,
      'slow op'
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect((result.error as { type: string }).type).toBe('TIMEOUT');
    }
  });
});
