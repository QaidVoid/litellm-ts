/**
 * A value that is either a success (`ok: true`) carrying a `T`, or a failure
 * (`ok: false`) carrying an `E`. The SDK returns a `Result` at every public
 * boundary so callers handle errors as values instead of catching thrown
 * exceptions.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Build a successful `Result` carrying `value`. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** Build a failed `Result` carrying `error`. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Type guard narrowing a `Result` to its successful variant. */
export const isOk = <T, E>(
  r: Result<T, E>,
): r is { readonly ok: true; readonly value: T } => r.ok;

/** Type guard narrowing a `Result` to its failed variant. */
export const isErr = <T, E>(
  r: Result<T, E>,
): r is { readonly ok: false; readonly error: E } => !r.ok;

/** Transform the success value. The failure variant passes through unchanged. */
export const map = <T, U, E>(
  r: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> => (r.ok ? ok(fn(r.value)) : r);

/** Transform the failure value. The success variant passes through unchanged. */
export const mapErr = <T, E, F>(
  r: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> => (r.ok ? r : err(fn(r.error)));

/** Chain a `Result`-returning function on success. Short-circuits on failure. */
export const andThen = <T, U, E>(
  r: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> => (r.ok ? fn(r.value) : r);

/** Return the success value or fall back to `defaultValue` on failure. */
export const unwrapOr = <T, E>(
  r: Result<T, E>,
  defaultValue: T,
): T => (r.ok ? r.value : defaultValue);

/** Pattern-match a `Result` against handlers for each variant. */
export const match = <T, E, R>(
  r: Result<T, E>,
  handlers: { ok: (value: T) => R; err: (error: E) => R },
): R => (r.ok ? handlers.ok(r.value) : handlers.err(r.error));

/**
 * Run an async function and capture any thrown error as the failure variant.
 * The error is typed `unknown`; callers convert it to a domain error at the
 * boundary they own.
 */
export const tryAsync = async <T>(
  fn: () => Promise<T>,
): Promise<Result<T, unknown>> => {
  try {
    return ok(await fn());
  } catch (caught) {
    return err(caught);
  }
};

/** Synchronous counterpart to `tryAsync`. */
export const trySync = <T>(fn: () => T): Result<T, unknown> => {
  try {
    return ok(fn());
  } catch (caught) {
    return err(caught);
  }
};
