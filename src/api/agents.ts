import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Optional capabilities an A2A agent advertises in its agent card. */
export interface AgentCapabilities {
  readonly streaming?: boolean;
  readonly pushNotifications?: boolean;
  readonly stateTransitionHistory?: boolean;
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
  readonly inputModes?: readonly string[];
  readonly outputModes?: readonly string[];
}

/** Self-describing manifest for an agent (A2A spec). */
export interface AgentCard {
  readonly protocolVersion: string;
  readonly name: string;
  readonly description: string;
  readonly url: string;
  readonly version: string;
  readonly capabilities: AgentCapabilities;
  readonly defaultInputModes: readonly string[];
  readonly defaultOutputModes: readonly string[];
  readonly skills: readonly AgentSkill[];
  readonly preferredTransport?: string;
  readonly additionalInterfaces?: readonly Readonly<Record<string, unknown>>[];
  readonly iconUrl?: string;
  readonly provider?: Readonly<Record<string, unknown>>;
  readonly documentationUrl?: string;
  readonly securitySchemes?: Readonly<Record<string, unknown>>;
  readonly security?: readonly Readonly<Record<string, unknown>>[];
  readonly supportsAuthenticatedExtendedCard?: boolean;
}

/** Object-level permissions controlling what an agent can access. */
export interface AgentObjectPermission {
  readonly mcp_servers?: readonly string[];
  readonly mcp_access_groups?: readonly string[];
  readonly mcp_tool_permissions?: Readonly<Record<string, readonly string[]>>;
  readonly models?: readonly string[];
  readonly agents?: readonly string[];
}

/** Request body for `POST /v1/agents`. */
export interface CreateAgentRequest {
  /** Unique agent name. */
  readonly agent_name: string;
  readonly agent_card_params: AgentCard;
  /** LiteLLM-specific routing parameters. `make_public: true` shares the agent. */
  readonly litellm_params?: Readonly<Record<string, unknown>>;
  readonly object_permission?: AgentObjectPermission;
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
  readonly session_tpm_limit?: number;
  readonly session_rpm_limit?: number;
  readonly static_headers?: Readonly<Record<string, string>>;
  readonly extra_headers?: readonly string[];
}

/** Request body for `PUT /v1/agents/{id}`. Same shape as create. */
export type UpdateAgentRequest = CreateAgentRequest;

/** Request body for `PATCH /v1/agents/{id}`. All fields optional. */
export interface PatchAgentRequest {
  readonly agent_name?: string;
  readonly agent_card_params?: AgentCard;
  readonly litellm_params?: Readonly<Record<string, unknown>>;
  readonly object_permission?: AgentObjectPermission;
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
  readonly session_tpm_limit?: number;
  readonly session_rpm_limit?: number;
  readonly static_headers?: Readonly<Record<string, string>>;
  readonly extra_headers?: readonly string[];
}

/** A single agent record returned by `/v1/agents`. */
export interface Agent {
  readonly agent_id: string;
  readonly agent_name: string;
  readonly litellm_params?: Readonly<Record<string, unknown>>;
  readonly agent_card_params: Readonly<Record<string, unknown>>;
  readonly object_permission?: Readonly<Record<string, unknown>>;
  readonly spend?: number;
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
  readonly session_tpm_limit?: number;
  readonly session_rpm_limit?: number;
  readonly static_headers?: Readonly<Record<string, string>>;
  readonly extra_headers?: readonly string[];
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly created_by?: string;
  readonly updated_by?: string;
}

/** Query parameters for `GET /v1/agents`. */
export interface ListAgentsQuery {
  /** When `true`, filters out agents whose URL is unreachable. */
  readonly health_check?: boolean;
}

/** Request body for `POST /v1/agents/make_public` and `POST /v1/agents/{id}/make_public`. */
export interface MakeAgentsPublicRequest {
  readonly agent_ids: readonly string[];
}

/** Response from `POST /v1/agents/make_public`. */
export interface MakeAgentsPublicResponse {
  readonly message: string;
  readonly public_agent_groups: readonly string[];
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
  readonly id: string;
  readonly jsonrpc: string;
  readonly result?: Readonly<Record<string, unknown>>;
  readonly error?: Readonly<Record<string, unknown>>;
  /** Usage tracking added by LiteLLM. */
  readonly usage?: Readonly<Record<string, unknown>>;
}

/** Surface for the A2A agents API on the `Client`. */
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
  /** Mark a specific agent as public. */
  makePublic(
    agentId: string,
    req: MakeAgentsPublicRequest,
  ): Promise<Result<MakeAgentsPublicResponse, ApiError>>;
  /** Mark the supplied set of agents as public. */
  makePublicBulk(
    req: MakeAgentsPublicRequest,
  ): Promise<Result<MakeAgentsPublicResponse, ApiError>>;
  /** Fetch the public agent card for an agent. */
  agentCard(agentId: string): Promise<Result<AgentCard, ApiError>>;
  /** Send a JSON-RPC message to an agent (A2A). */
  sendMessage(
    agentId: string,
    req: A2aSendMessageRequest,
  ): Promise<Result<A2aSendMessageResponse, ApiError>>;
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
  makePublic(agentId, req) {
    return transport.request<MakeAgentsPublicResponse>({
      method: "POST",
      path: `/v1/agents/${encode(agentId)}/make_public`,
      body: req,
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
  sendMessage(agentId, req) {
    return transport.request<A2aSendMessageResponse>({
      method: "POST",
      path: `/v1/a2a/${encode(agentId)}/message/send`,
      body: req,
    });
  },
});
