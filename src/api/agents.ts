import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Optional capabilities an A2A agent advertises in its agent card. */
export interface AgentCapabilities {
  /** Agent can serve streaming responses. */
  readonly streaming?: boolean;
  /** Agent can deliver push notifications to subscribed callers. */
  readonly pushNotifications?: boolean;
  /** Agent retains task state transitions for retrieval. */
  readonly stateTransitionHistory?: boolean;
  /** Vendor-specific capability extensions. */
  readonly extensions?: readonly Readonly<Record<string, unknown>>[];
}

/** A distinct capability the agent can perform. */
export interface AgentSkill {
  /** Stable skill identifier. */
  readonly id: string;
  /** Human-readable skill name. */
  readonly name: string;
  /** Short description used by routers. */
  readonly description: string;
  /** Free-form tags for discovery. */
  readonly tags: readonly string[];
  /** Sample prompts that exercise this skill. */
  readonly examples?: readonly string[];
  /** Accepted input modes (e.g. `"text"`, `"image"`). */
  readonly inputModes?: readonly string[];
  /** Produced output modes. */
  readonly outputModes?: readonly string[];
}

/** Self-describing manifest for an agent (A2A spec). */
export interface AgentCard {
  /** A2A protocol version the agent implements. */
  readonly protocolVersion: string;
  /** Display name. */
  readonly name: string;
  /** Long-form description used in catalogs. */
  readonly description: string;
  /** Canonical URL where the agent is hosted. */
  readonly url: string;
  /** Agent-author-defined version string. */
  readonly version: string;
  /** Capabilities the agent supports. */
  readonly capabilities: AgentCapabilities;
  /** Input modes accepted unless a skill overrides them. */
  readonly defaultInputModes: readonly string[];
  /** Output modes produced unless a skill overrides them. */
  readonly defaultOutputModes: readonly string[];
  /** Skills the agent exposes. */
  readonly skills: readonly AgentSkill[];
  /** Preferred transport (e.g. `"http+json"`). */
  readonly preferredTransport?: string;
  /** Alternative transports the agent also accepts. */
  readonly additionalInterfaces?: readonly Readonly<Record<string, unknown>>[];
  /** Icon URL for UI rendering. */
  readonly iconUrl?: string;
  /** Provider metadata block. */
  readonly provider?: Readonly<Record<string, unknown>>;
  /** Link to documentation. */
  readonly documentationUrl?: string;
  /** Declared security schemes. */
  readonly securitySchemes?: Readonly<Record<string, unknown>>;
  /** Security requirements applied to all interactions. */
  readonly security?: readonly Readonly<Record<string, unknown>>[];
  /** Whether the agent serves an authenticated extended card. */
  readonly supportsAuthenticatedExtendedCard?: boolean;
}

/** Object-level permissions controlling what an agent can access. */
export interface AgentObjectPermission {
  /** MCP servers the agent may reach. */
  readonly mcp_servers?: readonly string[];
  /** MCP access groups that authorize this agent. */
  readonly mcp_access_groups?: readonly string[];
  /** Per-server tool allowlists, keyed by MCP server name. */
  readonly mcp_tool_permissions?: Readonly<Record<string, readonly string[]>>;
  /** Models the agent may invoke. */
  readonly models?: readonly string[];
  /** Other agents this agent may delegate to. */
  readonly agents?: readonly string[];
}

/** Request body for `POST /v1/agents`. */
export interface CreateAgentRequest {
  /** Unique agent name. */
  readonly agent_name: string;
  /** Public agent card describing the agent's capabilities. */
  readonly agent_card_params: AgentCard;
  /** LiteLLM-specific routing parameters. `make_public: true` shares the agent. */
  readonly litellm_params?: Readonly<Record<string, unknown>>;
  /** Object-level permissions for downstream resources. */
  readonly object_permission?: AgentObjectPermission;
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Per-session tokens-per-minute ceiling. */
  readonly session_tpm_limit?: number;
  /** Per-session requests-per-minute ceiling. */
  readonly session_rpm_limit?: number;
  /** Headers sent on every outbound call to the agent. */
  readonly static_headers?: Readonly<Record<string, string>>;
  /** Incoming header names to forward to the agent. */
  readonly extra_headers?: readonly string[];
}

/** Request body for `PUT /v1/agents/{id}`. Same shape as create. */
export type UpdateAgentRequest = CreateAgentRequest;

