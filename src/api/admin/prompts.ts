import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Prompt-management integrations the proxy can route to. */
export type SupportedPromptIntegration =
  | "dotprompt"
  | "langfuse"
  | "custom"
  | "bitbucket"
  | "gitlab"
  | "generic_prompt_management"
  | "arize_phoenix";

/** Bookkeeping metadata stored alongside a prompt. */
export interface PromptInfo {
  /** Whether the prompt lives in config.yaml or the proxy database. */
  readonly prompt_type: "config" | "db";
  /** Deployment environment, e.g. `"development"`, `"staging"`, `"production"`. */
  readonly environment?: string;
  /** Free-form extras (the proxy accepts arbitrary additional keys). */
  readonly [key: string]: unknown;
}

/** LiteLLM-side configuration for a prompt. */
export interface PromptLiteLLMParams {
  /** Optional prompt id used to address the prompt in upstream systems. */
  readonly prompt_id?: string;
  /** Integration the prompt is fetched from. */
  readonly prompt_integration: string;
  /** Override the integration's API base URL. */
  readonly api_base?: string;
  /** Override the integration's API key. */
  readonly api_key?: string;
  /** Provider-specific query parameters forwarded with each lookup. */
  readonly provider_specific_query_params?: Readonly<Record<string, unknown>>;
  /** Skip passing the prompt manager's model to the upstream. */
  readonly ignore_prompt_manager_model?: boolean;
  /** Skip passing the prompt manager's optional params to the upstream. */
  readonly ignore_prompt_manager_optional_params?: boolean;
  /** Inline dotprompt file content (for `dotprompt` integrations). */
  readonly dotprompt_content?: string;
  /** Provider-specific extras forwarded unchanged. */
  readonly [key: string]: unknown;
}

/** A single prompt record returned by list / info endpoints. */
export interface PromptSpec {
  /** Stable prompt id. */
  readonly prompt_id: string;
  /** LiteLLM-side configuration. */
  readonly litellm_params: PromptLiteLLMParams;
  /** Storage metadata. */
  readonly prompt_info: PromptInfo;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
  /** Monotonic version number across edits. */
  readonly version?: number;
  /** Deployment environment, e.g. `"development"`. */
  readonly environment?: string;
  /** Identifier of the creating user. */
  readonly created_by?: string;
}

