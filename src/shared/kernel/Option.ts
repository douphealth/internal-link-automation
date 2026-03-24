/**
 * Option type for explicit nullable value handling.
 * Replaces null/undefined checks with type-safe operations.
 *
 * @template T - The wrapped value type
 */

export type Option<T> =
  | { readonly some: true; readonly value: T }
  | { readonly some: false };

/** Create a Some option */
export function Some<T>(value: T): Option<T> {
  return { some: true, value };
}

/** Create a None option */
export function None<T = never>(): Option<T> {
  return { some: false };
}

/** Convert a nullable value to an Option */
export function fromNullable<T>(value: T | null | undefined): Option<T> {
  return value != null ? Some(value) : None();
}

/** Unwrap an Option or throw */
export function unwrapOption<T>(option: Option<T>): T {
  if (option.some) return option.value;
  throw new Error('Unwrap called on None');
}

/** Unwrap an Option with a default value */
export function unwrapOptionOr<T>(option: Option<T>, defaultValue: T): T {
  return option.some ? option.value : defaultValue;
}

/** Map the value inside an Option */
export function mapOption<T, U>(
  option: Option<T>,
  fn: (value: T) => U
): Option<U> {
  return option.some ? Some(fn(option.value)) : None();
}

/** FlatMap for Options */
export function flatMapOption<T, U>(
  option: Option<T>,
  fn: (value: T) => Option<U>
): Option<U> {
  return option.some ? fn(option.value) : None();
}

/** Check if an Option is Some */
export function isSome<T>(option: Option<T>): option is { some: true; value: T } {
  return option.some;
}

/** Check if an Option is None */
export function isNone<T>(option: Option<T>): option is { some: false } {
  return !option.some;
}
