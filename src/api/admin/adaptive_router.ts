import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Response from `GET /adaptive_router/state`. */
export interface AdaptiveRouterStateResponse {
  /**
   * One snapshot per adaptive-router deployment. Each snapshot carries a
   * `router_name`, the live bandit posterior, and the in-flight queue
   * depth; the remaining fields vary by router implementation.
   */
  readonly routers: readonly Readonly<Record<string, unknown>>[];
}

/** Surface for adaptive-router diagnostics on the `Client`. */
export interface AdaptiveRouterNamespace {
  /**
   * Live bandit posteriors + queue depth for every configured adaptive
   * router. Returns 404 from the proxy when no adaptive router is
   * configured.
   */
  state(): Promise<Result<AdaptiveRouterStateResponse, ApiError>>;
}

/** Bind an `AdaptiveRouterNamespace` to a constructed `Transport`. */
export const createAdaptiveRouter = (
  transport: Transport,
): AdaptiveRouterNamespace => ({
  state() {
    return transport.request<AdaptiveRouterStateResponse>({
      method: "GET",
      path: "/adaptive_router/state",
    });
  },
});
