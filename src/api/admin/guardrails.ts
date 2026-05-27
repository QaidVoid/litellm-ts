import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Per-call guardrail mode supported by the proxy. */
export type GuardrailMode =
  | "pre_call"
  | "during_call"
  | "post_call"
  | "logging_only"
  | "pre_mcp_call"
  | "during_mcp_call"
  | "realtime_input_transcription";

/** Whether a guardrail definition lives in the database or in config.yaml. */
export type GuardrailDefinitionLocation = "db" | "config";

/**
 * Wire shape for a guardrail's `litellm_params` block. The proxy accepts
 * provider-specific keys (e.g. AWS Bedrock identifiers, Presidio settings,
 * OpenAI moderation thresholds) so this is left as a permissive bag.
 */
export interface GuardrailLitellmParams {
  /** Provider id, e.g. `"bedrock"`, `"presidio"`, `"aporia"`. */
  readonly guardrail: string;
  /** Lifecycle phase the guardrail fires in. */
  readonly mode?: GuardrailMode;
  /** When true the guardrail runs on every request by default. */
  readonly default_on?: boolean;
  /** Provider-specific extras forwarded as-is. */
  readonly [key: string]: unknown;
}

/** Full guardrail record as accepted by create/update and returned by retrieve. */
export interface Guardrail {
  /** Server-assigned id; absent on create payloads. */
  readonly guardrail_id?: string;
  /** Unique guardrail name. */
  readonly guardrail_name: string;
  /** LiteLLM-side configuration. */
  readonly litellm_params: GuardrailLitellmParams;
  /** Free-form metadata (description, tags, etc.). */
  readonly guardrail_info?: Readonly<Record<string, unknown>>;
  /** Optional policy template the guardrail derives from. */
  readonly policy_template?: string;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
}

/** A single guardrail entry returned by listing endpoints. */
export interface GuardrailInfo {
  /** Server-assigned id, when the guardrail lives in the database. */
  readonly guardrail_id?: string;
  /** Configured guardrail name. */
  readonly guardrail_name: string;
  /** LiteLLM-side configuration. */
  readonly litellm_params?: Readonly<Record<string, unknown>>;
  /** Free-form metadata. */
  readonly guardrail_info?: Readonly<Record<string, unknown>>;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
  /** Where the definition lives. Defaults to `"config"`. */
  readonly guardrail_definition_location?: GuardrailDefinitionLocation;
}

/** Response from `GET /guardrails/list` and `GET /v2/guardrails/list`. */
export interface ListGuardrailsResponse {
  /** Configured guardrails. */
  readonly guardrails: readonly GuardrailInfo[];
}

/** Request body for `POST /guardrails`. */
export interface CreateGuardrailRequest {
  /** Guardrail to create. */
  readonly guardrail: Guardrail;
}

/** Request body for `PUT /guardrails/{id}`. */
export interface UpdateGuardrailRequest {
  /** Replacement guardrail definition. */
  readonly guardrail: Guardrail;
}

/** Request body for `PATCH /guardrails/{id}` (partial update). */
export interface PatchGuardrailRequest {
  /** Replace the guardrail name. */
  readonly guardrail_name?: string;
  /** Replace the LiteLLM params block. */
  readonly litellm_params?: GuardrailLitellmParams;
  /** Replace the metadata bag. */
  readonly guardrail_info?: Readonly<Record<string, unknown>>;
}

/** Request body for `POST /guardrails/register` (submit for admin review). */
export interface RegisterGuardrailRequest {
  /** Guardrail being submitted. */
  readonly guardrail: Guardrail;
}

/** Query parameters for `GET /guardrails/submissions`. */
export interface ListGuardrailSubmissionsQuery {
  /** Filter by submission lifecycle status. */
  readonly status?: "pending_review" | "active" | "rejected";
  /** Restrict to a single team. */
  readonly team_id?: string;
  /** Free-text search across name and description. */
  readonly search?: string;
}

/** Request body for `POST /apply_guardrail`. */
export interface ApplyGuardrailRequest {
  /** Configured guardrail name to invoke. */
  readonly guardrail_name: string;
  /** Free-form text input to scan. */
  readonly text: string;
  /** ISO-639-1 language hint (PII guardrails). */
  readonly language?: string;
  /** PII entity types to detect (Presidio-style guardrails). */
  readonly entities?: readonly string[];
  /** Whether the input is a `"request"` or `"response"`. */
  readonly input_type?: "request" | "response";
  /** Optional chat-style messages forwarded to the guardrail. */
  readonly messages?: readonly Readonly<Record<string, unknown>>[];
}

