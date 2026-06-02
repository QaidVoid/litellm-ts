import type { ApiError } from "../../error.ts";
import { httpError } from "../../error.ts";
import type { Result } from "../../result.ts";
import { err, ok } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/**
 * LiteLLM-side parameters that point a registered model name at an upstream
 * provider. Required keys are `model`; everything else is provider-specific.
 */
export interface LiteLLMParams {
  /** Upstream model identifier (e.g. `"openai/gpt-4o"` or `"azure/my-deployment"`). */
  readonly model: string;
  /** Provider API key, often `"os.environ/OPENAI_API_KEY"`. */
  readonly api_key?: string;
  /** Provider base URL override. */
  readonly api_base?: string;
  /** Provider API version (Azure). */
  readonly api_version?: string;
  /** Per-request timeout in seconds. */
  readonly timeout?: number;
  /** Provider-side retry count for transient failures. */
  readonly max_retries?: number;
  /** Other provider-specific knobs the proxy forwards. */
  readonly [key: string]: unknown;
}

/** Auxiliary metadata attached to a registered model. */
export interface ProxyModelInfo {
  /** Server-assigned identifier; required when updating. */
  readonly id?: string;
  /** Other metadata fields the proxy stores. */
  readonly [key: string]: unknown;
}

/** Request body for `/model/new`. */
export interface RegisterModelRequest {
  /** Name clients use when calling the proxy. */
  readonly model_name: string;
  /** Where the proxy forwards the request. */
  readonly litellm_params: LiteLLMParams;
  /** Auxiliary metadata stored with the model. */
  readonly model_info?: ProxyModelInfo;
}

/** Response shape for register / retrieve / update. */
export interface ProxyModel {
  /** Server-assigned identifier. */
  readonly model_id: string;
  /** Public name. */
  readonly model_name: string;
  /** Stored LiteLLM routing parameters. */
  readonly litellm_params: LiteLLMParams;
  /** Stored auxiliary metadata. Always present (defaults to an empty record). */
  readonly model_info: ProxyModelInfo;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
  /** Identifier of the creating user. */
  readonly created_by: string;
  /** Identifier of the last user to update. */
  readonly updated_by: string;
}

/** Request body for `PATCH /model/{model_id}/update`. */
export interface UpdateModelRequest {
  /** Either of these may be replaced (partial update). */
  readonly litellm_params?: Partial<LiteLLMParams>;
  /** Replace auxiliary metadata. */
  readonly model_info?: ProxyModelInfo;
}

/**
 * Request body for the legacy `POST /model/update` endpoint. Mirrors
 * `updateDeployment` on the proxy: a `model_id` plus the same shape as
 * `RegisterModelRequest`.
 */
export interface UpdateModelLegacyRequest {
  /** Public model name. */
  readonly model_name?: string;
  /** Stored LiteLLM routing parameters. */
  readonly litellm_params?: Partial<LiteLLMParams>;
  /** Replace auxiliary metadata (must carry `id` to identify the row). */
  readonly model_info: ProxyModelInfo & {
    /** Id of the model row to update. */
    readonly id: string;
  };
}

/** Request body for `/model/delete`. */
export interface DeleteModelRequest {
  /** Id of the model to delete. */
  readonly id: string;
}

/** Response from `/model/delete`. */
export interface DeleteModelResponse {
  /** Status string, always `"success"`. */
  readonly status: "success";
}

/** Response from `/model/info`. */
export interface ListModelsResponse {
  /** Returned models. */
  readonly data: readonly ProxyModel[];
  /** Total model count across all pages. */
  readonly total_count?: number;
}

/** Query parameters for the OpenAI-shape `GET /models` listing. */
export interface ListOpenAIModelsQuery {
  /** Include wildcard routes (e.g. `"openai/*"`) in the listing. */
  readonly return_wildcard_routes?: boolean;
  /** Scope models to a specific team id. */
  readonly team_id?: string;
  /** Include synthetic entries for model access groups. */
  readonly include_model_access_groups?: boolean;
  /** Return only model access group entries (omit individual models). */
  readonly only_model_access_groups?: boolean;
  /** Attach extra metadata fields (fallback config, etc.). */
  readonly include_metadata?: boolean;
  /** When `include_metadata` is set, which fallback bucket to surface. */
  readonly fallback_type?: "general" | "context_window" | "content_policy";
  /** Set to `"expand"` for admin-wide visibility. */
  readonly scope?: "expand";
}