/** Request body for `PATCH /v1/agents/{id}`. All fields optional. */
export interface PatchAgentRequest {
  /** Rename the agent. */
  readonly agent_name?: string;
  /** Replace the public agent card. */
  readonly agent_card_params?: AgentCard;
  /** Override LiteLLM routing parameters. */
  readonly litellm_params?: Readonly<Record<string, unknown>>;
  /** Replace object-level permissions. */
  readonly object_permission?: AgentObjectPermission;
  /** Update the tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Update the requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Update the per-session tokens-per-minute ceiling. */
  readonly session_tpm_limit?: number;
  /** Update the per-session requests-per-minute ceiling. */
  readonly session_rpm_limit?: number;
  /** Replace static outbound headers. */
  readonly static_headers?: Readonly<Record<string, string>>;
  /** Replace the forwarded header allowlist. */
  readonly extra_headers?: readonly string[];
}

/** A single agent record returned by `/v1/agents`. */
export interface Agent {
  /** Server-assigned id. */
  readonly agent_id: string;
  /** Display name. */
  readonly agent_name: string;
  /** Stored LiteLLM routing parameters. */
  readonly litellm_params?: Readonly<Record<string, unknown>>;
  /** Stored public agent card. */
  readonly agent_card_params: Readonly<Record<string, unknown>>;
  /** Stored object-level permissions. */
  readonly object_permission?: Readonly<Record<string, unknown>>;
  /** Accumulated spend in USD. */
  readonly spend?: number;
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Per-session tokens-per-minute ceiling. */
  readonly session_tpm_limit?: number;
  /** Per-session requests-per-minute ceiling. */
  readonly session_rpm_limit?: number;
  /** Static outbound headers. */
  readonly static_headers?: Readonly<Record<string, string>>;
  /** Forwarded header allowlist. */
  readonly extra_headers?: readonly string[];
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
  /** Identifier of the creating user. */
  readonly created_by?: string;
  /** Identifier of the last user to update. */
  readonly updated_by?: string;
}

/** Query parameters for `GET /v1/agents`. */
export interface ListAgentsQuery {
  /** When `true`, filters out agents whose URL is unreachable. */
  readonly health_check?: boolean;
}

/** Request body for `POST /v1/agents/make_public` and `POST /v1/agents/{id}/make_public`. */
export interface MakeAgentsPublicRequest {
  /** Agent ids to mark public. */
  readonly agent_ids: readonly string[];
}

/** Response from `POST /v1/agents/make_public`. */
export interface MakeAgentsPublicResponse {
  /** Human-readable status message. */
  readonly message: string;
  /** Public agent groups the agents were added to. */
  readonly public_agent_groups: readonly string[];
  /** Identifier of the user who performed the update. */
  readonly updated_by: string;
}

/** Request body for `POST /v1/a2a/{agent_id}/message/send`. */
export interface A2aSendMessageRequest {
  /** JSON-RPC id. */
  readonly id?: string;
  /** Always `"2.0"` for JSON-RPC envelopes. */
  readonly jsonrpc?: "2.0";
  /** Method name on the agent. Defaults to `"message/send"`. */
  readonly method?: string;
  /** Method parameters; A2A message envelope and metadata. */
  readonly params: Readonly<Record<string, unknown>>;
}

/** Response from `POST /v1/a2a/{agent_id}/message/send`. */
export interface A2aSendMessageResponse {
  /** JSON-RPC id matching the request. */
  readonly id: string;
  /** JSON-RPC version string. */
  readonly jsonrpc: string;
  /** Success payload from the agent. */
  readonly result?: Readonly<Record<string, unknown>>;
  /** JSON-RPC error envelope, when the call failed. */
  readonly error?: Readonly<Record<string, unknown>>;
  /** Usage tracking added by LiteLLM. */
  readonly usage?: Readonly<Record<string, unknown>>;
}

/** Query parameters for `GET /agent/daily/activity`. */
export interface AgentDailyActivityQuery {
  /** Comma-separated agent ids to include. */
  readonly agent_ids?: string;
  /** Inclusive start date (`YYYY-MM-DD`). */
  readonly start_date?: string;
  /** Inclusive end date (`YYYY-MM-DD`). */
  readonly end_date?: string;
  /** Restrict to a single model name. */
  readonly model?: string;
  /** Restrict to a single virtual key (hashed token). */
  readonly api_key?: string;
  /** 1-based page number. Default 1. */
  readonly page?: number;
  /** Page size. Default 10. */
  readonly page_size?: number;
  /** Comma-separated agent ids to exclude. */
  readonly exclude_agent_ids?: string;
}

/**
 * Surface for the A2A agents API on the `Client`.
 *
 * @beta The proxy tags every `/v1/agents/*` and `/a2a/*` endpoint as
 * beta; shapes may change between LiteLLM versions.
 */
