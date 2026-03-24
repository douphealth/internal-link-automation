/**
 * Runtime type guards and assertion utilities.
 * Provides runtime validation complementing TypeScript's compile-time checks.
 */

/** Assert a condition, throwing with a descriptive message */
export function assert(
  condition: boolean,
  message: string
): asserts condition {
  if (!condition) {
    throw new Error(`[Assertion Failed] ${message}`);
  }
}

/** Assert a value is not null or undefined */
export function assertDefined<T>(
  value: T | null | undefined,
  name: string
): asserts value is T {
  if (value == null) {
    throw new Error(`[Assertion Failed] Expected "${name}" to be defined, got ${value}`);
  }
}

/** Guard: check if value is a non-empty string */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Guard: check if value is a positive integer */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/** Guard: check if value is a valid UUID v4 */
export function isUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Guard: check if value is a valid URL */
export function isValidURL(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Guard: check if a number is within a range */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/** Guard: check if value is a Float32Array */
export function isFloat32Array(value: unknown): value is Float32Array {
  return value instanceof Float32Array;
}