/** OpenAI-shape model entry returned by `GET /models`. */
export interface OpenAIModelEntry {
  /** Public model id (the name the caller uses). */
  readonly id: string;
  /** Object kind, always `"model"`. */
  readonly object: "model";
  /** Creation timestamp (epoch seconds). */
  readonly created?: number;
  /** Owning provider as known to the proxy. */
  readonly owned_by?: string;
  /** Additional pricing or fallback metadata when `include_metadata` is set. */
  readonly [key: string]: unknown;
}

/** Response from `GET /models`. */
export interface ListOpenAIModelsResponse {
  /** Object kind, always `"list"`. */
  readonly object: "list";
  /** Returned model entries. */
  readonly data: readonly OpenAIModelEntry[];
}

/** Common analytics query parameters for the `/model/metrics*` family. */
export interface ModelMetricsQuery {
  /** Filter by model group. */
  readonly _selected_model_group?: string;
  /** Lower bound on `startTime` (ISO-8601). */
  readonly startTime?: string;
  /** Upper bound on `startTime` (ISO-8601). */
  readonly endTime?: string;
  /** Restrict to a specific virtual key id. */
  readonly api_key?: string;
  /** Restrict to a specific end-user id. */
  readonly customer?: string;
}

/** Response from `/model/metrics`. */
export interface ModelMetricsResponse {
  /** Per-day latency entries keyed by `combined_model_api_base`. */
  readonly data: readonly Readonly<Record<string, unknown>>[];
  /** Distinct combined model+api_base identifiers seen in `data`. */
  readonly all_api_bases: readonly string[];
}

/** A single row returned by `/model/metrics/exceptions`. */
export interface ModelExceptionRow {
  /** Combined `model-api_base` identifier. */
  readonly model: string;
  /** Total exception count for this model+api_base. */
  readonly total_exceptions: number;
  /** Per-exception-type counts (e.g. `BadRequestException`). */
  readonly [exceptionType: string]: number | string;
}

/** Response from `/model/metrics/exceptions`. */
export interface ModelExceptionsResponse {
  /** Per-deployment exception breakdown. */
  readonly data: readonly ModelExceptionRow[];
  /** Distinct exception types observed in `data`. */
  readonly exception_types: readonly string[];
}

/** Response from `/model/metrics/slow_responses`. */
export type ModelSlowResponsesResponse = readonly Readonly<{
  /** Provider base URL the deployment forwards to. */
  readonly api_base: string;
  /** Total observed requests. */
  readonly total_count: number;
  /** Subset of `total_count` that exceeded the alerting threshold. */
  readonly slow_count: number;
}>[];

/** Response from `/model/streaming_metrics`. */
export interface ModelStreamingMetricsResponse {
  /** Time-to-first-token entries grouped by day (or request id for same-day). */
  readonly data: readonly Readonly<Record<string, unknown>>[];
  /** Distinct combined model+api_base identifiers seen in `data`. */
  readonly all_api_bases: readonly string[];
}

/** A single provider's field schema, as returned by `/model/settings`. */
export interface ProviderInfo {
  /** Provider name (e.g. `"openai"`, `"azure"`). */
  readonly name: string;
  /** Provider-specific parameter descriptors. */
  readonly fields: readonly Readonly<Record<string, unknown>>[];
}

/** Response from `/model/settings`. */
export type ModelSettingsResponse = readonly ProviderInfo[];

/** Query parameters for `GET /v2/model/info`. */
export interface ListModelsV2Query {
  /** Restrict to a single model name. */
  readonly model?: string;
  /** Only include models the calling user added. */
  readonly user_models_only?: boolean;
  /** Include models from every team the caller belongs to. */
  readonly include_team_models?: boolean;
  /** Verbose debugging metadata in the response. */
  readonly debug?: boolean;
  /** 1-based page number. */
  readonly page?: number;
  /** Page size. Default 50. */
  readonly size?: number;
  /** Case-insensitive partial-match filter on model name. */
  readonly search?: string;
  /** Look up a single model by deployment id. */
  readonly modelId?: string;
  /** Restrict to a single team id. */
  readonly teamId?: string;
  /** Sort field (`"model_name"`, `"created_at"`, `"updated_at"`, `"costs"`, `"status"`). */
  readonly sortBy?: string;
  /** Sort direction (`"asc"` or `"desc"`). */
  readonly sortOrder?: "asc" | "desc";
}