export interface AgentsNamespace {
  /** List agents accessible to the calling key. */
  list(query?: ListAgentsQuery): Promise<Result<readonly Agent[], ApiError>>;
  /** Retrieve a single agent by id. */
  get(agentId: string): Promise<Result<Agent, ApiError>>;
  /** Create a new agent. */
  create(req: CreateAgentRequest): Promise<Result<Agent, ApiError>>;
  /** Replace an agent's configuration (full update). */
  update(agentId: string, req: UpdateAgentRequest): Promise<Result<Agent, ApiError>>;
  /** Apply a partial update to an agent. */
  patch(agentId: string, req: PatchAgentRequest): Promise<Result<Agent, ApiError>>;
  /** Delete an agent by id. */
  delete(agentId: string): Promise<Result<unknown, ApiError>>;
  /** Mark a specific agent as public. The agent id comes from the path; no body is sent. */
  makePublic(agentId: string): Promise<Result<MakeAgentsPublicResponse, ApiError>>;
  /** Mark the supplied set of agents as public. */
  makePublicBulk(
    req: MakeAgentsPublicRequest,
  ): Promise<Result<MakeAgentsPublicResponse, ApiError>>;
  /** Fetch the public agent card for an agent. */
  agentCard(agentId: string): Promise<Result<AgentCard, ApiError>>;
  /**
   * Legacy A2A discovery filename. Some clients fetch `/.well-known/agent.json`
   * instead of `/.well-known/agent-card.json`; this method targets that path.
   */
  agentCardLegacy(agentId: string): Promise<Result<AgentCard, ApiError>>;
  /** Send a JSON-RPC message to an agent (A2A). */
  sendMessage(
    agentId: string,
    req: A2aSendMessageRequest,
  ): Promise<Result<A2aSendMessageResponse, ApiError>>;
  /**
   * Generic A2A invocation at the bare `/a2a/{agent_id}` path. Returns the
   * untyped response since the body shape depends on the agent. The payload
   * follows the A2A request envelope (typically a JSON-RPC body).
   */
  invoke(agentId: string, req: unknown): Promise<Result<unknown, ApiError>>;
  /**
   * Paginated daily activity (spend / tokens / request counts) for the
   * caller's accessible agents. The response is dashboard-shaped and is
   * returned as `unknown`.
   */
  dailyActivity(
    query?: AgentDailyActivityQuery,
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

/** Bind an `AgentsNamespace` to a constructed `Transport`. */
export const createAgents = (transport: Transport): AgentsNamespace => ({
  list(query) {
    return transport.request<readonly Agent[]>({
      method: "GET",
      path: "/v1/agents",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  get(agentId) {
    return transport.request<Agent>({
      method: "GET",
      path: `/v1/agents/${encode(agentId)}`,
    });
  },
  create(req) {
    return transport.request<Agent>({ method: "POST", path: "/v1/agents", body: req });
  },
  update(agentId, req) {
    return transport.request<Agent>({
      method: "PUT",
      path: `/v1/agents/${encode(agentId)}`,
      body: req,
    });
  },
  patch(agentId, req) {
    return transport.request<Agent>({
      method: "PATCH",
      path: `/v1/agents/${encode(agentId)}`,
      body: req,
    });
  },
  delete(agentId) {
    return transport.request<unknown>({
      method: "DELETE",
      path: `/v1/agents/${encode(agentId)}`,
    });
  },
  makePublic(agentId) {
    return transport.request<MakeAgentsPublicResponse>({
      method: "POST",
      path: `/v1/agents/${encode(agentId)}/make_public`,
    });
  },
  makePublicBulk(req) {
    return transport.request<MakeAgentsPublicResponse>({
      method: "POST",
      path: "/v1/agents/make_public",
      body: req,
    });
  },
  agentCard(agentId) {
    return transport.request<AgentCard>({
      method: "GET",
      path: `/a2a/${encode(agentId)}/.well-known/agent-card.json`,
    });
  },
  agentCardLegacy(agentId) {
    return transport.request<AgentCard>({
      method: "GET",
      path: `/a2a/${encode(agentId)}/.well-known/agent.json`,
    });
  },
  sendMessage(agentId, req) {
    return transport.request<A2aSendMessageResponse>({
      method: "POST",
      path: `/v1/a2a/${encode(agentId)}/message/send`,
      body: req,
    });
  },
  invoke(agentId, req) {
    return transport.request<unknown>({
      method: "POST",
      path: `/a2a/${encode(agentId)}`,
      body: req,
    });
  },
  dailyActivity(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/agent/daily/activity",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
});
