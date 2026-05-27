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
  /** Raw auth value for token / bearer / api_key schemes. */
  readonly auth_value?: string;
  /** OAuth2 client id. */
  readonly client_id?: string;
  /** OAuth2 client secret. */
  readonly client_secret?: string;
  /** OAuth2 scopes requested. */
  readonly scopes?: readonly string[];
  /** AWS access key id (for SigV4). */
  readonly aws_access_key_id?: string;
  /** AWS secret access key. */
  readonly aws_secret_access_key?: string;
  /** AWS session token. */
  readonly aws_session_token?: string;
  /** AWS region name. */
  readonly aws_region_name?: string;
  /** AWS service name used in the SigV4 signature. */
  readonly aws_service_name?: string;
  /** IAM role to assume. */
  readonly aws_role_name?: string;
  /** Session name supplied to STS AssumeRole. */
  readonly aws_session_name?: string;
  /** Token-exchange audience. */
  readonly audience?: string;
  /** OAuth2 token-exchange endpoint URL. */
  readonly token_exchange_endpoint?: string;
  /** Subject token type used by token exchange. */
  readonly subject_token_type?: string;
}

/** Request body for `POST /v1/mcp/server`. */
export interface CreateMcpServerRequest {
  /** Explicit server id. Defaults to a server-generated UUID. */
  readonly server_id?: string;
  /** Internal server name. */
  readonly server_name?: string;
  /** Friendly alias used in the admin UI. */
  readonly alias?: string;
  /** Free-form description. */
  readonly description?: string;
  /** Wire transport. */
  readonly transport?: McpTransport;
  /** Authentication scheme. */
  readonly auth_type?: McpAuthType;
  /** Credentials matching the chosen auth scheme. */
  readonly credentials?: McpCredentials;
  /** Server URL (HTTP / SSE transports). */
  readonly url?: string;
  /** Optional path to a stored OpenAPI / MCP spec. */
  readonly spec_path?: string;
  /** Free-form metadata returned alongside the server record. */
  readonly mcp_info?: Readonly<Record<string, unknown>>;
  /** Access groups that authorize this server. */
  readonly mcp_access_groups?: readonly string[];
  /** Restrict callable tools to this list. */
  readonly allowed_tools?: readonly string[];
  /** Override display names per tool. */
  readonly tool_name_to_display_name?: Readonly<Record<string, string>>;
  /** Override descriptions per tool. */
  readonly tool_name_to_description?: Readonly<Record<string, string>>;
  /** Inbound header names to forward to the server. */
  readonly extra_headers?: readonly string[];
  /** Static outbound headers attached to every call. */
  readonly static_headers?: Readonly<Record<string, string>>;
  /** Instructions inserted before the server's tool list. */
  readonly instructions?: string;
  /** Required for `transport === "stdio"`. */
  readonly command?: string;
  /** Required for `transport === "stdio"`. */
  readonly args?: readonly string[];
  /** Environment variables for the spawned process. */
  readonly env?: Readonly<Record<string, string>>;
  /** OAuth2 authorization URL. */
  readonly authorization_url?: string;
  /** OAuth2 token URL. */
  readonly token_url?: string;
  /** Dynamic client registration URL. */
  readonly registration_url?: string;
  /** OAuth2 grant flow. */
  readonly oauth2_flow?: McpOauth2Flow;
  /** Allow every key on the proxy to use the server. */
  readonly allow_all_keys?: boolean;
  /** Whether the server is reachable over the public internet. */
  readonly available_on_public_internet?: boolean;
  /** Forward caller credentials to the upstream MCP server. */
  readonly delegate_auth_to_upstream?: boolean;
  /** True when callers must supply their own API key (BYOK). */
  readonly is_byok?: boolean;
  /** Bullet points describing the BYOK requirements. */
  readonly byok_description?: readonly string[];
  /** URL pointing at provider documentation for obtaining a BYOK key. */
  readonly byok_api_key_help_url?: string;
  /** Public URL the server was sourced from (for hub listings). */
  readonly source_url?: string;
}

/** Request body for `PUT /v1/mcp/server`. Same shape, with `server_id` required. */
export interface UpdateMcpServerRequest extends Omit<CreateMcpServerRequest, "server_id"> {
  /** Id of the server to update. */
  readonly server_id: string;
}

