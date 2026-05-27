import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Lifecycle states of a configured callback. */
export type CallbackStatus = "healthy" | "unhealthy" | "not_configured";

/** A single configured callback. */
export interface CallbackInfo {
  /** Callback identifier (e.g. `"langfuse"`). */
  readonly callback_name: string;
  /** Which events the callback fires on. */
  readonly callback_type?: "success" | "failure" | "success_and_failure";
  /** Last health check verdict. */
  readonly status?: CallbackStatus;
  /** Diagnostic detail when unhealthy. */
  readonly details?: string;
}

/** Response from `/callbacks/list` (and provider-specific variants). */
export interface ListCallbacksResponse {
  /** Configured callbacks. */
  readonly callbacks: readonly CallbackInfo[];
}

/** Request body for updating callback configuration. */
export interface UpdateCallbacksRequest {
  /** Callbacks to invoke on successful upstream responses. */
  readonly success_callback?: readonly string[];
  /** Callbacks to invoke on failed upstream responses. */
  readonly failure_callback?: readonly string[];
  /** Other arbitrary fields supported by the proxy. */
  readonly [key: string]: unknown;
}

/** Response from `/callback/health`. */
export interface CallbackHealthResponse {
  /** Probed callbacks with current verdicts. */
  readonly callbacks: readonly CallbackInfo[];
}

/**
 * Schema for one configurable parameter on a logging callback, as returned
 * by `/callbacks/configs`. Shape mirrors the proxy's `callback_configs.json`
 * file.
 */
export interface CallbackConfigField {
  /** Backend field name. */
  readonly field_name?: string;
  /** Field type tag (e.g. `"String"`, `"Boolean"`). */
  readonly field_type?: string;
  /** Human-friendly description. */
  readonly field_description?: string;
  /** Default value applied when unset. */
  readonly field_default?: unknown;
  /** Whether the field accepts a secret value. */
  readonly is_secret?: boolean;
  /** Additional provider-specific fields. */
  readonly [key: string]: unknown;
}

/** Per-callback schema entry returned by `/callbacks/configs`. */
export interface CallbackConfigEntry {
  /** Callback identifier (e.g. `"langfuse"`). */
  readonly callback_name?: string;
  /** Configurable fields for this callback. */
  readonly fields?: readonly CallbackConfigField[];
  /** Additional provider-specific fields. */
  readonly [key: string]: unknown;
}

/**
 * Response from `GET /callbacks/configs`. Keys are callback identifiers
 * (e.g. `"langfuse"`); values are the per-callback configuration schema.
 */
export type CallbackConfigsResponse = Readonly<Record<string, CallbackConfigEntry>>;

/** Surface for callback administration on the `Client`. */
export interface CallbacksNamespace {
  /** List configured callbacks. */
  list(): Promise<Result<ListCallbacksResponse, ApiError>>;
  /** Update the proxy's success / failure callback chains. */
  update(req: UpdateCallbacksRequest): Promise<Result<{ readonly status: "success" }, ApiError>>;
  /** Probe each callback's logging endpoint for liveness. */
  health(): Promise<Result<CallbackHealthResponse, ApiError>>;
  /** Read the per-callback configuration schema (used by the Admin UI). */
  configs(): Promise<Result<CallbackConfigsResponse, ApiError>>;
  /**
   * Diagnostic dump of the currently-active in-process callbacks
   * (`GET /active/callbacks`). The payload mirrors the proxy's runtime
   * `litellm.callbacks` / `litellm.success_callback` lists and is exposed
   * as `unknown` since it carries implementation details.
   */
  activeCallbacks(): Promise<Result<unknown, ApiError>>;
  /**
   * Admin-UI view of the configured callbacks plus the environment
   * variables each callback needs (`GET /get/config/callbacks`). Shape is
   * Admin-UI-specific.
   */
  configCallbacks(): Promise<Result<unknown, ApiError>>;
}

/** Bind a `CallbacksNamespace` to a constructed `Transport`. */
export const createCallbacks = (transport: Transport): CallbacksNamespace => ({
  list() {
    return transport.request<ListCallbacksResponse>({
      method: "GET",
      path: "/callbacks/list",
    });
  },
  update(req) {
    return transport.request<{ readonly status: "success" }>({
      method: "POST",
      path: "/config/update",
      body: { router_settings: req },
    });
  },
  health() {
    return transport.request<CallbackHealthResponse>({
      method: "GET",
      path: "/callback/health",
    });
  },
  configs() {
    return transport.request<CallbackConfigsResponse>({
      method: "GET",
      path: "/callbacks/configs",
    });
  },
  activeCallbacks() {
    return transport.request<unknown>({
      method: "GET",
      path: "/active/callbacks",
    });
  },
  configCallbacks() {
    return transport.request<unknown>({
      method: "GET",
      path: "/get/config/callbacks",
    });
  },
});
