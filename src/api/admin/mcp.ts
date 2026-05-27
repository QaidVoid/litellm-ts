import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Wire transports supported by MCP servers. */
export type McpTransport = "sse" | "http" | "stdio";

/** Authentication scheme an MCP server expects. */
export type McpAuthType =
  | "none"
  | "api_key"
  | "bearer_token"
  | "basic"
  | "authorization"
  | "oauth2"
  | "aws_sigv4"
  | "token"
  | "oauth2_token_exchange";

/** OAuth2 grant flow when `auth_type === "oauth2"`. */
export type McpOauth2Flow = "client_credentials" | "authorization_code";

/** Credentials passed alongside an MCP server config. */
export interface McpCredentials {
  readonly auth_value?: string;
  readonly client_id?: string;
  readonly client_secret?: string;
  readonly scopes?: readonly string[];
  readonly aws_access_key_id?: string;
  readonly aws_secret_access_key?: string;
  readonly aws_session_token?: string;
  readonly aws_region_name?: string;
  readonly aws_service_name?: string;
  readonly aws_role_name?: string;
  readonly aws_session_name?: string;
  readonly audience?: string;
  readonly token_exchange_endpoint?: string;
  readonly subject_token_type?: string;
}

/** Request body for `POST /v1/mcp/server`. */
export interface CreateMcpServerRequest {
  readonly server_id?: string;
  readonly server_name?: string;
  readonly alias?: string;
  readonly description?: string;
  readonly transport?: McpTransport;
  readonly auth_type?: McpAuthType;
  readonly credentials?: McpCredentials;
  readonly url?: string;
  readonly spec_path?: string;
  readonly mcp_info?: Readonly<Record<string, unknown>>;
  readonly mcp_access_groups?: readonly string[];
  readonly allowed_tools?: readonly string[];
  readonly tool_name_to_display_name?: Readonly<Record<string, string>>;
  readonly tool_name_to_description?: Readonly<Record<string, string>>;
  readonly extra_headers?: readonly string[];
  readonly static_headers?: Readonly<Record<string, string>>;
  readonly instructions?: string;
  /** Required for `transport === "stdio"`. */
  readonly command?: string;
  /** Required for `transport === "stdio"`. */
  readonly args?: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
  readonly authorization_url?: string;
  readonly token_url?: string;
  readonly registration_url?: string;
  readonly oauth2_flow?: McpOauth2Flow;
  readonly allow_all_keys?: boolean;
  readonly available_on_public_internet?: boolean;
  readonly delegate_auth_to_upstream?: boolean;
  readonly is_byok?: boolean;
  readonly byok_description?: readonly string[];
  readonly byok_api_key_help_url?: string;
  readonly source_url?: string;
}

/** Request body for `PUT /v1/mcp/server`. Same shape, with `server_id` required. */
export interface UpdateMcpServerRequest extends Omit<CreateMcpServerRequest, "server_id"> {
  readonly server_id: string;
}

/** Server record returned by `/v1/mcp/server` (credentials redacted). */
export interface McpServer {
  readonly server_id: string;
  readonly server_name?: string;
  readonly alias?: string;
  readonly description?: string;
  readonly transport: McpTransport;
  readonly auth_type?: McpAuthType;
  readonly url?: string;
  readonly spec_path?: string;
  readonly mcp_info?: Readonly<Record<string, unknown>>;
  readonly mcp_access_groups?: readonly string[];
  readonly allowed_tools?: readonly string[];
  readonly approval_status?: "active" | "pending_review" | "rejected";
  readonly submitted_by?: string;
  readonly submitted_at?: string;
  readonly created_at?: string;
  readonly updated_at?: string;
}

/** Health row in the response to `GET /v1/mcp/server/health`. */
export interface McpServerHealthRow {
  readonly server_id: string;
  readonly status: "healthy" | "unhealthy" | "unknown" | null;
}

/** Request body for `POST /v1/mcp/make_public`. */
export interface MakeMcpServersPublicRequest {
  readonly mcp_server_ids: readonly string[];
}

/** Response from `POST /v1/mcp/make_public`. */
export interface MakeMcpServersPublicResponse {
  readonly message: string;
  readonly public_mcp_servers: readonly string[];
  readonly updated_by: string;
}