/** Server record returned by `/v1/mcp/server` (credentials redacted). */
export interface McpServer {
  /** Server-assigned id. */
  readonly server_id: string;
  /** Internal server name. */
  readonly server_name?: string;
  /** Friendly alias. */
  readonly alias?: string;
  /** Free-form description. */
  readonly description?: string;
  /** Wire transport. */
  readonly transport: McpTransport;
  /** Authentication scheme. */
  readonly auth_type?: McpAuthType;
  /** Server URL. */
  readonly url?: string;
  /** Stored OpenAPI / MCP spec path. */
  readonly spec_path?: string;
  /** Free-form metadata. */
  readonly mcp_info?: Readonly<Record<string, unknown>>;
  /** Access groups that authorize the server. */
  readonly mcp_access_groups?: readonly string[];
  /** Callable tool allowlist. */
  readonly allowed_tools?: readonly string[];
  /** Submission lifecycle status. */
  readonly approval_status?: "active" | "pending_review" | "rejected";
  /** Identifier of the user who submitted the server for review. */
  readonly submitted_by?: string;
  /** ISO-8601 submission timestamp. */
  readonly submitted_at?: string;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
}

/** Health row in the response to `GET /v1/mcp/server/health`. */
export interface McpServerHealthRow {
  /** Probed server id. */
  readonly server_id: string;
  /** Last health verdict. */
  readonly status: "healthy" | "unhealthy" | "unknown" | null;
}

/** Request body for `POST /v1/mcp/make_public`. */
export interface MakeMcpServersPublicRequest {
  /** Server ids to mark public. */
  readonly mcp_server_ids: readonly string[];
}

/** Response from `POST /v1/mcp/make_public`. */
export interface MakeMcpServersPublicResponse {
  /** Human-readable status message. */
  readonly message: string;
  /** Server ids now flagged public. */
  readonly public_mcp_servers: readonly string[];
  /** Identifier of the user who performed the update. */
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
  /** Free-text search term. */
  readonly query?: string;
  /** Filter by category. */
  readonly category?: string;
}

/** Response from `GET /v1/mcp/discover`. */
export interface McpDiscoverResponse {
  /** Discovered servers (untyped passthrough). */
  readonly servers: readonly Readonly<Record<string, unknown>>[];
  /** Categories available for filtering. */
  readonly categories: readonly string[];
}

/** A pending submission summarized by `GET /v1/mcp/server/submissions`. */
export interface McpSubmissionsResponse {
  /** Pending submissions. */
  readonly submissions: readonly McpServer[];
  /** Total submission count. */
  readonly count?: number;
}

/** A `{ server_id, tool_name }` pair stored inside a toolset. */
export interface McpToolsetTool {
  /** MCP server hosting the tool. */
  readonly server_id: string;
  /** Tool name on that server. */
  readonly tool_name: string;
}

/** Request body for `POST /v1/mcp/toolset`. */
export interface CreateMcpToolsetRequest {
  /** Unique toolset name. */
  readonly toolset_name: string;
  /** Free-form description. */
  readonly description?: string;
  /** Tools included in the toolset. */
  readonly tools?: readonly McpToolsetTool[];
}

/** Request body for `PUT /v1/mcp/toolset`. */
export interface UpdateMcpToolsetRequest {
  /** Id of the toolset to update. */
  readonly toolset_id: string;
  /** Rename the toolset. */
  readonly toolset_name?: string;
  /** Replace the description. */
  readonly description?: string;
  /** Replace the tool list. */
  readonly tools?: readonly McpToolsetTool[];
}

/** A toolset record (curated selection of `{server_id, tool_name}` pairs). */
export interface McpToolset {
  /** Server-assigned id. */
  readonly toolset_id: string;
  /** Toolset name. */
  readonly toolset_name: string;
  /** Free-form description. */
  readonly description?: string;
  /** Tools included in the toolset. */
  readonly tools: readonly McpToolsetTool[];
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** Identifier of the creating user. */
  readonly created_by?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
  /** Identifier of the last user to update. */
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
  /** MCP server CRUD, submissions, and approval workflow. */
  readonly servers: McpServersNamespace;
  /** Curated tool-set administration. */
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
