import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/**
 * Response from `GET /callbacks/list`: configured callback names grouped by
 * the events they fire on. (The proxy returns callback name strings, not
 * objects with status metadata.)
 */
export interface ListCallbacksResponse {
  /** Callbacks fired on successful responses. */
  readonly success: readonly string[];
  /** Callbacks fired on failed responses. */
  readonly failure: readonly string[];
  /** Callbacks fired on both success and failure. */
  readonly success_and_failure: readonly string[];
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
  /**
   * Update the proxy's success / failure callback chains by routing through
   * `POST /config/update` with the changes wrapped as `router_settings`.
   * The proxy returns an implementation-defined shape (a message dict, the
   * raw DB row, or `{}`).
   */
  update(req: UpdateCallbacksRequest): Promise<Result<unknown, ApiError>>;
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
    return transport.request<unknown>({
      method: "POST",
      path: "/config/update",
      body: { router_settings: req },
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
