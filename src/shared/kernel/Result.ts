/**
 * Monadic Result type for type-safe error handling.
 * Eliminates thrown exceptions in the service layer.
 *
 * @template T - Success value type
 * @template E - Error value type
 */

export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Create a success Result */
export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Create a failure Result */
export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Unwrap a Result, throwing if it's an error */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw new Error(`Unwrap called on Err: ${JSON.stringify(result.error)}`);
}

/** Unwrap a Result with a default value */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue;
}

/** Map the success value of a Result */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  return result.ok ? Ok(fn(result.value)) : result;
}

/** Map the error value of a Result */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  return result.ok ? result : Err(fn(result.error));
}

/** Chain Results (flatMap) */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}

/** Convert a Promise to a Result, catching any thrown errors */
export async function fromPromise<T>(
  promise: Promise<T>
): Promise<Result<T, Error>> {
  try {
    const value = await promise;
    return Ok(value);
  } catch (err) {
    return Err(err instanceof Error ? err : new Error(String(err)));
  }
}

/** Check if a Result is Ok */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

/** Check if a Result is Err */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}
