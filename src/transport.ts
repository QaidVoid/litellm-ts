import type { ApiError } from "./error.ts";
import {
  authError,
  httpError,
  networkError,
  rateLimitedError,
  timeoutError,
  validationError,
} from "./error.ts";
import type { Result } from "./result.ts";
import { err, ok, trySync } from "./result.ts";

/** HTTP methods the transport accepts. */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Configuration for `createTransport`. */
export interface TransportConfig {
  /** Base URL of the LiteLLM proxy or compatible endpoint. */
  readonly baseUrl: string;
  /** Bearer token (master key or virtual key). */
  readonly apiKey: string;
  /** Headers attached to every outgoing request. */
  readonly defaultHeaders?: Readonly<Record<string, string>>;
  /** Per-request timeout in milliseconds. Defaults to 60000. */
  readonly timeoutMs?: number;
  /** Number of additional attempts on retryable failures. Defaults to 1. */
  readonly maxRetries?: number;
  /** Custom fetch implementation. Defaults to `globalThis.fetch`. Injected for testing. */
  readonly fetch?: typeof fetch;
}

/** Options accepted by both `request` and `stream`. */
export interface RequestOptions {
  readonly method: HttpMethod;
  readonly path: string;
  readonly body?: unknown;
  readonly query?: Readonly<
    Record<string, string | number | boolean | readonly (string | number | boolean)[] | undefined>
  >;
  readonly headers?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
}

/** Constructed transport bound to a configuration. */
export interface Transport {
  /** Issue a request and parse the response body as JSON typed `TResp`. */
  request<TResp>(opts: RequestOptions): Promise<Result<TResp, ApiError>>;
  /**
   * Issue a request and return the raw response body as a stream. Sets
   * `accept: text/event-stream` and does not retry, because streaming
   * endpoints are not idempotent on resume.
   */
  stream(opts: RequestOptions): Promise<Result<ReadableStream<Uint8Array>, ApiError>>;
  /**
   * Issue a request and return the raw `Response`. No retry, no body parsing,
   * no extra headers beyond what the caller supplied (plus auth). Used by
   * endpoints that need full control over how the body is consumed.
   */
  fetchRaw(opts: RequestOptions): Promise<Result<Response, ApiError>>;
}

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 1;

const isRetryable = (e: ApiError): boolean =>
  e.kind === "network" ||
  e.kind === "rate-limited" ||
  (e.kind === "http" && e.status >= 500 && e.status < 600);

const computeBackoffMs = (attempt: number, error: ApiError): number => {
  if (error.kind === "rate-limited" && error.retryAfterMs !== undefined) {
    return error.retryAfterMs;
  }
  const exponential = Math.min(500 * 2 ** attempt, 5000);
  const jitter = Math.random() * 200;
  return exponential + jitter;
};

const buildUrl = (
  base: string,
  path: string,
  query: RequestOptions["query"],
): string => {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, normalizedBase);
  if (query !== undefined) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(k, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
};

const parseRetryAfterMs = (header: string | null): number | undefined => {
  if (header === null) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return undefined;
};

const extractRequestId = (res: Response): string | undefined =>
  res.headers.get("x-request-id") ?? res.headers.get("x-litellm-call-id") ?? undefined;

const mapResponseError = async (res: Response): Promise<ApiError> => {
  const requestId = extractRequestId(res);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep raw text as body
  }
  if (res.status === 401) return authError({ reason: "invalid", status: 401, body });
  if (res.status === 403) return authError({ reason: "forbidden", status: 403, body });
  if (res.status === 429) {
    const retryAfterMs = parseRetryAfterMs(res.headers.get("retry-after"));
    return rateLimitedError(retryAfterMs === undefined ? {} : { retryAfterMs });
  }
  return httpError({
    status: res.status,
    statusText: res.statusText,
    body,
    ...(requestId === undefined ? {} : { requestId }),
  });
};

const isFormData = (v: unknown): v is FormData =>
  typeof FormData !== "undefined" && v instanceof FormData;

const buildHeaders = (
  config: TransportConfig,
  opts: RequestOptions,
  hasJsonBody: boolean,
  overrides?: Readonly<Record<string, string>>,
): Headers => {
  const h = new Headers();
  if (config.defaultHeaders) {
    for (const [k, v] of Object.entries(config.defaultHeaders)) h.set(k, v);
  }
  if (opts.headers) {
    for (const [k, v] of Object.entries(opts.headers)) h.set(k, v);
  }
  h.set("authorization", `Bearer ${config.apiKey}`);
  if (hasJsonBody) h.set("content-type", "application/json");
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) h.set(k, v);
  }
  return h;
};

