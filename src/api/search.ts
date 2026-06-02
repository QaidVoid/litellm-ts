import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** LiteLLM-specific parameters when registering a search tool. */
export interface SearchToolLiteLLMParams {
  /** Provider id, e.g. `"perplexity"`, `"tavily"`. */
  readonly search_provider: string;
  /** Provider API key. */
  readonly api_key?: string;
  /** Override the provider's API base URL. */
  readonly api_base?: string;
  /** Per-request timeout in seconds. */
  readonly timeout?: number;
  /** Maximum number of upstream retries. */
  readonly max_retries?: number;
}

/** Search tool configuration (mirrors `client.search.tools` listing). */
export interface SearchTool {
  /** Server-assigned id; absent on create payloads. */
  readonly search_tool_id?: string;
  /** Unique tool name used in the search URL path. */
  readonly search_tool_name: string;
  /** LiteLLM-side configuration. */
  readonly litellm_params: SearchToolLiteLLMParams;
  /** Free-form metadata (e.g. description). */
  readonly search_tool_info?: Readonly<Record<string, unknown>>;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
}

/** A row in `GET /search_tools/list`. */
export interface SearchToolInfo extends SearchTool {
  /** True when the tool was declared via config.yaml rather than DB. */
  readonly is_from_config?: boolean;
}

/** Response from `GET /search_tools/list`. */
export interface ListSearchToolsResponse {
  /** Configured search tools. */
  readonly search_tools: readonly SearchToolInfo[];
}

/** Request body for `POST /search_tools`. */
export interface CreateSearchToolRequest {
  /** Search tool configuration to create. */
  readonly search_tool: SearchTool;
}

/** Request body for `PUT /search_tools/{id}`. */
export interface UpdateSearchToolRequest {
  /** Search tool configuration to apply. */
  readonly search_tool: SearchTool;
}

/** Request body for `POST /search_tools/test_connection`. */
export interface TestSearchToolConnectionRequest {
  /** Provider configuration to probe (the same shape as `SearchTool.litellm_params`). */
  readonly litellm_params: SearchToolLiteLLMParams;
}

/** A single available provider in the discovery endpoint. */
export interface AvailableSearchProvider {
  /** Provider identifier used in `litellm_params.search_provider`. */
  readonly provider_name: string;
  /** Provider name shown in the admin UI. */
  readonly ui_friendly_name: string;
}

/** Response from `GET /search_tools/ui/available_providers`. */
export interface AvailableSearchProvidersResponse {
  /** Providers available for use. */
  readonly providers: readonly AvailableSearchProvider[];
}

/** Request body for `POST /v1/search` and `POST /v1/search/{name}`. */
export interface SearchRequest {
  /** Search query. */
  readonly query: string;
  /** Maximum number of results. */
  readonly max_results?: number;
  /** Restrict results to these domains. */
  readonly search_domain_filter?: readonly string[];
  /** ISO-3166 country code biasing the search. */
  readonly country?: string;
  /** Tool name when calling the un-pathed `/v1/search` endpoint. */
  readonly search_tool_name?: string;
  /** Provider-specific extras. */
  readonly [key: string]: unknown;
}

/**
 * Search response. The proxy returns whatever shape the upstream provider
 * emits, so this is left intentionally untyped.
 */
export type SearchResponse = Readonly<Record<string, unknown>>;

/** Tools sub-namespace under `client.search.tools`. */
export interface SearchToolsNamespace {
  /** List configured search tools. */
  list(): Promise<Result<ListSearchToolsResponse, ApiError>>;
  /** Retrieve a single search tool by id. */
  get(searchToolId: string): Promise<Result<SearchToolInfo, ApiError>>;
  /** Create a new search tool. */
  create(req: CreateSearchToolRequest): Promise<Result<SearchTool, ApiError>>;
  /** Update an existing search tool. */
  update(
    searchToolId: string,
    req: UpdateSearchToolRequest,
  ): Promise<Result<SearchTool, ApiError>>;
  /** Delete a search tool by id. */
  delete(searchToolId: string): Promise<Result<unknown, ApiError>>;
  /** Probe a search tool with the supplied credentials. */
  testConnection(
    req: TestSearchToolConnectionRequest,
  ): Promise<Result<unknown, ApiError>>;
  /** List providers available for use in `litellm_params.search_provider`. */
  availableProviders(): Promise<Result<AvailableSearchProvidersResponse, ApiError>>;
}

/** Surface for the search endpoints on the `Client`. */
export interface SearchNamespace {
  /** Run a search using the tool named in the body. */
  query(req: SearchRequest): Promise<Result<SearchResponse, ApiError>>;
  /** Run a search using a tool named in the URL path. */
  queryWith(searchToolName: string, req: SearchRequest): Promise<Result<SearchResponse, ApiError>>;
  /** Discovery endpoint that returns enabled search tools. */
  enabledTools(): Promise<Result<unknown, ApiError>>;
  /** Search-tool administration sub-namespace (CRUD + connection test). */
  readonly tools: SearchToolsNamespace;
}

const encode = (s: string) => encodeURIComponent(s);

const createTools = (transport: Transport): SearchToolsNamespace => ({
  list() {
    return transport.request<ListSearchToolsResponse>({
      method: "GET",
      path: "/search_tools/list",
    });
  },
  get(searchToolId) {
    return transport.request<SearchToolInfo>({
      method: "GET",
      path: `/search_tools/${encode(searchToolId)}`,
    });
  },
  create(req) {
    return transport.request<SearchTool>({ method: "POST", path: "/search_tools", body: req });
  },
  update(searchToolId, req) {
    return transport.request<SearchTool>({
      method: "PUT",
      path: `/search_tools/${encode(searchToolId)}`,
      body: req,
    });
  },
  delete(searchToolId) {
    return transport.request<unknown>({
      method: "DELETE",
      path: `/search_tools/${encode(searchToolId)}`,
    });
  },
  testConnection(req) {
    return transport.request<unknown>({
      method: "POST",
      path: "/search_tools/test_connection",
      body: req,
    });
  },
  availableProviders() {
    return transport.request<AvailableSearchProvidersResponse>({
      method: "GET",
      path: "/search_tools/ui/available_providers",
    });
  },
});

/** Bind a `SearchNamespace` to a constructed `Transport`. */
export const createSearch = (transport: Transport): SearchNamespace => ({
  query(req) {
    return transport.request<SearchResponse>({
      method: "POST",
      path: "/v1/search",
      body: req,
    });
  },
  queryWith(searchToolName, req) {
    return transport.request<SearchResponse>({
      method: "POST",
      path: `/v1/search/${encode(searchToolName)}`,
      body: req,
    });
  },
  enabledTools() {
    return transport.request<unknown>({
      method: "GET",
      path: "/v1/search/tools",
    });
  },
  tools: createTools(transport),
});
