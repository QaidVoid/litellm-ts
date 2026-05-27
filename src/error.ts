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
  /** Original thrown value from the runtime. Inspect with `instanceof` or tag checks. */
  readonly cause: unknown;
  /** Short human-readable summary suitable for logs. */
  readonly message: string;
};

/** A non-2xx HTTP response. */
export type HttpError = {
  readonly kind: "http";
  /** HTTP status code (4xx or 5xx). */
  readonly status: number;
  /** Reason phrase from the response line. */
  readonly statusText: string;
  /** Parsed JSON body, or the raw text when the body is not JSON. */
  readonly body: unknown;
  /** Server-assigned request identifier (from `x-request-id` or `x-litellm-call-id`). */
  readonly requestId?: string;
};

/** A response that did not match the expected shape. */
export type ValidationError = {
  readonly kind: "validation";
  /** JSON pointer or dotted path of the offending field. */
  readonly path: string;
  /** Human-readable description of the expected type. */
  readonly expected: string;
  /** The value as received. */
  readonly got: unknown;
};

/** A streaming-mode failure. `reason` distinguishes parse, abort, and connection loss. */
export type StreamError = {
  readonly kind: "stream";
  /** What went wrong while consuming the stream. */
  readonly reason: "parse" | "abort" | "connection";
  /** Optional underlying error for debugging. */
  readonly cause?: unknown;
};

/** An authentication or authorization failure. */
export type AuthError = {
  readonly kind: "auth";
  /** Why the request was rejected. `missing` is client-side; the rest mirror server responses. */
  readonly reason: "missing" | "invalid" | "expired" | "forbidden";
  /** HTTP status (401 for `invalid`/`expired`, 403 for `forbidden`). Absent for `missing`. */
  readonly status?: number;
  /**
   * Parsed response body when available. Useful for distinguishing a proxy
   * rejecting the SDK key from an upstream provider rejecting the proxy's
   * key, since LiteLLM forwards upstream 401s verbatim.
   */
  readonly body?: unknown;
};

/** A request that exceeded its time budget. */
export type TimeoutError = {
  readonly kind: "timeout";
  /** Configured timeout in milliseconds. */
  readonly ms: number;
};

/** A 429 response. `retryAfterMs` carries the parsed `Retry-After` header when present. */
export type RateLimitedError = {
  readonly kind: "rate-limited";
  readonly status: 429;
  /** Milliseconds the upstream asks the caller to wait before retrying. */
  readonly retryAfterMs?: number;
};

/**
 * Render an `ApiError` as a single-line human-readable string. Useful for
 * logs and `toString` fallbacks; structured access still goes through the
 * discriminated union.
 */
export const formatApiError = (err: ApiError): string => {
  switch (err.kind) {
    case "network":
      return `NetworkError: ${err.message}`;
    case "http": {
      const rid = err.requestId === undefined ? "" : ` (requestId=${err.requestId})`;
      return `HttpError ${err.status} ${err.statusText}${rid}`;
    }
    case "validation":
      return `ValidationError at ${err.path}: expected ${err.expected}`;
    case "stream": {
      const cause = err.cause === undefined ? "" : ` (cause=${String(err.cause)})`;
      return `StreamError: ${err.reason}${cause}`;
    }
    case "auth": {
      const status = err.status === undefined ? "" : ` status=${err.status}`;
      return `AuthError: ${err.reason}${status}`;
    }
    case "timeout":
      return `TimeoutError: exceeded ${err.ms}ms`;
    case "rate-limited": {
      const retry = err.retryAfterMs === undefined ? "" : ` retry-after=${err.retryAfterMs}ms`;
      return `RateLimitedError: 429${retry}`;
    }
  }
};

const inspectSymbol = Symbol.for("Deno.customInspect");
const nodeInspectSymbol = Symbol.for("nodejs.util.inspect.custom");

const withInspect = <T extends ApiError>(err: T): T => {
  const fmt = () => formatApiError(err);
  Object.defineProperty(err, "toString", { value: fmt, enumerable: false });
  Object.defineProperty(err, inspectSymbol, { value: fmt, enumerable: false });
  Object.defineProperty(err, nodeInspectSymbol, { value: fmt, enumerable: false });
  return err;
};

/** Construct a `NetworkError`. */
export const networkError = (cause: unknown, message: string): NetworkError =>
  withInspect({ kind: "network", cause, message });

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
  return withInspect(
    opts.requestId === undefined ? base : { ...base, requestId: opts.requestId },
  );
};

/** Construct a `ValidationError`. */
export const validationError = (opts: {
  path: string;
  expected: string;
  got: unknown;
}): ValidationError =>
  withInspect({
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
  return withInspect(opts.cause === undefined ? base : { ...base, cause: opts.cause });
};

/** Construct an `AuthError`. */
export const authError = (opts: {
  reason: AuthError["reason"];
  status?: number;
  body?: unknown;
}): AuthError => {
  let e: AuthError = { kind: "auth", reason: opts.reason };
  if (opts.status !== undefined) e = { ...e, status: opts.status };
  if (opts.body !== undefined) e = { ...e, body: opts.body };
  return withInspect(e);
};

/** Construct a `TimeoutError`. */
export const timeoutError = (ms: number): TimeoutError => withInspect({ kind: "timeout", ms });

/** Construct a `RateLimitedError`. Status is always 429. */
export const rateLimitedError = (opts: {
  retryAfterMs?: number;
}): RateLimitedError => {
  const base: RateLimitedError = { kind: "rate-limited", status: 429 };
  return withInspect(
    opts.retryAfterMs === undefined ? base : { ...base, retryAfterMs: opts.retryAfterMs },
  );
};
