import { describe, it, expect } from 'vitest';
import { CircuitBreaker } from '@/shared/kernel/CircuitBreaker';
import { Ok, Err, isErr } from '@/shared/kernel/Result';

describe('CircuitBreaker', () => {
  it('starts in CLOSED state', () => {
    const cb = new CircuitBreaker('test');
    expect(cb.metrics.state).toBe('CLOSED');
  });

  it('passes through successful calls', async () => {
    const cb = new CircuitBreaker('test');
    const result = await cb.execute(() => Promise.resolve(Ok(42)));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(42);
  });

  it('opens after failure threshold', async () => {
    const cb = new CircuitBreaker<number, string>('test', {
      failureThreshold: 3,
      monitorWindowMs: 60_000,
      resetTimeoutMs: 30_000,
    });

    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.resolve(Err('fail')));
    }

    expect(cb.metrics.state).toBe('OPEN');
  });

  it('rejects calls when OPEN', async () => {
    const cb = new CircuitBreaker<number, string>('test', {
      failureThreshold: 2,
      monitorWindowMs: 60_000,
      resetTimeoutMs: 60_000,
    });

    await cb.execute(() => Promise.resolve(Err('fail')));
    await cb.execute(() => Promise.resolve(Err('fail')));

    const result = await cb.execute(() => Promise.resolve(Ok(1)));
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect((result.error as { type: string }).type).toBe('CIRCUIT_OPEN');
    }
  });

  it('uses fallback when OPEN', async () => {
    const cb = new CircuitBreaker<number, string>('test', {
      failureThreshold: 2,
      monitorWindowMs: 60_000,
      resetTimeoutMs: 60_000,
    });

    await cb.execute(() => Promise.resolve(Err('fail')));
    await cb.execute(() => Promise.resolve(Err('fail')));

    const result = await cb.execute(
      () => Promise.resolve(Ok(1)),
      () => Promise.resolve(Ok(-1))
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe(-1);
  });

  it('tracks metrics correctly', async () => {
    const cb = new CircuitBreaker('test');
    await cb.execute(() => Promise.resolve(Ok(1)));
    await cb.execute(() => Promise.resolve(Ok(2)));

    expect(cb.metrics.totalRequests).toBe(2);
    expect(cb.metrics.successes).toBe(2);
    expect(cb.metrics.failures).toBe(0);
  });
});