/** Response from `POST /apply_guardrail`. */
export interface ApplyGuardrailResponse {
  /** Text returned by the guardrail (possibly redacted). */
  readonly response_text: string;
}

/** Request body for `POST /guardrails/test_custom_code`. */
export interface TestCustomCodeGuardrailRequest {
  /** Python-like source containing an `apply_guardrail` function. */
  readonly custom_code: string;
  /** Test input passed to the guardrail (typically `{ texts: [...] }`). */
  readonly test_input: Readonly<Record<string, unknown>>;
  /** Whether the input represents a `"request"` or `"response"`. Default `"request"`. */
  readonly input_type?: "request" | "response";
  /** Optional mock request_data (model, user_id, team_id, metadata, ...). */
  readonly request_data?: Readonly<Record<string, unknown>>;
}

/** Response from `POST /guardrails/test_custom_code`. */
export interface TestCustomCodeGuardrailResponse {
  /** True when the snippet compiled and ran without error. */
  readonly success: boolean;
  /** Guardrail decision (action, reason, modified texts, ...). */
  readonly result?: Readonly<Record<string, unknown>>;
  /** Error message when `success === false`. */
  readonly error?: string;
  /** Kind of error, e.g. `"compilation"` or `"execution"`. */
  readonly error_type?: string;
}

/** Request body for `POST /guardrails/validate_blocked_words_file`. */
export interface ValidateBlockedWordsFileRequest {
  /** YAML payload to validate. */
  readonly file_content: string;
}

/** Response from `POST /guardrails/validate_blocked_words_file`. */
export interface ValidateBlockedWordsFileResponse {
  /** True when the file parses and matches the expected schema. */
  readonly valid: boolean;
  /** Success summary when `valid === true`. */
  readonly message?: string;
  /** Single error string for top-level failures. */
  readonly error?: string;
  /** List of per-entry validation errors. */
  readonly errors?: readonly string[];
}

/** Query parameters for `/guardrails/usage/*` endpoints. */
export interface GuardrailUsageQuery {
  /** Inclusive start date in `YYYY-MM-DD`. Defaults to seven days ago. */
  readonly start_date?: string;
  /** Inclusive end date in `YYYY-MM-DD`. Defaults to today. */
  readonly end_date?: string;
}

/** A single row in `GuardrailUsageOverviewResponse.rows`. */
export interface GuardrailUsageOverviewRow {
  /** Guardrail id. */
  readonly id: string;
  /** Configured guardrail name. */
  readonly name: string;
  /** Guardrail kind, e.g. `"presidio"`. */
  readonly type: string;
  /** Provider id, e.g. `"openai"`. */
  readonly provider: string;
  /** Total requests evaluated in the window. */
  readonly requestsEvaluated: number;
  /** Percentage of requests that failed the guardrail. */
  readonly failRate: number;
  /** Average guardrail score across the window. */
  readonly avgScore: number | null;
  /** Average evaluation latency in ms. */
  readonly avgLatency: number | null;
  /** Computed status, one of `"healthy"`, `"warning"`, `"critical"`. */
  readonly status: string;
  /** Trend vs the previous window: `"up"`, `"down"`, `"stable"`. */
  readonly trend: string;
}

/** Response from `GET /guardrails/usage/overview`. */
export interface GuardrailUsageOverviewResponse {
  /** Per-guardrail summary rows. */
  readonly rows: readonly GuardrailUsageOverviewRow[];
  /** Per-day stacked counts (`[{ date, passed, blocked }]`). */
  readonly chart: readonly Readonly<Record<string, unknown>>[];
  /** Total requests across all guardrails. */
  readonly totalRequests: number;
  /** Total requests blocked across all guardrails. */
  readonly totalBlocked: number;
  /** Overall pass percentage. */
  readonly passRate: number;
}

/** Response from `GET /guardrails/usage/detail/{id}`. */
export interface GuardrailUsageDetailResponse {
  /** Guardrail id. */
  readonly guardrail_id: string;
  /** Configured guardrail name. */
  readonly guardrail_name: string;
  /** Guardrail kind. */
  readonly type: string;
  /** Provider id. */
  readonly provider: string;
  /** Total requests evaluated. */
  readonly requestsEvaluated: number;
  /** Failure percentage in the window. */
  readonly failRate: number;
  /** Average score. */
  readonly avgScore: number | null;
  /** Average evaluation latency in ms. */
  readonly avgLatency: number | null;
  /** Status string. */
  readonly status: string;
  /** Trend string. */
  readonly trend: string;
  /** Free-form description. */
  readonly description: string | null;
  /** Daily time-series rows. */
  readonly time_series: readonly Readonly<Record<string, unknown>>[];
}