/** Query parameters for `GET /v1/mcp/server`. */
export interface ListMcpServersQuery {
  /** Restrict to MCP servers a team can access. */
  readonly team_id?: string;
}

/** Query parameters for `GET /v1/mcp/server/health`. */
export interface McpServerHealthQuery {
  /** When omitted, the proxy checks every accessible server. */
  readonly server_ids?: readonly string[];
}

/** Query parameters for `GET /v1/mcp/discover`. */
export interface McpDiscoverQuery {
  readonly query?: string;
  readonly category?: string;
}

/** Response from `GET /v1/mcp/discover`. */
export interface McpDiscoverResponse {
  readonly servers: readonly Readonly<Record<string, unknown>>[];
  readonly categories: readonly string[];
}

/** A pending submission summarized by `GET /v1/mcp/server/submissions`. */
export interface McpSubmissionsResponse {
  readonly submissions: readonly McpServer[];
  readonly count?: number;
}

/** A `{ server_id, tool_name }` pair stored inside a toolset. */
export interface McpToolsetTool {
  readonly server_id: string;
  readonly tool_name: string;
}

/** Request body for `POST /v1/mcp/toolset`. */
export interface CreateMcpToolsetRequest {
  readonly toolset_name: string;
  readonly description?: string;
  readonly tools?: readonly McpToolsetTool[];
}

/** Request body for `PUT /v1/mcp/toolset`. */
export interface UpdateMcpToolsetRequest {
  readonly toolset_id: string;
  readonly toolset_name?: string;
  readonly description?: string;
  readonly tools?: readonly McpToolsetTool[];
}

/** A toolset record (curated selection of `{server_id, tool_name}` pairs). */
export interface McpToolset {
  readonly toolset_id: string;
  readonly toolset_name: string;
  readonly description?: string;
  readonly tools: readonly McpToolsetTool[];
  readonly created_at?: string;
  readonly created_by?: string;
  readonly updated_at?: string;
  readonly updated_by?: string;
}

/** Server-administration sub-namespace under `client.mcp.servers`. */
export interface McpServersNamespace {
  /** List MCP servers. Filter by `team_id` to limit to a team's scope. */
  list(query?: ListMcpServersQuery): Promise<Result<readonly McpServer[], ApiError>>;
  /** Retrieve a server by id. */
  get(serverId: string): Promise<Result<McpServer, ApiError>>;
  /** Create a new server (admin). */
  create(req: CreateMcpServerRequest): Promise<Result<McpServer, ApiError>>;
  /** Update an existing server (admin). */
  update(req: UpdateMcpServerRequest): Promise<Result<McpServer, ApiError>>;
  /** Delete a server by id (admin). */
  delete(serverId: string): Promise<Result<unknown, ApiError>>;
  /** Health check for one or more servers. */
  health(query?: McpServerHealthQuery): Promise<Result<readonly McpServerHealthRow[], ApiError>>;
  /** Submit a server for admin review (non-admin keys). */
  register(req: CreateMcpServerRequest): Promise<Result<McpServer, ApiError>>;
  /** List pending submissions (admin). */
  submissions(): Promise<Result<McpSubmissionsResponse, ApiError>>;
  /** Approve a pending submission (admin). */
  approve(serverId: string): Promise<Result<McpServer, ApiError>>;
  /** Reject a pending submission (admin). */
  reject(serverId: string): Promise<Result<McpServer, ApiError>>;
}

/** Toolset-administration sub-namespace under `client.mcp.toolsets`. */
export interface McpToolsetsNamespace {
  /** List toolsets accessible to the calling key. */
  list(): Promise<Result<readonly McpToolset[], ApiError>>;
  /** Retrieve a toolset by id. */
  get(toolsetId: string): Promise<Result<McpToolset, ApiError>>;
  /** Create a new toolset (admin). */
  create(req: CreateMcpToolsetRequest): Promise<Result<McpToolset, ApiError>>;
  /** Update a toolset (admin). */
  update(req: UpdateMcpToolsetRequest): Promise<Result<McpToolset, ApiError>>;
  /** Delete a toolset by id (admin). */
  delete(toolsetId: string): Promise<Result<unknown, ApiError>>;
}

