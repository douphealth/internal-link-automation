/**
 * Circuit Breaker pattern for resilient service calls.
 * States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (probing).
 */

import { Result, Ok, Err } from './Result';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** How long to stay open before probing (ms) */
  resetTimeoutMs: number;
  /** Max probe attempts in half-open state */
  halfOpenMaxAttempts: number;
  /** Sliding window for failure counting (ms) */
  monitorWindowMs: number;
}

export interface CircuitMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  totalRequests: number;
  openedAt: number | null;
}

export type CircuitBreakerError =
  | { type: 'CIRCUIT_OPEN'; message: string; openedAt: number; retryAfterMs: number }
  | { type: 'CIRCUIT_HALF_OPEN_EXHAUSTED'; message: string }
  | { type: 'CIRCUIT_EXECUTION_ERROR'; message: string };

export class CircuitBreaker<T, E> {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailureAt: number | null = null;
  private lastSuccessAt: number | null = null;
  private openedAt: number | null = null;
  private halfOpenAttempts = 0;
  private totalRequests = 0;
  private failureTimestamps: number[] = [];

  private readonly config: CircuitBreakerConfig;
  private readonly name: string;

  constructor(name: string, config?: Partial<CircuitBreakerConfig>) {
    this.name = name;
    this.config = {
      failureThreshold: 5,
      resetTimeoutMs: 30_000,
      halfOpenMaxAttempts: 3,
      monitorWindowMs: 60_000,
      ...config,
    };
  }

  async execute(
    fn: () => Promise<Result<T, E>>,
    fallback?: () => Promise<Result<T, E>>
  ): Promise<Result<T, E | CircuitBreakerError>> {
    this.totalRequests++;

    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('HALF_OPEN');
      } else {
        console.warn(`[CircuitBreaker:${this.name}] OPEN — rejecting request`);
        if (fallback) return fallback();
        return Err({
          type: 'CIRCUIT_OPEN' as const,
          message: `Circuit breaker "${this.name}" is OPEN. Try again later.`,
          openedAt: this.openedAt!,
          retryAfterMs: this.config.resetTimeoutMs - (Date.now() - this.openedAt!),
        });
      }
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
      if (fallback) return fallback();
      return Err({
        type: 'CIRCUIT_HALF_OPEN_EXHAUSTED' as const,
        message: `Circuit breaker "${this.name}" half-open attempts exhausted.`,
      });
    }

    if (this.state === 'HALF_OPEN') this.halfOpenAttempts++;

    try {
      const result = await fn();

      if (result.ok) {
        this.onSuccess();
      } else {
        this.onFailure();
      }
      return result;
    } catch (e) {
      this.onFailure();
      return Err({
        type: 'CIRCUIT_EXECUTION_ERROR' as const,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.lastSuccessAt = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.transitionTo('CLOSED');
      this.reset();
      console.info(`[CircuitBreaker:${this.name}] HALF_OPEN → CLOSED (recovered)`);
    }
  }

  private onFailure(): void {
    const now = Date.now();
    this.failures++;
    this.lastFailureAt = now;
    this.failureTimestamps.push(now);

    const windowStart = now - this.config.monitorWindowMs;
    this.failureTimestamps = this.failureTimestamps.filter(t => t > windowStart);

    if (this.failureTimestamps.length >= this.config.failureThreshold) {
      this.transitionTo('OPEN');
      console.error(
        `[CircuitBreaker:${this.name}] CLOSED → OPEN ` +
        `(${this.failureTimestamps.length} failures in ${this.config.monitorWindowMs}ms window)`
      );
    }
  }

  private transitionTo(newState: CircuitState): void {
    this.state = newState;
    if (newState === 'OPEN') {
      this.openedAt = Date.now();
      this.halfOpenAttempts = 0;
    }
    if (newState === 'CLOSED') {
      this.openedAt = null;
    }
  }

  private shouldAttemptReset(): boolean {
    return this.openedAt !== null &&
      Date.now() - this.openedAt >= this.config.resetTimeoutMs;
  }

  private reset(): void {
    this.failures = 0;
    this.failureTimestamps = [];
    this.halfOpenAttempts = 0;
  }

  get metrics(): CircuitMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      totalRequests: this.totalRequests,
      openedAt: this.openedAt,
    };
  }
}
