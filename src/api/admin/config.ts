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

/** Which config section a field/list operation targets. */
export type ConfigSectionType = "general_settings";

/** Request body for `POST /config/field/update`. */
export interface ConfigFieldUpdate {
  /** Section the field lives in. */
  readonly config_type: ConfigSectionType;
  /** Field name inside the section. */
  readonly field_name: string;
  /** New value (any JSON-serializable type). */
  readonly field_value: unknown;
}

/** Request body for `POST /config/field/delete`. */
export interface ConfigFieldDelete {
  /** Section the field lives in. */
  readonly config_type: ConfigSectionType;
  /** Field name to delete. */
  readonly field_name: string;
}

/** Request body for `POST /config/callback/delete`. */
export interface CallbackDelete {
  /** Callback identifier to remove from the active list. */
  readonly callback_name: string;
}

/** Nested-field descriptor in `ConfigFieldEntry.nested_fields`. */
export interface ConfigNestedFieldDetail {
  /** Field name. */
  readonly field_name: string;
  /** Field type, formatted as a Python type-hint string. */
  readonly field_type: string;
  /** Human-readable description. */
  readonly field_description: string;
  /** Default value when unset. */
  readonly field_default_value?: unknown;
  /** True when the value is stored in the proxy database. */
  readonly stored_in_db?: boolean;
}

/** A single row in the response to `GET /config/list`. */
export interface ConfigFieldEntry {
  /** Field name. */
  readonly field_name: string;
  /** Field type, formatted as a Python type-hint string. */
  readonly field_type: string;
  /** Human-readable description. */
  readonly field_description: string;
  /** Current value (any JSON-serializable type). */
  readonly field_value?: unknown;
  /** True when the value is stored in the proxy database. */
  readonly stored_in_db?: boolean;
  /** Default value when unset. */
  readonly field_default_value?: unknown;
  /** True when the field is gated behind LiteLLM Enterprise. */
  readonly premium_field?: boolean;
  /** Nested object fields, when the value is itself a dict or model. */
  readonly nested_fields?: readonly ConfigNestedFieldDetail[];
}

/** Cost-discount map keyed by provider id. Values are 0..1 fractions. */
export type CostDiscountConfig = Readonly<Record<string, number>>;

/** Cost-margin map keyed by provider id. Values are 0..1 fractions. */
export type CostMarginConfig = Readonly<Record<string, number>>;

/** Response from `GET /config/cost_discount_config`. */
export interface CostDiscountConfigResponse {
  /** Currently stored cost discounts. */
  readonly values: CostDiscountConfig;
}

/** Response from `GET /config/cost_margin_config`. */
export interface CostMarginConfigResponse {
  /** Currently stored cost margins. */
  readonly values: CostMarginConfig;
}

/** Pass-through endpoint configuration stored on the proxy. */
export interface PassThroughEndpoint {
  /** Stable id; defaults to the path when omitted (legacy behavior). */
  readonly id?: string;
  /** Route registered on the proxy (e.g. `"/bria"`). */
  readonly path: string;
  /** Upstream URL requests are forwarded to. */
  readonly target: string;
  /** Headers forwarded with each request. */
  readonly headers?: Readonly<Record<string, string>>;
  /** Default query parameters added to each request. */
  readonly default_query_params?: Readonly<Record<string, string>>;
  /** Forward requests to sub-paths under `path`. */
  readonly include_subpath?: boolean;
  /** USD cost per forwarded request. */
  readonly cost_per_request?: number;
}

/** Response from `GET /config/pass_through_endpoint`. */
export interface ListPassThroughEndpointsResponse {
  /** Configured pass-through endpoints. */
  readonly endpoints: readonly PassThroughEndpoint[];
}

/** Query parameters for `GET /config/pass_through_endpoint`. */
export interface ListPassThroughEndpointsQuery {
  /** Restrict the listing to a single endpoint id. */
  readonly endpoint_id?: string;
}

/** Settings sub-block returned by `/config/pass_through_endpoints/settings`. */
export type PassThroughEndpointSettings = Readonly<Record<string, unknown>>;

/** Field administration sub-namespace under `client.config.fields`. */
export interface ConfigFieldsNamespace {
  /** List configurable fields and their current values. */
  list(configType?: ConfigSectionType): Promise<Result<readonly ConfigFieldEntry[], ApiError>>;
  /** Retrieve a single field's metadata + value. */
  info(fieldName: string): Promise<Result<ConfigFieldEntry, ApiError>>;
  /** Replace a single field value. */
  update(req: ConfigFieldUpdate): Promise<Result<{ readonly status: "success" }, ApiError>>;
  /** Reset a single field back to its default. */
  delete(req: ConfigFieldDelete): Promise<Result<{ readonly status: "success" }, ApiError>>;
}

/** Cost-discount sub-namespace under `client.config.costDiscounts`. */
export interface ConfigCostDiscountsNamespace {
  /** Get the currently stored cost-discount map. */
  get(): Promise<Result<CostDiscountConfigResponse, ApiError>>;
  /** Replace the cost-discount map. */
  update(values: CostDiscountConfig): Promise<Result<unknown, ApiError>>;
}

/** Cost-margin sub-namespace under `client.config.costMargins`. */
export interface ConfigCostMarginsNamespace {
  /** Get the currently stored cost-margin map. */
  get(): Promise<Result<CostMarginConfigResponse, ApiError>>;
  /** Replace the cost-margin map. */
  update(values: CostMarginConfig): Promise<Result<unknown, ApiError>>;
}

