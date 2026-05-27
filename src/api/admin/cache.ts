import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Connection state for the proxy's cache backend (Redis, in-memory, etc.). */
export interface CachePingResponse {
  /** Overall health verdict. */
  readonly status: "healthy" | "unhealthy";
  /** Configured cache backend (e.g. `"redis"`). */
  readonly cache_type?: string;
  /** Diagnostic detail when `status` is `"unhealthy"`. */
  readonly details?: string;
}

/** Request body for `/cache/delete` (selective invalidation). */
export interface CacheDeleteRequest {
  /** One or more cache keys to invalidate. */
  readonly keys?: readonly string[];
}

/** Surface for proxy cache administration. */
export interface CacheNamespace {
  /** Probe the proxy's cache backend. */
  ping(): Promise<Result<CachePingResponse, ApiError>>;
  /** Wipe the entire cache. */
  flushAll(): Promise<Result<{ readonly status: "success" }, ApiError>>;
  /** Invalidate one or more specific cache keys. */
  delete(req: CacheDeleteRequest): Promise<Result<{ readonly status: "success" }, ApiError>>;
}

/** Bind a `CacheNamespace` to a constructed `Transport`. */
export const createCache = (transport: Transport): CacheNamespace => ({
  ping() {
    return transport.request<CachePingResponse>({ method: "GET", path: "/cache/ping" });
  },
  flushAll() {
    return transport.request<{ readonly status: "success" }>({
      method: "POST",
      path: "/cache/flushall",
    });
  },
  delete(req) {
    return transport.request<{ readonly status: "success" }>({
      method: "POST",
      path: "/cache/delete",
      body: req,
    });
  },
});
