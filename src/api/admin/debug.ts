import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Query parameters for `POST /debug/memory/gc/configure`. */
export interface ConfigureGcRequest {
  /** Generation 0 collection threshold. Default 700. */
  readonly generation_0?: number;
  /** Generation 1 collection threshold. Default 10. */
  readonly generation_1?: number;
  /** Generation 2 collection threshold. Default 10. */
  readonly generation_2?: number;
}

/**
 * Surface for proxy operator debugging on the `Client`. These endpoints are
 * intended for the team running the proxy (memory profiling, asyncio task
 * inspection, OTEL span dump). Returned shapes vary across releases so most
 * responses are typed as `unknown`.
 */
export interface DebugNamespace {
  /** List active asyncio tasks with per-task stats. */
  asyncioTasks(): Promise<Result<unknown, ApiError>>;
  /** Process-level memory usage snapshot (tracemalloc top stats). */
  memoryUsage(): Promise<Result<unknown, ApiError>>;
  /** Memory used by the in-memory cache backend. */
  memoryUsageInMemCache(): Promise<Result<unknown, ApiError>>;
  /** Per-key breakdown of in-memory cache memory. */
  memoryUsageInMemCacheItems(): Promise<Result<unknown, ApiError>>;
  /** Simplified summary of proxy memory usage (RSS, GC counters, ...). */
  memorySummary(): Promise<Result<unknown, ApiError>>;
  /** Verbose memory profile including largest allocations. */
  memoryDetails(): Promise<Result<unknown, ApiError>>;
  /** Tune the Python garbage collector generation thresholds. */
  configureGc(req?: ConfigureGcRequest): Promise<Result<unknown, ApiError>>;
  /** Dump recently collected OpenTelemetry spans. */
  otelSpans(): Promise<Result<unknown, ApiError>>;
}

const filterUndefined = <T extends object>(
  q: T,
): Readonly<Record<string, string | number | boolean>> => {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) out[k] = v as string | number | boolean;
  }
  return out;
};

/** Bind a `DebugNamespace` to a constructed `Transport`. */
export const createDebug = (transport: Transport): DebugNamespace => ({
  asyncioTasks() {
    return transport.request<unknown>({ method: "GET", path: "/debug/asyncio-tasks" });
  },
  memoryUsage() {
    return transport.request<unknown>({ method: "GET", path: "/memory-usage" });
  },
  memoryUsageInMemCache() {
    return transport.request<unknown>({ method: "GET", path: "/memory-usage-in-mem-cache" });
  },
  memoryUsageInMemCacheItems() {
    return transport.request<unknown>({
      method: "GET",
      path: "/memory-usage-in-mem-cache-items",
    });
  },
  memorySummary() {
    return transport.request<unknown>({ method: "GET", path: "/debug/memory/summary" });
  },
  memoryDetails() {
    return transport.request<unknown>({ method: "GET", path: "/debug/memory/details" });
  },
  configureGc(req) {
    return transport.request<unknown>({
      method: "POST",
      path: "/debug/memory/gc/configure",
      ...(req === undefined ? {} : { query: filterUndefined(req) }),
    });
  },
  otelSpans() {
    return transport.request<unknown>({ method: "GET", path: "/otel-spans" });
  },
});