/** Pass-through endpoint sub-namespace under `client.config.passThroughEndpoints`. */
export interface ConfigPassThroughEndpointsNamespace {
  /** List configured pass-through endpoints, optionally filtered by id. */
  list(
    query?: ListPassThroughEndpointsQuery,
  ): Promise<Result<ListPassThroughEndpointsResponse, ApiError>>;
  /** List pass-through endpoints scoped to a team. */
  listByTeam(teamId: string): Promise<Result<ListPassThroughEndpointsResponse, ApiError>>;
  /** Create a new pass-through endpoint. */
  create(endpoint: PassThroughEndpoint): Promise<Result<unknown, ApiError>>;
  /** Update an existing pass-through endpoint by id. */
  update(endpointId: string, endpoint: PassThroughEndpoint): Promise<Result<unknown, ApiError>>;
  /** Delete a pass-through endpoint by id. */
  delete(endpointId: string): Promise<Result<unknown, ApiError>>;
  /** Get the global pass-through settings block. */
  settings(): Promise<Result<PassThroughEndpointSettings, ApiError>>;
}

/** Surface for global config administration. */
export interface ConfigNamespace {
  /** Retrieve the proxy's current configuration snapshot. */
  get(): Promise<Result<ProxyConfigSnapshot, ApiError>>;
  /** Partially update the proxy's runtime configuration. */
  update(req: UpdateConfigRequest): Promise<Result<{ readonly status: "success" }, ApiError>>;
  /** Get the raw YAML the proxy boots from. */
  yaml(): Promise<Result<unknown, ApiError>>;
  /** Remove a callback by name from the active list. */
  deleteCallback(req: CallbackDelete): Promise<Result<unknown, ApiError>>;
  /** Per-field administration sub-namespace. */
  readonly fields: ConfigFieldsNamespace;
  /** Per-provider cost-discount administration. */
  readonly costDiscounts: ConfigCostDiscountsNamespace;
  /** Per-provider cost-margin administration. */
  readonly costMargins: ConfigCostMarginsNamespace;
  /** Pass-through endpoint administration. */
  readonly passThroughEndpoints: ConfigPassThroughEndpointsNamespace;
}

const encode = (s: string) => encodeURIComponent(s);

const createFields = (transport: Transport): ConfigFieldsNamespace => ({
  list(configType) {
    return transport.request<readonly ConfigFieldEntry[]>({
      method: "GET",
      path: "/config/list",
      query: { config_type: configType ?? "general_settings" },
    });
  },
  info(fieldName) {
    return transport.request<ConfigFieldEntry>({
      method: "GET",
      path: "/config/field/info",
      query: { field_name: fieldName },
    });
  },
  update(req) {
    return transport.request<{ readonly status: "success" }>({
      method: "POST",
      path: "/config/field/update",
      body: req,
    });
  },
  delete(req) {
    return transport.request<{ readonly status: "success" }>({
      method: "POST",
      path: "/config/field/delete",
      body: req,
    });
  },
});

const createCostDiscounts = (transport: Transport): ConfigCostDiscountsNamespace => ({
  get() {
    return transport.request<CostDiscountConfigResponse>({
      method: "GET",
      path: "/config/cost_discount_config",
    });
  },
  update(values) {
    return transport.request<unknown>({
      method: "PATCH",
      path: "/config/cost_discount_config",
      body: values,
    });
  },
});

const createCostMargins = (transport: Transport): ConfigCostMarginsNamespace => ({
  get() {
    return transport.request<CostMarginConfigResponse>({
      method: "GET",
      path: "/config/cost_margin_config",
    });
  },
  update(values) {
    return transport.request<unknown>({
      method: "PATCH",
      path: "/config/cost_margin_config",
      body: values,
    });
  },
});

const createPassThroughEndpoints = (
  transport: Transport,
): ConfigPassThroughEndpointsNamespace => ({
  list(query) {
    return transport.request<ListPassThroughEndpointsResponse>({
      method: "GET",
      path: "/config/pass_through_endpoint",
      ...(query?.endpoint_id === undefined ? {} : { query: { endpoint_id: query.endpoint_id } }),
    });
  },
  listByTeam(teamId) {
    return transport.request<ListPassThroughEndpointsResponse>({
      method: "GET",
      path: `/config/pass_through_endpoint/team/${encode(teamId)}`,
    });
  },
  create(endpoint) {
    return transport.request<unknown>({
      method: "POST",
      path: "/config/pass_through_endpoint",
      body: endpoint,
    });
  },
  update(endpointId, endpoint) {
    return transport.request<unknown>({
      method: "POST",
      path: `/config/pass_through_endpoint/${encode(endpointId)}`,
      body: endpoint,
    });
  },
  delete(endpointId) {
    return transport.request<unknown>({
      method: "DELETE",
      path: "/config/pass_through_endpoint",
      query: { endpoint_id: endpointId },
    });
  },
  settings() {
    return transport.request<PassThroughEndpointSettings>({
      method: "GET",
      path: "/config/pass_through_endpoints/settings",
    });
  },
});

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
  yaml() {
    return transport.request<unknown>({ method: "GET", path: "/config/yaml" });
  },
  deleteCallback(req) {
    return transport.request<unknown>({
      method: "POST",
      path: "/config/callback/delete",
      body: req,
    });
  },
  fields: createFields(transport),
  costDiscounts: createCostDiscounts(transport),
  costMargins: createCostMargins(transport),
  passThroughEndpoints: createPassThroughEndpoints(transport),
});
