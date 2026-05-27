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

/**
 * Wire-shape for credentials passed alongside an MCP server. The accepted
 * keys vary by `auth_type`; the upstream stores whatever the caller sends
 * and rejects only fully-bad shapes at request time. We keep the union
 * permissive so per-variant TypeScript narrowing on the request object stays
 * crisp without producing cross-variant excess-property errors.
 */
export interface McpCredentials {
  /** Raw value sent in the configured auth header (header-value schemes). */
  readonly auth_value?: string;
  /** OAuth2 client id. */
  readonly client_id?: string;
  /** OAuth2 client secret. */
  readonly client_secret?: string;
  /** OAuth2 scopes requested. */
  readonly scopes?: readonly string[];
  /** AWS access key id (SigV4). */
  readonly aws_access_key_id?: string;
  /** AWS secret access key (SigV4). */
  readonly aws_secret_access_key?: string;
  /** AWS session token (SigV4). */
  readonly aws_session_token?: string;
  /** AWS region used in the signature. */
  readonly aws_region_name?: string;
  /** AWS service used in the signature (e.g. `"bedrock-agentcore"`). */
  readonly aws_service_name?: string;
  /** IAM role ARN to assume. */
  readonly aws_role_name?: string;
  /** Session name used for STS AssumeRole, surfaced in CloudTrail. */
  readonly aws_session_name?: string;
  /** Token-exchange audience. */
  readonly audience?: string;
  /** IDP token endpoint that performs the exchange. */
  readonly token_exchange_endpoint?: string;
  /**
   * Subject token type sent to the IDP. Defaults to
   * `"urn:ietf:params:oauth:token-type:access_token"`.
   */
  readonly subject_token_type?: string;
}

/**
 * Auth-shape union for create/update requests. Discriminated by `auth_type`:
 * the top-level helper fields (OAuth2 URLs, `oauth2_flow`,
 * `delegate_auth_to_upstream`) are only present on the variants that honor
 * them. `credentials` is kept as a wide bag so callers don't fight excess
 * property checks across cross-variant intersections.
 */
export type McpAuthConfig =
  | {
    /** No auth, or a simple header-value scheme. */
    readonly auth_type?:
      | "none"
      | "api_key"
      | "bearer_token"
      | "basic"
      | "authorization"
      | "token";
    /** Credentials, keyed per the chosen auth scheme. */
    readonly credentials?: McpCredentials;
  }
  | {
    readonly auth_type: "oauth2";
    /** Credentials, keyed per the chosen auth scheme. */
    readonly credentials?: McpCredentials;
    /** OAuth2 authorization URL. */
    readonly authorization_url?: string;
    /** OAuth2 token URL. */
    readonly token_url?: string;
    /** Dynamic client registration URL. */
    readonly registration_url?: string;
    /**
     * OAuth2 grant flow. Defaults to the interactive `"authorization_code"`
     * flow; set to `"client_credentials"` for M2M.
     */
    readonly oauth2_flow?: McpOauth2Flow;
    /**
     * Forward the caller's bearer token to the upstream MCP server, bypassing
     * LiteLLM-side auth. Honored only when `auth_type === "oauth2"`.
     */
    readonly delegate_auth_to_upstream?: boolean;
  }
  | {
    readonly auth_type: "aws_sigv4";
    /** Credentials, keyed per the chosen auth scheme. */
    readonly credentials?: McpCredentials;
  }
  | {
    readonly auth_type: "oauth2_token_exchange";
    /** Credentials, keyed per the chosen auth scheme. */
    readonly credentials?: McpCredentials;
  };

/**
 * Transport-shape union for create/update requests. Discriminated by
 * `transport`.
 *
 * `stdio` requires `command` and `args`; the HTTP and SSE transports require
 * either `url` or `spec_path` (the second variant covers the spec-only case).
 */