/** Raw template body the prompt resolves to. */
export interface PromptTemplate {
  /** LiteLLM-side prompt id. */
  readonly litellm_prompt_id: string;
  /** Rendered template content. */
  readonly content: string;
  /** Provider-specific metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Response from `GET /prompts/{id}`. */
export interface PromptInfoResponse {
  /** Prompt record. */
  readonly prompt_spec: PromptSpec;
  /** Resolved template, when available. */
  readonly raw_prompt_template?: PromptTemplate;
  /** Other environments the prompt is deployed to. */
  readonly environments?: readonly string[];
}

/** Response from `GET /prompts/list`. */
export interface ListPromptsResponse {
  /** Configured prompts. */
  readonly prompts: readonly PromptSpec[];
}

/** Response from `GET /prompts/{id}/versions`. */
export interface PromptVersionsResponse {
  /** Versioned snapshots, newest first. */
  readonly versions: readonly PromptSpec[];
}

/** Request body for `POST /prompts`. */
export interface CreatePromptRequest {
  /** Stable prompt id. */
  readonly prompt_id: string;
  /** LiteLLM-side configuration. */
  readonly litellm_params: PromptLiteLLMParams;
  /** Storage metadata; defaults to `{ prompt_type: "config" }`. */
  readonly prompt_info?: PromptInfo;
}

/** Request body for `PUT /prompts/{id}`. */
export type UpdatePromptRequest = CreatePromptRequest;

/** Request body for `PATCH /prompts/{id}`. */
export interface PatchPromptRequest {
  /** Partial update to the LiteLLM params. */
  readonly litellm_params?: PromptLiteLLMParams;
  /** Partial update to the prompt info. */
  readonly prompt_info?: PromptInfo;
}

/** Request body for `POST /prompts/test`. */
export interface TestPromptRequest {
  /** Inline dotprompt YAML source. */
  readonly dotprompt_content: string;
  /** Variables to interpolate into the prompt. */
  readonly prompt_variables?: Readonly<Record<string, unknown>>;
  /** Optional chat-style messages prepended to the prompt. */
  readonly conversation_history?: readonly Readonly<Record<string, string>>[];
}

/** Query parameters used by environment-aware prompt endpoints. */
export interface PromptEnvironmentQuery {
  /** Restrict the operation to a single environment. */
  readonly environment?: string;
}

/** File input accepted by `POST /utils/dotprompt_json_converter`. */
export type DotpromptFileInput = Blob | Uint8Array;

/** Surface for prompt registry administration on the `Client`. */
export interface PromptsNamespace {
  /** List prompts, optionally restricted to one environment. */
  list(query?: PromptEnvironmentQuery): Promise<Result<ListPromptsResponse, ApiError>>;
  /** Retrieve a single prompt (with optional environment filter). */
  get(
    promptId: string,
    query?: PromptEnvironmentQuery,
  ): Promise<Result<PromptInfoResponse, ApiError>>;
  /** List versioned snapshots for a prompt. */
  versions(
    promptId: string,
    query?: PromptEnvironmentQuery,
  ): Promise<Result<PromptVersionsResponse, ApiError>>;
  /** Create a new prompt. */
  create(req: CreatePromptRequest): Promise<Result<PromptSpec, ApiError>>;
  /** Replace a prompt (PUT semantics). */
  update(promptId: string, req: UpdatePromptRequest): Promise<Result<PromptSpec, ApiError>>;
  /** Apply a partial update to a prompt. */
  patch(
    promptId: string,
    req: PatchPromptRequest,
    query?: PromptEnvironmentQuery,
  ): Promise<Result<PromptSpec, ApiError>>;
  /** Delete a prompt (optionally restricted to one environment). */
  delete(
    promptId: string,
    query?: PromptEnvironmentQuery,
  ): Promise<Result<unknown, ApiError>>;
  /** Render a dotprompt-style prompt with the supplied variables. */
  test(req: TestPromptRequest): Promise<Result<unknown, ApiError>>;
  /** Convert a dotprompt file upload into JSON via `/utils/dotprompt_json_converter`. */
  dotpromptToJson(
    file: DotpromptFileInput,
    filename?: string,
  ): Promise<Result<unknown, ApiError>>;
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

const toBlob = (input: DotpromptFileInput): Blob =>
  input instanceof Blob ? input : new Blob([input as BlobPart]);

/** Bind a `PromptsNamespace` to a constructed `Transport`. */
export const createPrompts = (transport: Transport): PromptsNamespace => ({
  list(query) {
    return transport.request<ListPromptsResponse>({
      method: "GET",
      path: "/prompts/list",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  get(promptId, query) {
    return transport.request<PromptInfoResponse>({
      method: "GET",
      path: `/prompts/${encode(promptId)}`,
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  versions(promptId, query) {
    return transport.request<PromptVersionsResponse>({
      method: "GET",
      path: `/prompts/${encode(promptId)}/versions`,
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  create(req) {
    return transport.request<PromptSpec>({
      method: "POST",
      path: "/prompts",
      body: req,
    });
  },
  update(promptId, req) {
    return transport.request<PromptSpec>({
      method: "PUT",
      path: `/prompts/${encode(promptId)}`,
      body: req,
    });
  },
  patch(promptId, req, query) {
    return transport.request<PromptSpec>({
      method: "PATCH",
      path: `/prompts/${encode(promptId)}`,
      body: req,
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  delete(promptId, query) {
    return transport.request<unknown>({
      method: "DELETE",
      path: `/prompts/${encode(promptId)}`,
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  test(req) {
    return transport.request<unknown>({
      method: "POST",
      path: "/prompts/test",
      body: req,
    });
  },
  dotpromptToJson(file, filename) {
    const fd = new FormData();
    fd.append("file", toBlob(file), filename ?? "prompt.dotprompt");
    return transport.request<unknown>({
      method: "POST",
      path: "/utils/dotprompt_json_converter",
      body: fd,
    });
  },
});
