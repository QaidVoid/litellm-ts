import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Lifecycle states of a configured callback. */
export type CallbackStatus = "healthy" | "unhealthy" | "not_configured";

/** A single configured callback. */
export interface CallbackInfo {
  readonly callback_name: string;
  readonly callback_type?: "success" | "failure" | "success_and_failure";
  readonly status?: CallbackStatus;
  readonly details?: string;
}

/** Response from `/callbacks/list` (and provider-specific variants). */
export interface ListCallbacksResponse {
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
  readonly callbacks: readonly CallbackInfo[];
}

/** Surface for callback administration on the `Client`. */
export interface CallbacksNamespace {
  /** List configured callbacks. */
  list(): Promise<Result<ListCallbacksResponse, ApiError>>;
  /** Update the proxy's success / failure callback chains. */
  update(req: UpdateCallbacksRequest): Promise<Result<{ readonly status: "success" }, ApiError>>;
  /** Probe each callback's logging endpoint for liveness. */
  health(): Promise<Result<CallbackHealthResponse, ApiError>>;
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
});