export type McpTransportConfig =
  | {
    readonly transport: "stdio";
    /** Command to spawn. Restricted to an allowlist on the proxy. */
    readonly command: string;
    /** Arguments passed to the command. */
    readonly args: readonly string[];
    /** Environment variables set on the spawned process. */
    readonly env?: Readonly<Record<string, string>>;
  }
  | {
    readonly transport: "http" | "sse";
    /** Server URL. */
    readonly url: string;
    /** Optional path to a stored OpenAPI / MCP spec. */
    readonly spec_path?: string;
  }
  | {
    readonly transport: "http" | "sse";
    /** Server URL (omit when `spec_path` is provided). */
    readonly url?: string;
    /** Path to a stored OpenAPI / MCP spec. */
    readonly spec_path: string;
  };

/** Common fields shared by every MCP server, regardless of transport or auth. */
export interface McpServerCommonFields {
  /** Explicit server id. Defaults to a server-generated UUID. */
  readonly server_id?: string;
  /** Internal server name. */
  readonly server_name?: string;
  /** Friendly alias used in the admin UI. */
  readonly alias?: string;
  /** Free-form description. */
  readonly description?: string;
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
  /** Allow every key on the proxy to use the server. */
  readonly allow_all_keys?: boolean;
  /** Whether the server is reachable over the public internet. */
  readonly available_on_public_internet?: boolean;
  /** True when callers must supply their own API key (BYOK). */
  readonly is_byok?: boolean;
  /** Bullet points describing the BYOK requirements. */
  readonly byok_description?: readonly string[];
  /** URL pointing at provider documentation for obtaining a BYOK key. */
  readonly byok_api_key_help_url?: string;
  /** Public URL the server was sourced from (for hub listings). */
  readonly source_url?: string;
}

/**
 * Request body for `POST /v1/mcp/server`. Combines the always-allowed fields
 * with the transport-specific and auth-specific variants, so each chosen
 * transport / auth value unlocks only its valid fields.
 */
export type CreateMcpServerRequest =
  & McpServerCommonFields
  & McpTransportConfig
  & McpAuthConfig;

/** Request body for `PUT /v1/mcp/server`. Same shape, with `server_id` required. */
export type UpdateMcpServerRequest =
  & Omit<McpServerCommonFields, "server_id">
  & { readonly server_id: string }
  & McpTransportConfig
  & McpAuthConfig;

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

/** Response from `GET /v1/mcp/network/client-ip`. */
export interface McpClientIpResponse {
  /** Caller's IP as seen by the proxy. */
  readonly ip: string;
}

/**
 * Response from `GET /v1/mcp/openapi-registry`. Shape is the registry JSON
 * loaded from disk; admin-only.
 */
export interface McpOpenApiRegistryResponse {
  /** Registered OpenAPI APIs available to the OpenAPI MCP picker. */
  readonly apis: readonly Readonly<Record<string, unknown>>[];
}

/** Response from `GET /v1/mcp/registry.json` (public MCP registry). */
export interface McpPublicRegistryResponse {
  /** Registered server entries. */
  readonly servers?: readonly Readonly<Record<string, unknown>>[];
  /** Other top-level fields per the MCP registry spec. */
  readonly [key: string]: unknown;
}

/** Request body for storing a BYOK API-key credential. */
export interface StoreMcpUserCredentialRequest {
  /** Plaintext API key to store. */
  readonly credential: string;
  /** Persist the credential when true; when false the credential is not stored. */
  readonly save?: boolean;
}

/** Response from `POST` / `DELETE /v1/mcp/server/{server_id}/user-credential`. */
export interface McpUserCredentialResponse {
  /** Echo of the server id. */
  readonly server_id: string;
  /** Whether the credential is currently persisted. */
  readonly has_credential: boolean;
}

/** Request body for storing an OAuth2 BYOK credential. */
export interface StoreMcpOAuthUserCredentialRequest {
  /** OAuth2 access token. */
  readonly access_token: string;
  /** Optional refresh token. */
  readonly refresh_token?: string;
  /** Token lifetime in seconds. */
  readonly expires_in?: number;
  /** Granted OAuth2 scopes. */
  readonly scopes?: readonly string[];
}

