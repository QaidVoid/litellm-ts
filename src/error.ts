/**
 * The error variant returned by every public SDK call. Discriminated by
 * `kind` so consumers can `switch` exhaustively and recover differently per
 * cause.
 */
export type ApiError =
  | NetworkError
  | HttpError
  | ValidationError
  | StreamError
  | AuthError
  | TimeoutError
  | RateLimitedError;

/** The set of `kind` discriminants on `ApiError`. */
export type ApiErrorKind = ApiError["kind"];

/** A `fetch`-level failure: DNS, TCP, TLS, or the runtime threw before a response landed. */
export type NetworkError = {
  readonly kind: "network";
  readonly cause: unknown;
  readonly message: string;
};

/** A non-2xx HTTP response. `body` is the raw parsed payload. */
export type HttpError = {
  readonly kind: "http";
  readonly status: number;
  readonly statusText: string;
  readonly body: unknown;
  readonly requestId?: string;
};

/** A response that did not match the expected shape. */
export type ValidationError = {
  readonly kind: "validation";
  readonly path: string;
  readonly expected: string;
  readonly got: unknown;
};

/** A streaming-mode failure. `reason` distinguishes parse, abort, and connection loss. */
export type StreamError = {
  readonly kind: "stream";
  readonly reason: "parse" | "abort" | "connection";
  readonly cause?: unknown;
};

/** An authentication or authorization failure. */
export type AuthError = {
  readonly kind: "auth";
  readonly reason: "missing" | "invalid" | "expired" | "forbidden";
  readonly status?: number;
};

/** A request that exceeded its time budget. */
export type TimeoutError = {
  readonly kind: "timeout";
  readonly ms: number;
};

/** A 429 response. `retryAfterMs` carries the parsed `Retry-After` header when present. */
export type RateLimitedError = {
  readonly kind: "rate-limited";
  readonly status: 429;
  readonly retryAfterMs?: number;
};

/** Construct a `NetworkError`. */
export const networkError = (cause: unknown, message: string): NetworkError => ({
  kind: "network",
  cause,
  message,
});

/** Construct an `HttpError`. */
export const httpError = (opts: {
  status: number;
  statusText: string;
  body: unknown;
  requestId?: string;
}): HttpError => {
  const base: HttpError = {
    kind: "http",
    status: opts.status,
    statusText: opts.statusText,
    body: opts.body,
  };
  return opts.requestId === undefined ? base : { ...base, requestId: opts.requestId };
};

/** Construct a `ValidationError`. */
export const validationError = (opts: {
  path: string;
  expected: string;
  got: unknown;
}): ValidationError => ({
  kind: "validation",
  path: opts.path,
  expected: opts.expected,
  got: opts.got,
});

/** Construct a `StreamError`. */
export const streamError = (opts: {
  reason: StreamError["reason"];
  cause?: unknown;
}): StreamError => {
  const base: StreamError = { kind: "stream", reason: opts.reason };
  return opts.cause === undefined ? base : { ...base, cause: opts.cause };
};

/** Construct an `AuthError`. */
export const authError = (opts: {
  reason: AuthError["reason"];
  status?: number;
}): AuthError => {
  const base: AuthError = { kind: "auth", reason: opts.reason };
  return opts.status === undefined ? base : { ...base, status: opts.status };
};

/** Construct a `TimeoutError`. */
export const timeoutError = (ms: number): TimeoutError => ({
  kind: "timeout",
  ms,
});

/** Construct a `RateLimitedError`. Status is always 429. */
export const rateLimitedError = (opts: {
  retryAfterMs?: number;
}): RateLimitedError => {
  const base: RateLimitedError = { kind: "rate-limited", status: 429 };
  return opts.retryAfterMs === undefined ? base : { ...base, retryAfterMs: opts.retryAfterMs };
};
