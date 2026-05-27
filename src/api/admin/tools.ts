import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Trust level for tool input. */
export type ToolInputPolicy = "trusted" | "untrusted" | "blocked";

/** Trust level for tool output. */
export type ToolOutputPolicy = "trusted" | "untrusted";

/** A row in the auto-discovered tool registry. */
export interface ToolRow {
  readonly tool_id: string;
  readonly tool_name: string;
  readonly origin?: string;
  readonly input_policy: ToolInputPolicy;
  readonly output_policy: ToolOutputPolicy;
  readonly call_count: number;
  readonly assignments?: Readonly<Record<string, unknown>>;
  readonly key_hash?: string;
  readonly team_id?: string;
  readonly key_alias?: string;
  readonly user_agent?: string;
  readonly last_used_at?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly created_by?: string;
  readonly updated_by?: string;
}

/** A per-team/per-key policy override for a tool. */
export interface ToolPolicyOverride {
  readonly override_id: string;
  readonly tool_name: string;
  readonly team_id?: string;
  readonly key_hash?: string;
  readonly key_alias?: string;
  readonly input_policy: ToolInputPolicy;
  readonly created_at?: string;
  readonly updated_at?: string;
}

/** Response from `/v1/tool/list`. */
export interface ToolListResponse {
  readonly tools: readonly ToolRow[];
  readonly total: number;
}

/** Response from `/v1/tool/{name}/detail`. */
export interface ToolDetailResponse {
  readonly tool: ToolRow;
  readonly overrides: readonly ToolPolicyOverride[];
}

/** Single labelled policy option in `ToolPolicyOptionsResponse`. */
export interface ToolPolicyOption {
  readonly value: string;
  readonly label: string;
  readonly description: string;
}

/** Response from `/v1/tool/policy/options`. */
export interface ToolPolicyOptionsResponse {
  readonly input_policies: readonly ToolPolicyOption[];
  readonly output_policies: readonly ToolPolicyOption[];
}

/** Request body for `/v1/tool/policy`. */
export interface UpdateToolPolicyRequest {
  readonly tool_name: string;
  readonly input_policy?: ToolInputPolicy;
  readonly output_policy?: ToolOutputPolicy;
  readonly team_id?: string;
  readonly key_hash?: string;
  readonly key_alias?: string;
}

/** Response from `/v1/tool/policy`. */
export interface UpdateToolPolicyResponse {
  readonly tool_name: string;
  readonly input_policy?: ToolInputPolicy;
  readonly output_policy?: ToolOutputPolicy;
  readonly updated: boolean;
  readonly team_id?: string;
  readonly key_hash?: string;
}

/** One tool usage log row. */
export interface ToolUsageLogEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly model?: string;
  readonly spend?: number;
  readonly total_tokens?: number;
  readonly input_snippet?: string;
}

/** Response from `/v1/tool/{name}/logs`. */
export interface ToolUsageLogsResponse {
  readonly logs: readonly ToolUsageLogEntry[];
  readonly total: number;
  readonly page: number;
  readonly page_size: number;
}

/** Query parameters for `/v1/tool/list`. */
export interface ListToolsQuery {
  readonly input_policy?: ToolInputPolicy;
}

/** Query parameters for `/v1/tool/{name}/logs`. */
export interface ToolLogsQuery {
  readonly page?: number;
  readonly page_size?: number;
  readonly start_date?: string;
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

const filterUndefined = <T extends object>(
  q: T,
): Readonly<Record<string, string | number | boolean>> => {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) out[k] = v as string | number | boolean;
  }
  return out;
};

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
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
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
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
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
      query: filterUndefined(scope),
    });
  },
});