/** Query parameters for `GET /guardrails/usage/logs`. */
export interface GuardrailUsageLogsQuery {
  /** Restrict logs to a single guardrail. */
  readonly guardrail_id?: string;
  /** Inclusive start date `YYYY-MM-DD`. */
  readonly start_date?: string;
  /** Inclusive end date `YYYY-MM-DD`. */
  readonly end_date?: string;
  /** Page number (1-indexed). Default 1. */
  readonly page?: number;
  /** Page size. */
  readonly page_size?: number;
}

/** One log row in `GuardrailUsageLogsResponse.logs`. */
export interface GuardrailUsageLogEntry {
  /** Request id (`request_id` in spend logs). */
  readonly id: string;
  /** ISO-8601 evaluation timestamp. */
  readonly timestamp: string;
  /** Decision: `"blocked"`, `"passed"`, `"flagged"`. */
  readonly action: string;
  /** Guardrail score. */
  readonly score: number | null;
  /** Evaluation latency in ms. */
  readonly latency_ms: number | null;
  /** Model that the request targeted. */
  readonly model: string | null;
  /** Short prefix of the input text. */
  readonly input_snippet: string | null;
  /** Short prefix of the output text. */
  readonly output_snippet: string | null;
  /** Optional human-readable reason. */
  readonly reason: string | null;
}

/** Response from `GET /guardrails/usage/logs`. */
export interface GuardrailUsageLogsResponse {
  /** Returned log rows. */
  readonly logs: readonly GuardrailUsageLogEntry[];
  /** Total rows matching the filter. */
  readonly total: number;
  /** Current page. */
  readonly page: number;
  /** Page size. */
  readonly page_size: number;
}

/** Submissions sub-namespace under `client.guardrails.submissions`. */
export interface GuardrailSubmissionsNamespace {
  /** List submissions filtered by status / team / search term. */
  list(query?: ListGuardrailSubmissionsQuery): Promise<Result<unknown, ApiError>>;
  /** Retrieve a single submission by id. */
  get(guardrailId: string): Promise<Result<Guardrail, ApiError>>;
  /** Approve a pending submission (admin). */
  approve(guardrailId: string): Promise<Result<Guardrail, ApiError>>;
  /** Reject a pending submission (admin). */
  reject(guardrailId: string): Promise<Result<Guardrail, ApiError>>;
}

/** Usage analytics sub-namespace under `client.guardrails.usage`. */
export interface GuardrailUsageNamespace {
  /** Overview rows + chart + totals for the supplied window. */
  overview(
    query?: GuardrailUsageQuery,
  ): Promise<Result<GuardrailUsageOverviewResponse, ApiError>>;
  /** Detail page for a single guardrail in the supplied window. */
  detail(
    guardrailId: string,
    query?: GuardrailUsageQuery,
  ): Promise<Result<GuardrailUsageDetailResponse, ApiError>>;
  /** Paginated recent evaluation log rows. */
  logs(
    query?: GuardrailUsageLogsQuery,
  ): Promise<Result<GuardrailUsageLogsResponse, ApiError>>;
  /**
   * Policy-level usage overview (`/policies/usage/overview`). Same payload
   * shape as `overview` but rows describe policies rather than guardrails.
   */
  policiesOverview(
    query?: GuardrailUsageQuery,
  ): Promise<Result<GuardrailUsageOverviewResponse, ApiError>>;
}