/** Request body for `POST /model_group/make_public`. */
export interface MakeModelGroupsPublicRequest {
  /** Model group names to flag as public. */
  readonly model_groups: readonly string[];
}

/** Sub-namespace under `client.proxyModels.modelGroup`. */
export interface ModelGroupNamespace {
  /**
   * Fetch model group metadata (or every group when `modelGroupName` is
   * omitted). Returned shape is the proxy's dashboard payload and is
   * exposed as `unknown` because it varies by deployment.
   */
  info(modelGroupName?: string): Promise<Result<unknown, ApiError>>;
  /** Update the set of model groups exposed by `/public/model_hub`. */
  makePublic(req: MakeModelGroupsPublicRequest): Promise<Result<unknown, ApiError>>;
  /** Update the model-hub "useful links" sidebar. */
  updateUsefulLinks(req: UpdateModelHubUsefulLinksRequest): Promise<Result<unknown, ApiError>>;
}

/** Wire shape for a single useful-link entry. */
export type UsefulLinkEntry = string | { readonly url: string; readonly index?: number };

/** Request body for `POST /model_hub/update_useful_links`. */
export interface UpdateModelHubUsefulLinksRequest {
  /**
   * Display-name to link map. Accepts the legacy plain-string form
   * (`{ "Docs": "https://..." }`) or the structured form with optional
   * ordering (`{ "Docs": { "url": "https://...", "index": 0 } }`).
   */
  readonly useful_links: Readonly<Record<string, UsefulLinkEntry>>;
}

/** Response from `/model/cost_map/source`. */
export interface ModelCostMapSourceResponse {
  /** Either `"local"` (bundled) or `"remote"` (fetched). */
  readonly source: "local" | "remote";
  /** Remote URL the proxy attempted, `null` when env-forced local. */
  readonly url: string | null;
  /** Whether `LITELLM_LOCAL_MODEL_COST_MAP=True` forced local usage. */
  readonly is_env_forced: boolean;
  /** Human-readable reason the remote failed, `null` on success. */
  readonly fallback_reason: string | null;
  /** Number of models in the currently loaded cost map. */
  readonly model_count: number;
}

/** Surface for proxy model administration on the `Client`. */
export interface ProxyModelsNamespace {
  /** Register a new model with the proxy. */
  register(req: RegisterModelRequest): Promise<Result<ProxyModel, ApiError>>;
  /** Retrieve a single registered model by id. */
  retrieve(modelId: string): Promise<Result<ProxyModel, ApiError>>;
  /** List every model the proxy knows about. */
  list(): Promise<Result<ListModelsResponse, ApiError>>;
  /** Partially update a model stored in the database. */
  update(modelId: string, req: UpdateModelRequest): Promise<Result<ProxyModel, ApiError>>;
  /** Legacy update via `POST /model/update`; carries `model_info.id` in the body. */
  updateLegacy(req: UpdateModelLegacyRequest): Promise<Result<ProxyModel, ApiError>>;
  /** Delete a model by id. */
  delete(modelId: string): Promise<Result<DeleteModelResponse, ApiError>>;
  /** OpenAI-shape model listing (`/models`). */
  listOpenAI(
    query?: ListOpenAIModelsQuery,
  ): Promise<Result<ListOpenAIModelsResponse, ApiError>>;
  /** OpenAI-shape single-model retrieval (`/models/{model_id}`). */
  retrieveOpenAI(modelId: string): Promise<Result<OpenAIModelEntry, ApiError>>;
  /** Latency-per-token metrics over a time window. */
  metrics(query?: ModelMetricsQuery): Promise<Result<ModelMetricsResponse, ApiError>>;
  /** Per-deployment exception counts grouped by exception type. */
  metricsExceptions(
    query?: ModelMetricsQuery,
  ): Promise<Result<ModelExceptionsResponse, ApiError>>;
  /** Per-api_base counts of requests that exceeded the slow-response alerting threshold. */
  metricsSlowResponses(
    query?: ModelMetricsQuery,
  ): Promise<Result<ModelSlowResponsesResponse, ApiError>>;
  /** Time-to-first-token streaming metrics. */
  streamingMetrics(
    query?: ModelMetricsQuery,
  ): Promise<Result<ModelStreamingMetricsResponse, ApiError>>;
  /** Per-provider field metadata used by the model-add UI. */
  settings(): Promise<Result<ModelSettingsResponse, ApiError>>;
  /** Diagnostic info about where the model cost map was loaded from. */
  costMapSource(): Promise<Result<ModelCostMapSourceResponse, ApiError>>;
  /** Model-group administration (info + make_public). */
  readonly modelGroup: ModelGroupNamespace;
  /**
   * Beta `/v2/model/info` listing with extra filtering, search, and
   * pagination. Returned as `unknown` because the proxy explicitly warns
   * the shape can change; use `list` / `retrieve` for stable surfaces.
   */
  listV2(query?: ListModelsV2Query): Promise<Result<unknown, ApiError>>;
}

