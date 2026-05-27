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

/** Metadata for a single configurable cache setting. */
export interface CacheSettingsField {
  /** Stable backend field name. */
  readonly field_name: string;
  /** Field type tag (e.g. `"String"`, `"Boolean"`, `"Integer"`). */
  readonly field_type: string;
  /** Current value, masked when sensitive. */
  readonly field_value: unknown;
  /** Human-friendly description of the field. */
  readonly field_description: string;
  /** Default value when unset. */
  readonly field_default?: unknown;
  /** Enumerated options for select-style fields. */
  readonly options?: readonly string[];
  /** Display label for the UI. */
  readonly ui_field_name: string;
  /** Documentation link. */
  readonly link?: string;
  /** Redis sub-mode the field applies to (`"node"`, `"cluster"`, `"sentinel"`). */
  readonly redis_type?: string | null;
}

/** Response from `GET /cache/settings`. */
export interface CacheSettingsResponse {
  /** Schema for every configurable cache setting. */
  readonly fields: readonly CacheSettingsField[];
  /** Currently stored values keyed by `field_name`. */
  readonly current_values: Readonly<Record<string, unknown>>;
  /** Descriptions for each Redis topology option. */
  readonly redis_type_descriptions: Readonly<Record<string, string>>;
}

/** Request body for `POST /cache/settings`. */
export interface UpdateCacheSettingsRequest {
  /** Cache settings to persist (keys match `CacheSettingsField.field_name`). */
  readonly cache_settings: Readonly<Record<string, unknown>>;
}

/** Request body for `POST /cache/settings/test`. */
export interface TestCacheConnectionRequest {
  /** Cache settings to probe (currently Redis only). */
  readonly cache_settings: Readonly<Record<string, unknown>>;
}

/** Response from `POST /cache/settings/test`. */
export interface TestCacheConnectionResponse {
  /** Probe verdict (`"success"` or `"failed"`). */
  readonly status: string;
  /** Human-readable detail. */
  readonly message: string;
  /** Error string when the probe failed. */
  readonly error?: string;
}

/** Surface for proxy cache administration. */
export interface CacheNamespace {
  /** Probe the proxy's cache backend. */
  ping(): Promise<Result<CachePingResponse, ApiError>>;
  /** Wipe the entire cache. */
  flushAll(): Promise<Result<{ readonly status: "success" }, ApiError>>;
  /** Invalidate one or more specific cache keys. */
  delete(req: CacheDeleteRequest): Promise<Result<{ readonly status: "success" }, ApiError>>;
  /** Read the configured cache settings (sensitive values are masked). */
  getSettings(): Promise<Result<CacheSettingsResponse, ApiError>>;
  /** Persist new cache settings and reinitialize the backend. */
  updateSettings(
    req: UpdateCacheSettingsRequest,
  ): Promise<Result<Readonly<Record<string, unknown>>, ApiError>>;
  /** Validate a candidate set of cache settings without persisting them. */
  testSettings(
    req: TestCacheConnectionRequest,
  ): Promise<Result<TestCacheConnectionResponse, ApiError>>;
  /** Diagnostic dump of the Redis backend (masked params + connection info). */
  redisInfo(): Promise<Result<unknown, ApiError>>;
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
  getSettings() {
    return transport.request<CacheSettingsResponse>({
      method: "GET",
      path: "/cache/settings",
    });
  },
  updateSettings(req) {
    return transport.request<Readonly<Record<string, unknown>>>({
      method: "POST",
      path: "/cache/settings",
      body: req,
    });
  },
  testSettings(req) {
    return transport.request<TestCacheConnectionResponse>({
      method: "POST",
      path: "/cache/settings/test",
      body: req,
    });
  },
  redisInfo() {
    return transport.request<unknown>({ method: "GET", path: "/cache/redis/info" });
  },
});
