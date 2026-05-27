import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
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
  /** Stored auxiliary metadata. */
  readonly model_info?: ProxyModelInfo;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
  /** Identifier of the creating user. */
  readonly created_by?: string;
  /** Identifier of the last user to update. */
  readonly updated_by?: string;
}

/** Request body for `PATCH /model/{model_id}/update`. */
export interface UpdateModelRequest {
  /** Either of these may be replaced (partial update). */
  readonly litellm_params?: Partial<LiteLLMParams>;
  /** Replace auxiliary metadata. */
  readonly model_info?: ProxyModelInfo;
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

/** Response from `/model/list`. */
export interface ListModelsResponse {
  /** Returned models. */
  readonly models: readonly ProxyModel[];
  /** Total model count across all pages. */
  readonly total_count?: number;
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
  /** Delete a model by id. */
  delete(modelId: string): Promise<Result<DeleteModelResponse, ApiError>>;
}

/** Bind a `ProxyModelsNamespace` to a constructed `Transport`. */
export const createProxyModels = (transport: Transport): ProxyModelsNamespace => ({
  register(req) {
    return transport.request<ProxyModel>({
      method: "POST",
      path: "/model/new",
      body: req,
    });
  },
  retrieve(modelId) {
    return transport.request<ProxyModel>({
      method: "GET",
      path: "/model/info",
      query: { model_id: modelId },
    });
  },
  list() {
    return transport.request<ListModelsResponse>({
      method: "GET",
      path: "/model/list",
    });
  },
  update(modelId, req) {
    return transport.request<ProxyModel>({
      method: "PATCH",
      path: `/model/${encodeURIComponent(modelId)}/update`,
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
});
