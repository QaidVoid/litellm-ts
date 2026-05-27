import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Query parameters for the `POST /schedule/*` endpoints. */
export interface ScheduleReloadQuery {
  /** Reload cadence in hours (must be greater than zero). */
  readonly hours: number;
}

/**
 * Surface for the maintenance and background-reload endpoints on the
 * `Client`. Response shapes are dashboard payloads and are typed as
 * `unknown`; the proxy returns `{ status, message, timestamp, ... }` with
 * extra fields per endpoint.
 */
export interface MaintenanceNamespace {
  /**
   * Reload the model cost map in this pod immediately and flag other pods
   * to reload on their next tick.
   */
  reloadModelCostMap(): Promise<Result<unknown, ApiError>>;
  /** Schedule periodic reloads of the model cost map. */
  scheduleModelCostMapReload(
    query: ScheduleReloadQuery,
  ): Promise<Result<unknown, ApiError>>;
  /** Cancel the periodic model cost map reload schedule. */
  cancelScheduledModelCostMapReload(): Promise<Result<unknown, ApiError>>;
  /** Read the current model cost map reload schedule status. */
  modelCostMapReloadStatus(): Promise<Result<unknown, ApiError>>;
  /**
   * Reload the Anthropic beta headers config in this pod immediately and
   * flag other pods to reload on their next tick.
   */
  reloadAnthropicBetaHeaders(): Promise<Result<unknown, ApiError>>;
  /** Schedule periodic reloads of the Anthropic beta headers config. */
  scheduleAnthropicBetaHeadersReload(
    query: ScheduleReloadQuery,
  ): Promise<Result<unknown, ApiError>>;
  /** Cancel the periodic Anthropic beta headers reload schedule. */
  cancelScheduledAnthropicBetaHeadersReload(): Promise<Result<unknown, ApiError>>;
  /** Read the current Anthropic beta headers reload schedule status. */
  anthropicBetaHeadersReloadStatus(): Promise<Result<unknown, ApiError>>;
}

/** Bind a `MaintenanceNamespace` to a constructed `Transport`. */
export const createMaintenance = (transport: Transport): MaintenanceNamespace => ({
  reloadModelCostMap() {
    return transport.request<unknown>({
      method: "POST",
      path: "/reload/model_cost_map",
    });
  },
  scheduleModelCostMapReload(query) {
    return transport.request<unknown>({
      method: "POST",
      path: "/schedule/model_cost_map_reload",
      query: { hours: query.hours },
    });
  },
  cancelScheduledModelCostMapReload() {
    return transport.request<unknown>({
      method: "DELETE",
      path: "/schedule/model_cost_map_reload",
    });
  },
  modelCostMapReloadStatus() {
    return transport.request<unknown>({
      method: "GET",
      path: "/schedule/model_cost_map_reload/status",
    });
  },
  reloadAnthropicBetaHeaders() {
    return transport.request<unknown>({
      method: "POST",
      path: "/reload/anthropic_beta_headers",
    });
  },
  scheduleAnthropicBetaHeadersReload(query) {
    return transport.request<unknown>({
      method: "POST",
      path: "/schedule/anthropic_beta_headers_reload",
      query: { hours: query.hours },
    });
  },
  cancelScheduledAnthropicBetaHeadersReload() {
    return transport.request<unknown>({
      method: "DELETE",
      path: "/schedule/anthropic_beta_headers_reload",
    });
  },
  anthropicBetaHeadersReloadStatus() {
    return transport.request<unknown>({
      method: "GET",
      path: "/schedule/anthropic_beta_headers_reload/status",
    });
  },
});