const encode = (s: string) => encodeURIComponent(s);

const filterUndefined = <T extends object>(
  q: T,
): Readonly<Record<string, string | number | boolean>> => {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) out[k] = v as string | number | boolean;
  }
  return out;
};

const createModelGroup = (transport: Transport): ModelGroupNamespace => ({
  info(modelGroupName) {
    return transport.request<unknown>({
      method: "GET",
      path: "/model_group/info",
      ...(modelGroupName === undefined ? {} : { query: { model_group: modelGroupName } }),
    });
  },
  makePublic(req) {
    return transport.request<unknown>({
      method: "POST",
      path: "/model_group/make_public",
      body: req,
    });
  },
  updateUsefulLinks(req) {
    return transport.request<unknown>({
      method: "POST",
      path: "/model_hub/update_useful_links",
      body: req,
    });
  },
});

/** Bind a `ProxyModelsNamespace` to a constructed `Transport`. */
export const createProxyModels = (transport: Transport): ProxyModelsNamespace => ({
  register(req) {
    return transport.request<ProxyModel>({
      method: "POST",
      path: "/model/new",
      body: req,
    });
  },
  async retrieve(modelId) {
    // `/model/info` ignores the `model_id` query param entirely (returns
    // the full fleet); filtering only happens with `litellm_model_id`.
    // The response is also wrapped in `{data: [...]}`, so peel the first
    // (and only) match or surface a 404.
    const result = await transport.request<ListModelsResponse>({
      method: "GET",
      path: "/model/info",
      query: { litellm_model_id: modelId },
    });
    if (!result.ok) return result;
    const first = result.value.data[0];
    if (first === undefined) {
      return err(httpError({ status: 404, statusText: "Not Found", body: { model_id: modelId } }));
    }
    return ok(first);
  },
  list() {
    return transport.request<ListModelsResponse>({
      method: "GET",
      path: "/model/info",
    });
  },
  update(modelId, req) {
    return transport.request<ProxyModel>({
      method: "PATCH",
      path: `/model/${encode(modelId)}/update`,
      body: req,
    });
  },
  updateLegacy(req) {
    return transport.request<ProxyModel>({
      method: "POST",
      path: "/model/update",
      body: req,
    });
  },
  delete(modelId) {
    return transport.request<DeleteModelResponse>({
      method: "POST",
      path: "/model/delete",
      body: { id: modelId },
    });
  },
  listOpenAI(query) {
    return transport.request<ListOpenAIModelsResponse>({
      method: "GET",
      path: "/models",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  retrieveOpenAI(modelId) {
    return transport.request<OpenAIModelEntry>({
      method: "GET",
      path: `/models/${encode(modelId)}`,
    });
  },
  metrics(query) {
    return transport.request<ModelMetricsResponse>({
      method: "GET",
      path: "/model/metrics",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  metricsExceptions(query) {
    return transport.request<ModelExceptionsResponse>({
      method: "GET",
      path: "/model/metrics/exceptions",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  metricsSlowResponses(query) {
    return transport.request<ModelSlowResponsesResponse>({
      method: "GET",
      path: "/model/metrics/slow_responses",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  streamingMetrics(query) {
    return transport.request<ModelStreamingMetricsResponse>({
      method: "GET",
      path: "/model/streaming_metrics",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  settings() {
    return transport.request<ModelSettingsResponse>({
      method: "GET",
      path: "/model/settings",
    });
  },
  costMapSource() {
    return transport.request<ModelCostMapSourceResponse>({
      method: "GET",
      path: "/model/cost_map/source",
    });
  },
  modelGroup: createModelGroup(transport),
  listV2(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/v2/model/info",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
});
