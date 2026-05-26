import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/**
 * Top-level proxy configuration snapshot returned by `/config/get`. The
 * shape is the YAML configuration the proxy was launched with, deserialized
 * to JSON. Field set is intentionally open since LiteLLM extends it over
 * time and many fields are optional.
 */
export type ProxyConfigSnapshot = Readonly<Record<string, unknown>>;

/** Request body for `/config/update`. */
export interface UpdateConfigRequest {
  /** Settings under `router_settings:` in the proxy YAML. */
  readonly router_settings?: Readonly<Record<string, unknown>>;
  /** Settings under `litellm_settings:` in the proxy YAML. */
  readonly litellm_settings?: Readonly<Record<string, unknown>>;
  /** Settings under `general_settings:` in the proxy YAML. */
  readonly general_settings?: Readonly<Record<string, unknown>>;
  /** Other top-level keys the proxy may accept. */
  readonly [key: string]: unknown;
}

/** Surface for global config administration. */
export interface ConfigNamespace {
  /** Retrieve the proxy's current configuration snapshot. */
  get(): Promise<Result<ProxyConfigSnapshot, ApiError>>;
  /** Partially update the proxy's runtime configuration. */
  update(req: UpdateConfigRequest): Promise<Result<{ readonly status: "success" }, ApiError>>;
}

/** Bind a `ConfigNamespace` to a constructed `Transport`. */
export const createConfig = (transport: Transport): ConfigNamespace => ({
  get() {
    return transport.request<ProxyConfigSnapshot>({ method: "GET", path: "/config/get" });
  },
  update(req) {
    return transport.request<{ readonly status: "success" }>({
      method: "POST",
      path: "/config/update",
      body: req,
    });
  },
});