/** Response from the OAuth2 user-credential endpoints. */
export interface McpOAuthUserCredentialStatus {
  /** Echo of the server id. */
  readonly server_id: string;
  /** Whether a credential is currently persisted. */
  readonly has_credential: boolean;
  /** Whether the persisted credential is past its expiry. */
  readonly is_expired: boolean;
  /** ISO-8601 expiry timestamp, when known. */
  readonly expires_at?: string | null;
  /** ISO-8601 timestamp when the credential was last refreshed. */
  readonly connected_at?: string | null;
}

/** A single entry returned by `GET /v1/mcp/user-credentials`. */
export interface McpUserCredentialListItem {
  /** Server id the credential belongs to. */
  readonly server_id: string;
  /** Persisted scopes for the credential. */
  readonly scopes?: readonly string[];
  /** ISO-8601 expiry timestamp. */
  readonly expires_at?: string | null;
  /** ISO-8601 timestamp the credential was last refreshed. */
  readonly connected_at?: string | null;
  /** Other proxy-provided fields. */
  readonly [key: string]: unknown;
}

/** Query parameters for `GET /v1/mcp/oauth/authorize`. */
export interface McpOAuthAuthorizeQuery {
  /** OAuth2 client identifier. */
  readonly client_id?: string;
  /** Redirect URI for the authorization response. */
  readonly redirect_uri: string;
  /** Must be `"code"`. */
  readonly response_type: "code";
  /** PKCE code challenge. */
  readonly code_challenge: string;
  /** Code challenge method (`"S256"` is required by the proxy). */
  readonly code_challenge_method?: "S256";
  /** Opaque state value echoed back to the redirect. */
  readonly state?: string;
  /** Target MCP server id. */
  readonly server_id?: string;
}

/** Request body for `POST /v1/mcp/oauth/token` (form-encoded by the proxy). */
export interface McpOAuthTokenRequest {
  /** Always `"authorization_code"`. */
  readonly grant_type: "authorization_code";
  /** Authorization code returned by `/v1/mcp/oauth/authorize`. */
  readonly code: string;
  /** Same redirect URI used to obtain the code. */
  readonly redirect_uri?: string;
  /** PKCE verifier matching the original challenge. */
  readonly code_verifier: string;
  /** OAuth2 client identifier. */
  readonly client_id?: string;
}

/** Response from `POST /v1/mcp/oauth/token`. */
export interface McpOAuthTokenResponse {
  /** Short-lived BYOK session JWT. */
  readonly access_token: string;
  /** Token kind, always `"Bearer"` for this endpoint. */
  readonly token_type: string;
  /** Token lifetime in seconds. */
  readonly expires_in: number;
  /** Granted scopes. */
  readonly scope?: string;
  /** Additional provider-specific fields. */
  readonly [key: string]: unknown;
}

/** Request body for `POST /v1/mcp/oauth/register` (Dynamic Client Registration). */
export interface McpOAuthRegisterRequest {
  /** Application name for the registering client. */
  readonly client_name?: string;
  /** Redirect URIs the client owns. */
  readonly redirect_uris?: readonly string[];
  /** Additional DCR fields per RFC 7591. */
  readonly [key: string]: unknown;
}