const buildRequestInit = (
  config: TransportConfig,
  opts: RequestOptions,
  overrides?: Readonly<Record<string, string>>,
): Result<RequestInit, ApiError> => {
  const hasBody = opts.body !== undefined;
  const formBody = hasBody && isFormData(opts.body);
  const headers = buildHeaders(config, opts, hasBody && !formBody, overrides);
  const init: RequestInit = { method: opts.method, headers };
  if (hasBody) {
    if (formBody) {
      init.body = opts.body as FormData;
    } else {
      const serialized = trySync(() => JSON.stringify(opts.body));
      if (!serialized.ok) {
        return err(
          validationError({
            path: "$.body",
            expected: "JSON-serializable value",
            got: opts.body,
          }),
        );
      }
      init.body = serialized.value;
    }
  }
  return ok(init);
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface AttemptInput {
  readonly url: string;
  readonly init: RequestInit;
  readonly fetchFn: typeof fetch;
  readonly timeoutMs: number;
  readonly userSignal: AbortSignal | undefined;
}

const attemptFetch = async (
  input: AttemptInput,
): Promise<Result<Response, ApiError>> => {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => timeoutController.abort(), input.timeoutMs);

  const signals: AbortSignal[] = [timeoutController.signal];
  if (input.userSignal !== undefined) signals.push(input.userSignal);
  const combinedSignal = AbortSignal.any(signals);

  try {
    const res = await input.fetchFn(input.url, {
      ...input.init,
      signal: combinedSignal,
    });
    if (!res.ok) {
      return err(await mapResponseError(res));
    }
    return ok(res);
  } catch (caught) {
    if (timeoutController.signal.aborted) {
      return err(timeoutError(input.timeoutMs));
    }
    const message = caught instanceof Error ? caught.message : "fetch failed";
    return err(networkError(caught, message));
  } finally {
    clearTimeout(timer);
  }
};

/** Build a `Transport` bound to the given configuration. */
export const createTransport = (config: TransportConfig): Transport => {
  const fetchFn = config.fetch ?? globalThis.fetch;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;

  const runWithRetry = async (
    opts: RequestOptions,
    overrides?: Readonly<Record<string, string>>,
  ): Promise<Result<Response, ApiError>> => {
    const url = buildUrl(config.baseUrl, opts.path, opts.query);
    const initResult = buildRequestInit(config, opts, overrides);
    if (!initResult.ok) return initResult;

    let attempt = 0;
    while (true) {
      const result = await attemptFetch({
        url,
        init: initResult.value,
        fetchFn,
        timeoutMs,
        userSignal: opts.signal,
      });
      if (result.ok) return result;
      if (attempt >= maxRetries) return result;
      if (!isRetryable(result.error)) return result;
      attempt++;
      await sleep(computeBackoffMs(attempt, result.error));
    }
  };

  return {
    async request<TResp>(opts: RequestOptions): Promise<Result<TResp, ApiError>> {
      const res = await runWithRetry(opts);
      if (!res.ok) return res;
      const text = await res.value.text();
      if (text === "") return ok(undefined as TResp);
      try {
        return ok(JSON.parse(text) as TResp);
      } catch {
        return err(
          validationError({ path: "$", expected: "JSON", got: text }),
        );
      }
    },
    async stream(opts: RequestOptions): Promise<Result<ReadableStream<Uint8Array>, ApiError>> {
      const url = buildUrl(config.baseUrl, opts.path, opts.query);
      const initResult = buildRequestInit(config, opts, { accept: "text/event-stream" });
      if (!initResult.ok) return initResult;
      const res = await attemptFetch({
        url,
        init: initResult.value,
        fetchFn,
        timeoutMs,
        userSignal: opts.signal,
      });
      if (!res.ok) return res;
      if (res.value.body === null) {
        return err(networkError(null, "response has no body"));
      }
      return ok(res.value.body);
    },
    async fetchRaw(opts: RequestOptions): Promise<Result<Response, ApiError>> {
      const url = buildUrl(config.baseUrl, opts.path, opts.query);
      const initResult = buildRequestInit(config, opts);
      if (!initResult.ok) return initResult;
      return await attemptFetch({
        url,
        init: initResult.value,
        fetchFn,
        timeoutMs,
        userSignal: opts.signal,
      });
    },
  };
};
