import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Trust level for tool input. */
export type ToolInputPolicy = "trusted" | "untrusted" | "blocked";

/** Trust level for tool output. */
export type ToolOutputPolicy = "trusted" | "untrusted";

/** A row in the auto-discovered tool registry. */
export interface ToolRow {
  /** Server-assigned tool id. */
  readonly tool_id: string;
  /** Display name of the tool. */
  readonly tool_name: string;
  /** Origin descriptor (e.g. MCP server name). */
  readonly origin?: string;
  /** Current input policy. */
  readonly input_policy: ToolInputPolicy;
  /** Current output policy. */
  readonly output_policy: ToolOutputPolicy;
  /** Total invocations recorded. */
  readonly call_count: number;
  /** Assignment metadata block. */
  readonly assignments?: Readonly<Record<string, unknown>>;
  /** Hashed key that owns the tool, when key-scoped. */
  readonly key_hash?: string;
  /** Team that owns the tool, when team-scoped. */
  readonly team_id?: string;
  /** Friendly alias of the owning key. */
  readonly key_alias?: string;
  /** User agent string captured at last invocation. */
  readonly user_agent?: string;
  /** ISO-8601 timestamp of the last invocation. */
  readonly last_used_at?: string;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
  /** Identifier of the creating user. */
  readonly created_by?: string;
  /** Identifier of the last user to update. */
  readonly updated_by?: string;
}

/** A per-team/per-key policy override for a tool. */
export interface ToolPolicyOverride {
  /** Server-assigned override id. */
  readonly override_id: string;
  /** Tool the override applies to. */
  readonly tool_name: string;
  /** Team the override is scoped to. */
  readonly team_id?: string;
  /** Hashed key the override is scoped to. */
  readonly key_hash?: string;
  /** Friendly alias of the scoped key. */
  readonly key_alias?: string;
  /** Override input policy. */
  readonly input_policy: ToolInputPolicy;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
}

/** Response from `/v1/tool/list`. */
export interface ToolListResponse {
  /** Tools on the current page. */
  readonly tools: readonly ToolRow[];
  /** Total tool count across all pages. */
  readonly total: number;
}

/** Response from `/v1/tool/{name}/detail`. */
export interface ToolDetailResponse {
  /** Tool descriptor. */
  readonly tool: ToolRow;
  /** Policy overrides scoped to this tool. */
  readonly overrides: readonly ToolPolicyOverride[];
}

/** Single labelled policy option in `ToolPolicyOptionsResponse`. */
export interface ToolPolicyOption {
  /** Wire value of the option. */
  readonly value: string;
  /** Display label. */
  readonly label: string;
  /** Long-form description. */
  readonly description: string;
}

/** Response from `/v1/tool/policy/options`. */
export interface ToolPolicyOptionsResponse {
  /** Options for input policy selection. */
  readonly input_policies: readonly ToolPolicyOption[];
  /** Options for output policy selection. */
  readonly output_policies: readonly ToolPolicyOption[];
}

/**
 * Scope of a `/v1/tool/policy` update. Setting both `team_id` and `key_hash`
 * is rejected by the proxy; omitting both updates the global default. This
 * union encodes the three valid combinations.
 */
export type UpdateToolPolicyScope =
  | { readonly team_id?: never; readonly key_hash?: never; readonly key_alias?: never }
  | { readonly team_id: string; readonly key_hash?: never; readonly key_alias?: string }
  | { readonly team_id?: never; readonly key_hash: string; readonly key_alias?: string };

/** Request body for `/v1/tool/policy`. */
export type UpdateToolPolicyRequest =
  & {
    /** Tool to update. */
    readonly tool_name: string;
    /** Replacement input policy. */
    readonly input_policy?: ToolInputPolicy;
    /** Replacement output policy. */
    readonly output_policy?: ToolOutputPolicy;
  }
  & UpdateToolPolicyScope;

/** Response from `/v1/tool/policy`. */
export interface UpdateToolPolicyResponse {
  /** Tool that was updated. */
  readonly tool_name: string;
  /** Resulting input policy. */
  readonly input_policy?: ToolInputPolicy;
  /** Resulting output policy. */
  readonly output_policy?: ToolOutputPolicy;
  /** True when changes were applied. */
  readonly updated: boolean;
  /** Team scope of the update. */
  readonly team_id?: string;
  /** Hashed-key scope of the update. */
  readonly key_hash?: string;
}