/** Response from `POST /v1/mcp/oauth/register`. */
export interface McpOAuthRegisterResponse {
  /** Issued OAuth2 client id. */
  readonly client_id: string;
  /** Issued client secret (when applicable). */
  readonly client_secret?: string;
  /** Echoed redirect URIs. */
  readonly redirect_uris?: readonly string[];
  /** Additional DCR fields. */
  readonly [key: string]: unknown;
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
  /** Returns the caller's IP as seen by the proxy. */
  clientIp(): Promise<Result<McpClientIpResponse, ApiError>>;
  /** Admin-only OpenAPI registry (well-known APIs with OAuth metadata). */
  openApiRegistry(): Promise<Result<McpOpenApiRegistryResponse, ApiError>>;
  /** Public MCP registry response. Available when the registry is enabled. */
  registryJson(): Promise<Result<McpPublicRegistryResponse, ApiError>>;
  /** List OAuth2 MCP credentials persisted for the calling user. */
  userCredentials(): Promise<Result<readonly McpUserCredentialListItem[], ApiError>>;
  /** Store or update the calling user's BYOK API key for an MCP server. */
  storeUserCredential(
    serverId: string,
    req: StoreMcpUserCredentialRequest,
  ): Promise<Result<McpUserCredentialResponse, ApiError>>;
  /** Delete the calling user's stored BYOK credential. */
  deleteUserCredential(
    serverId: string,
  ): Promise<Result<McpUserCredentialResponse, ApiError>>;
  /** Store or refresh the calling user's OAuth2 BYOK credential. */
  storeOAuthUserCredential(
    serverId: string,
    req: StoreMcpOAuthUserCredentialRequest,
  ): Promise<Result<McpOAuthUserCredentialStatus, ApiError>>;
  /** Revoke the calling user's OAuth2 BYOK credential. */
  deleteOAuthUserCredential(
    serverId: string,
  ): Promise<Result<McpOAuthUserCredentialStatus, ApiError>>;
  /** Probe whether the calling user has a stored OAuth2 credential. */
  oauthUserCredentialStatus(
    serverId: string,
  ): Promise<Result<McpOAuthUserCredentialStatus, ApiError>>;
  /**
   * GET form of the BYOK OAuth2 authorize endpoint. Returns the raw response
   * body since the proxy serves HTML for the consent screen rather than JSON.
   */
  oauthAuthorize(query: McpOAuthAuthorizeQuery): Promise<Result<unknown, ApiError>>;
  /** Exchange an authorization code for a BYOK session token. */
  oauthToken(req: McpOAuthTokenRequest): Promise<Result<McpOAuthTokenResponse, ApiError>>;
  /** Dynamic Client Registration entry point for OAuth2 clients. */
  oauthRegister(req: McpOAuthRegisterRequest): Promise<Result<McpOAuthRegisterResponse, ApiError>>;
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
  clientIp() {
    return transport.request<McpClientIpResponse>({
      method: "GET",
      path: "/v1/mcp/network/client-ip",
    });
  },
  openApiRegistry() {
    return transport.request<McpOpenApiRegistryResponse>({
      method: "GET",
      path: "/v1/mcp/openapi-registry",
    });
  },
  registryJson() {
    return transport.request<McpPublicRegistryResponse>({
      method: "GET",
      path: "/v1/mcp/registry.json",
    });
  },
  userCredentials() {
    return transport.request<readonly McpUserCredentialListItem[]>({
      method: "GET",
      path: "/v1/mcp/user-credentials",
    });
  },
  storeUserCredential(serverId, req) {
    return transport.request<McpUserCredentialResponse>({
      method: "POST",
      path: `/v1/mcp/server/${encode(serverId)}/user-credential`,
      body: req,
    });
  },
  deleteUserCredential(serverId) {
    return transport.request<McpUserCredentialResponse>({
      method: "DELETE",
      path: `/v1/mcp/server/${encode(serverId)}/user-credential`,
    });
  },
  storeOAuthUserCredential(serverId, req) {
    return transport.request<McpOAuthUserCredentialStatus>({
      method: "POST",
      path: `/v1/mcp/server/${encode(serverId)}/oauth-user-credential`,
      body: req,
    });
  },
  deleteOAuthUserCredential(serverId) {
    return transport.request<McpOAuthUserCredentialStatus>({
      method: "DELETE",
      path: `/v1/mcp/server/${encode(serverId)}/oauth-user-credential`,
    });
  },
  oauthUserCredentialStatus(serverId) {
    return transport.request<McpOAuthUserCredentialStatus>({
      method: "GET",
      path: `/v1/mcp/server/${encode(serverId)}/oauth-user-credential/status`,
    });
  },
  oauthAuthorize(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/v1/mcp/oauth/authorize",
      query: filterUndefined(query),
    });
  },
  oauthToken(req) {
    return transport.request<McpOAuthTokenResponse>({
      method: "POST",
      path: "/v1/mcp/oauth/token",
      body: req,
    });
  },
  oauthRegister(req) {
    return transport.request<McpOAuthRegisterResponse>({
      method: "POST",
      path: "/v1/mcp/oauth/register",
      body: req,
    });
  },
  servers: createServers(transport),
  toolsets: createToolsets(transport),
});