/** Surface for MCP server / toolset administration on the `Client`. */
export interface McpNamespace {
  /** List all MCP tools available to the calling key. */
  tools(): Promise<
    Result<{ readonly tools: readonly Readonly<Record<string, unknown>>[] }, ApiError>
  >;
  /** List all MCP access group names. */
  accessGroups(): Promise<Result<{ readonly access_groups: readonly string[] }, ApiError>>;
  /** Curated discovery of well-known MCP servers. */
  discover(query?: McpDiscoverQuery): Promise<Result<McpDiscoverResponse, ApiError>>;
  /** Mark a set of servers as public for AI Hub. */
  makePublic(
    req: MakeMcpServersPublicRequest,
  ): Promise<Result<MakeMcpServersPublicResponse, ApiError>>;
  readonly servers: McpServersNamespace;
  readonly toolsets: McpToolsetsNamespace;
}

const encode = (s: string) => encodeURIComponent(s);

const filterUndefined = <T extends object>(
  q: T,
): Readonly<Record<string, string | number | boolean | readonly string[]>> => {
  const out: Record<string, string | number | boolean | readonly string[]> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) out[k] = v as string | number | boolean | readonly string[];
  }
  return out;
};

const createServers = (transport: Transport): McpServersNamespace => ({
  list(query) {
    return transport.request<readonly McpServer[]>({
      method: "GET",
      path: "/v1/mcp/server",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  get(serverId) {
    return transport.request<McpServer>({
      method: "GET",
      path: `/v1/mcp/server/${encode(serverId)}`,
    });
  },
  create(req) {
    return transport.request<McpServer>({ method: "POST", path: "/v1/mcp/server", body: req });
  },
  update(req) {
    return transport.request<McpServer>({ method: "PUT", path: "/v1/mcp/server", body: req });
  },
  delete(serverId) {
    return transport.request<unknown>({
      method: "DELETE",
      path: `/v1/mcp/server/${encode(serverId)}`,
    });
  },
  health(query) {
    return transport.request<readonly McpServerHealthRow[]>({
      method: "GET",
      path: "/v1/mcp/server/health",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  register(req) {
    return transport.request<McpServer>({
      method: "POST",
      path: "/v1/mcp/server/register",
      body: req,
    });
  },
  submissions() {
    return transport.request<McpSubmissionsResponse>({
      method: "GET",
      path: "/v1/mcp/server/submissions",
    });
  },
  approve(serverId) {
    return transport.request<McpServer>({
      method: "PUT",
      path: `/v1/mcp/server/${encode(serverId)}/approve`,
    });
  },
  reject(serverId) {
    return transport.request<McpServer>({
      method: "PUT",
      path: `/v1/mcp/server/${encode(serverId)}/reject`,
    });
  },
});

const createToolsets = (transport: Transport): McpToolsetsNamespace => ({
  list() {
    return transport.request<readonly McpToolset[]>({
      method: "GET",
      path: "/v1/mcp/toolset",
    });
  },
  get(toolsetId) {
    return transport.request<McpToolset>({
      method: "GET",
      path: `/v1/mcp/toolset/${encode(toolsetId)}`,
    });
  },
  create(req) {
    return transport.request<McpToolset>({
      method: "POST",
      path: "/v1/mcp/toolset",
      body: req,
    });
  },
  update(req) {
    return transport.request<McpToolset>({
      method: "PUT",
      path: "/v1/mcp/toolset",
      body: req,
    });
  },
  delete(toolsetId) {
    return transport.request<unknown>({
      method: "DELETE",
      path: `/v1/mcp/toolset/${encode(toolsetId)}`,
    });
  },
});

/** Bind an `McpNamespace` to a constructed `Transport`. */
export const createMcp = (transport: Transport): McpNamespace => ({
  tools() {
    return transport.request<{ readonly tools: readonly Readonly<Record<string, unknown>>[] }>({
      method: "GET",
      path: "/v1/mcp/tools",
    });
  },
  accessGroups() {
    return transport.request<{ readonly access_groups: readonly string[] }>({
      method: "GET",
      path: "/v1/mcp/access_groups",
    });
  },
  discover(query) {
    return transport.request<McpDiscoverResponse>({
      method: "GET",
      path: "/v1/mcp/discover",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  makePublic(req) {
    return transport.request<MakeMcpServersPublicResponse>({
      method: "POST",
      path: "/v1/mcp/make_public",
      body: req,
    });
  },
  servers: createServers(transport),
  toolsets: createToolsets(transport),
});