/** Surface for guardrail administration on the `Client`. */
export interface GuardrailsNamespace {
  /** List configured guardrails. */
  list(): Promise<Result<ListGuardrailsResponse, ApiError>>;
  /** List configured guardrails using the newer v2 response shape. */
  listV2(): Promise<Result<ListGuardrailsResponse, ApiError>>;
  /** Create a new guardrail (admin). */
  create(req: CreateGuardrailRequest): Promise<Result<Guardrail, ApiError>>;
  /** Retrieve a guardrail by id. */
  get(guardrailId: string): Promise<Result<Guardrail, ApiError>>;
  /** Replace a guardrail (PUT semantics). */
  update(
    guardrailId: string,
    req: UpdateGuardrailRequest,
  ): Promise<Result<Guardrail, ApiError>>;
  /** Apply a partial update to a guardrail. */
  patch(
    guardrailId: string,
    req: PatchGuardrailRequest,
  ): Promise<Result<Guardrail, ApiError>>;
  /** Delete a guardrail by id. */
  delete(guardrailId: string): Promise<Result<unknown, ApiError>>;
  /** Fetch a guardrail with extended metadata (UI detail view). */
  info(guardrailId: string): Promise<Result<GuardrailInfo, ApiError>>;
  /** Submit a guardrail for admin review (non-admin keys). */
  register(req: RegisterGuardrailRequest): Promise<Result<Guardrail, ApiError>>;
  /** Run a configured guardrail synchronously against input text. */
  apply(req: ApplyGuardrailRequest): Promise<Result<ApplyGuardrailResponse, ApiError>>;
  /** Sandbox-execute custom guardrail code without persisting it. */
  testCustomCode(
    req: TestCustomCodeGuardrailRequest,
  ): Promise<Result<TestCustomCodeGuardrailResponse, ApiError>>;
  /** Validate a blocked-words YAML file. */
  validateBlockedWordsFile(
    req: ValidateBlockedWordsFileRequest,
  ): Promise<Result<ValidateBlockedWordsFileResponse, ApiError>>;
  /** Submission workflow sub-namespace. */
  readonly submissions: GuardrailSubmissionsNamespace;
  /** Usage analytics sub-namespace. */
  readonly usage: GuardrailUsageNamespace;
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

const createSubmissions = (transport: Transport): GuardrailSubmissionsNamespace => ({
  list(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/guardrails/submissions",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  get(guardrailId) {
    return transport.request<Guardrail>({
      method: "GET",
      path: `/guardrails/submissions/${encode(guardrailId)}`,
    });
  },
  approve(guardrailId) {
    return transport.request<Guardrail>({
      method: "POST",
      path: `/guardrails/submissions/${encode(guardrailId)}/approve`,
    });
  },
  reject(guardrailId) {
    return transport.request<Guardrail>({
      method: "POST",
      path: `/guardrails/submissions/${encode(guardrailId)}/reject`,
    });
  },
});

const createUsage = (transport: Transport): GuardrailUsageNamespace => ({
  overview(query) {
    return transport.request<GuardrailUsageOverviewResponse>({
      method: "GET",
      path: "/guardrails/usage/overview",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  detail(guardrailId, query) {
    return transport.request<GuardrailUsageDetailResponse>({
      method: "GET",
      path: `/guardrails/usage/detail/${encode(guardrailId)}`,
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  logs(query) {
    return transport.request<GuardrailUsageLogsResponse>({
      method: "GET",
      path: "/guardrails/usage/logs",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  policiesOverview(query) {
    return transport.request<GuardrailUsageOverviewResponse>({
      method: "GET",
      path: "/policies/usage/overview",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
});

/** Bind a `GuardrailsNamespace` to a constructed `Transport`. */
export const createGuardrails = (transport: Transport): GuardrailsNamespace => ({
  list() {
    return transport.request<ListGuardrailsResponse>({
      method: "GET",
      path: "/guardrails/list",
    });
  },
  listV2() {
    return transport.request<ListGuardrailsResponse>({
      method: "GET",
      path: "/v2/guardrails/list",
    });
  },
  create(req) {
    return transport.request<Guardrail>({
      method: "POST",
      path: "/guardrails",
      body: req,
    });
  },
  get(guardrailId) {
    return transport.request<Guardrail>({
      method: "GET",
      path: `/guardrails/${encode(guardrailId)}`,
    });
  },
  update(guardrailId, req) {
    return transport.request<Guardrail>({
      method: "PUT",
      path: `/guardrails/${encode(guardrailId)}`,
      body: req,
    });
  },
  patch(guardrailId, req) {
    return transport.request<Guardrail>({
      method: "PATCH",
      path: `/guardrails/${encode(guardrailId)}`,
      body: req,
    });
  },
  delete(guardrailId) {
    return transport.request<unknown>({
      method: "DELETE",
      path: `/guardrails/${encode(guardrailId)}`,
    });
  },
  info(guardrailId) {
    return transport.request<GuardrailInfo>({
      method: "GET",
      path: `/guardrails/${encode(guardrailId)}/info`,
    });
  },
  register(req) {
    return transport.request<Guardrail>({
      method: "POST",
      path: "/guardrails/register",
      body: req,
    });
  },
  apply(req) {
    return transport.request<ApplyGuardrailResponse>({
      method: "POST",
      path: "/apply_guardrail",
      body: req,
    });
  },
  testCustomCode(req) {
    return transport.request<TestCustomCodeGuardrailResponse>({
      method: "POST",
      path: "/guardrails/test_custom_code",
      body: req,
    });
  },
  validateBlockedWordsFile(req) {
    return transport.request<ValidateBlockedWordsFileResponse>({
      method: "POST",
      path: "/guardrails/validate_blocked_words_file",
      body: req,
    });
  },
  submissions: createSubmissions(transport),
  usage: createUsage(transport),
});
