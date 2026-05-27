import type { ApiError } from "./error.ts";
import { ApiErrorException } from "./error.ts";
import type { Result } from "./result.ts";

/**
 * Type-level transform that mirrors a `Result`-returning surface into
 * one that throws `ApiErrorException` on failure instead.
 *
 * Recursively maps every member:
 * - Methods returning `Promise<Result<V, ApiError>>` become `(...) => Promise<V>`
 * - Methods returning `AsyncIterable<Result<V, ApiError>>` become `AsyncIterable<V>`
 * - Nested namespaces are mapped recursively
 * - Everything else passes through unchanged
 */
export type Throws<T> = {
  readonly [K in keyof T]: T[K] extends (...args: infer A) => Promise<Result<infer V, ApiError>>
    ? (...args: A) => Promise<V>
    : T[K] extends (...args: infer A) => AsyncIterable<Result<infer V, ApiError>>
      ? (...args: A) => AsyncIterable<V>
    : T[K] extends object ? Throws<T[K]>
    : T[K];
};

const isResult = (
  v: unknown,
): v is Result<unknown, ApiError> =>
  typeof v === "object" && v !== null && "ok" in v &&
  typeof (v as { ok: unknown }).ok === "boolean";

const wrapAsyncIterable = <T>(
  source: AsyncIterable<Result<T, ApiError>>,
): AsyncIterable<T> => ({
  async *[Symbol.asyncIterator]() {
    for await (const r of source) {
      if (r.ok) yield r.value;
      else throw new ApiErrorException(r.error);
    }
  },
});

const wrapFn = (
  target: object,
  fn: (...args: unknown[]) => unknown,
): (...args: unknown[]) => unknown => {
  return (...args: unknown[]) => {
    const out = fn.apply(target, args);
    if (out instanceof Promise) {
      return out.then((v: unknown) => {
        if (isResult(v)) {
          if (v.ok) return v.value;
          throw new ApiErrorException(v.error);
        }
        return v;
      });
    }
    if (
      out !== null && typeof out === "object" &&
      Symbol.asyncIterator in out
    ) {
      return wrapAsyncIterable(
        out as AsyncIterable<Result<unknown, ApiError>>,
      );
    }
    return out;
  };
};

/**
 * Wrap an object so every method that returns `Result<T, ApiError>`
 * (either as a `Promise` or `AsyncIterable`) instead returns `T` and
 * throws `ApiErrorException` on failure. Sub-namespaces are wrapped
 * lazily on access so the wrapper is essentially free until used.
 *
 * The wrapper is referentially transparent: calling the wrapped method
 * runs the original on the original receiver, so closures and bound
 * `this` continue to work.
 */
export const makeThrows = <T extends object>(target: T): Throws<T> => {
  const cache = new WeakMap<object, unknown>();
  const handler: ProxyHandler<object> = {
    get(t, prop, receiver) {
      const value = Reflect.get(t, prop, receiver);
      if (typeof value === "function") {
        return wrapFn(t, value as (...args: unknown[]) => unknown);
      }
      if (value !== null && typeof value === "object") {
        const cached = cache.get(value);
        if (cached !== undefined) return cached;
        const wrapped = new Proxy(value, handler);
        cache.set(value, wrapped);
        return wrapped;
      }
      return value;
    },
  };
  return new Proxy(target, handler) as Throws<T>;
};