/** One tool usage log row. */
export interface ToolUsageLogEntry {
  /** Server-assigned log id. */
  readonly id: string;
  /** ISO-8601 timestamp of the call. */
  readonly timestamp: string;
  /** Model used in the call. */
  readonly model?: string;
  /** Spend charged to the call, in USD. */
  readonly spend?: number;
  /** Total tokens consumed. */
  readonly total_tokens?: number;
  /** Truncated input preview captured for the call. */
  readonly input_snippet?: string;
}

/** Response from `/v1/tool/{name}/logs`. */
export interface ToolUsageLogsResponse {
  /** Log rows on the current page. */
  readonly logs: readonly ToolUsageLogEntry[];
  /** Total log count across all pages. */
  readonly total: number;
  /** Page number returned. */
  readonly page: number;
  /** Page size returned. */
  readonly page_size: number;
}

/** Query parameters for `/v1/tool/list`. */
export interface ListToolsQuery {
  /** Filter by current input policy. */
  readonly input_policy?: ToolInputPolicy;
}

/** Query parameters for `/v1/tool/{name}/logs`. */
export interface ToolLogsQuery {
  /** 1-based page number. */
  readonly page?: number;
  /** Page size. */
  readonly page_size?: number;
  /** ISO-8601 lower bound (inclusive). */
  readonly start_date?: string;
  /** ISO-8601 upper bound (inclusive). */
  readonly end_date?: string;
}

/** Scope for deleting a tool policy override (exactly one is required). */
export type DeleteToolOverrideScope =
  | { readonly team_id: string; readonly key_hash?: never }
  | { readonly key_hash: string; readonly team_id?: never };

/** Surface for tool policy administration on the `Client`. */
export interface ToolsNamespace {
  /** List static policy options (no DB call). */
  policyOptions(): Promise<Result<ToolPolicyOptionsResponse, ApiError>>;
  /** List discovered tools (optionally filtered by input policy). */
  list(query?: ListToolsQuery): Promise<Result<ToolListResponse, ApiError>>;
  /** Get a single tool by name. */
  get(toolName: string): Promise<Result<ToolRow, ApiError>>;
  /** Get tool with policy overrides (UI detail view). */
  detail(toolName: string): Promise<Result<ToolDetailResponse, ApiError>>;
  /** Recent usage logs for a tool. */
  logs(toolName: string, query?: ToolLogsQuery): Promise<Result<ToolUsageLogsResponse, ApiError>>;
  /** Update input or output policy for a tool. */
  updatePolicy(req: UpdateToolPolicyRequest): Promise<Result<UpdateToolPolicyResponse, ApiError>>;
  /** Delete a tool policy override scoped by team or key. */
  deleteOverride(
    toolName: string,
    scope: DeleteToolOverrideScope,
  ): Promise<Result<{ readonly deleted: boolean; readonly tool_name: string }, ApiError>>;
}

const encode = (s: string) => encodeURIComponent(s);

/** Bind a `ToolsNamespace` to a constructed `Transport`. */
export const createTools = (transport: Transport): ToolsNamespace => ({
  policyOptions() {
    return transport.request<ToolPolicyOptionsResponse>({
      method: "GET",
      path: "/v1/tool/policy/options",
    });
  },
  list(query) {
    return transport.request<ToolListResponse>({
      method: "GET",
      path: "/v1/tool/list",
      ...(query === undefined ? {} : { query }),
    });
  },
  get(toolName) {
    return transport.request<ToolRow>({
      method: "GET",
      path: `/v1/tool/${encode(toolName)}`,
    });
  },
  detail(toolName) {
    return transport.request<ToolDetailResponse>({
      method: "GET",
      path: `/v1/tool/${encode(toolName)}/detail`,
    });
  },
  logs(toolName, query) {
    return transport.request<ToolUsageLogsResponse>({
      method: "GET",
      path: `/v1/tool/${encode(toolName)}/logs`,
      ...(query === undefined ? {} : { query }),
    });
  },
  updatePolicy(req) {
    return transport.request<UpdateToolPolicyResponse>({
      method: "POST",
      path: "/v1/tool/policy",
      body: req,
    });
  },
  deleteOverride(toolName, scope) {
    return transport.request<{ readonly deleted: boolean; readonly tool_name: string }>({
      method: "DELETE",
      path: `/v1/tool/${encode(toolName)}/overrides`,
      query: scope,
    });
  },
});
