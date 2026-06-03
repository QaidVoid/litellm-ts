import type { AgentCard } from "./agents.ts";
import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** A single configurable credential field shown in the admin UI. */
export interface CredentialField {
  readonly key: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly tooltip?: string;
  readonly required: boolean;
  readonly field_type: "text" | "password" | "select" | "upload" | "textarea";
  readonly options?: readonly string[];
  readonly default_value?: string;
}

/** Provider catalog entry from `GET /public/providers/fields`. */
export interface ProviderCreateInfo {
  readonly provider: string;
  readonly provider_display_name: string;
  readonly litellm_provider: string;
  readonly credential_fields: readonly CredentialField[];
  readonly default_model_placeholder?: string;
}

/** Agent catalog entry from `GET /public/agents/fields`. */
export interface AgentCreateInfo {
  readonly agent_type: string;
  readonly agent_type_display_name: string;
  readonly description?: string;
  readonly logo_url?: string;
  readonly credential_fields: readonly CredentialField[];
  readonly litellm_params_template?: Readonly<Record<string, string>>;
  readonly model_template?: string;
}

/** A provider that supports a given endpoint. */
export interface EndpointProvider {
  readonly slug: string;
  readonly display_name: string;
}

/** One supported endpoint and the providers that back it. */
export interface SupportedEndpoint {
  readonly key: string;
  readonly label: string;
  readonly endpoint: string;
  readonly providers: readonly EndpointProvider[];
}

/** Response from `GET /public/endpoints`. */
export interface SupportedEndpointsResponse {
  readonly endpoints: readonly SupportedEndpoint[];
}

/** Response from `GET /public/model_hub/info`. */
export interface PublicModelHubInfo {
  readonly docs_title: string;
  readonly custom_docs_description?: string | null;
  readonly litellm_version: string;
  /** Display name -> URL, or display name -> `{ url, index }`. */
  readonly useful_links?:
    | Readonly<Record<string, string | Readonly<Record<string, unknown>>>>
    | null;
}

/** A public-safe MCP server entry from `GET /public/mcp_hub`. */
export interface MCPPublicServer {
  readonly server_id: string;
  readonly name: string;
  readonly alias?: string;
  readonly server_name?: string;
  readonly url?: string;
  readonly transport: "sse" | "http" | "stdio";
  readonly spec_path?: string;
  /** Auth scheme, when the server declares one. */
  readonly auth_type?: string | null;
  readonly mcp_info?: Readonly<Record<string, unknown>>;
}

/** A single LiteLLM blog post entry. */
export interface BlogPost {
  readonly title: string;
  readonly description: string;
  readonly date: string;
  readonly url: string;
}

/** Response from `GET /public/litellm_blog_posts`. */
export interface BlogPostsResponse {
  readonly posts: readonly BlogPost[];
}

/**
 * Surface for the proxy's anonymous discovery endpoints. None of these
 * require an API key, so a `client.public.*` call works even before a
 * caller has provisioned credentials.
 */
export interface PublicNamespace {
  /**
   * Marketing-style model hub listing. Each entry is a rich model-group info
   * object; it is left loosely typed rather than modeled field-by-field.
   */
  modelHub(): Promise<Result<readonly Readonly<Record<string, unknown>>[], ApiError>>;
  /** Extra metadata for the model hub (e.g. icons, useful links). */
  modelHubInfo(): Promise<Result<PublicModelHubInfo, ApiError>>;
  /** Public listing of available agents. */
  agentHub(): Promise<Result<readonly AgentCard[], ApiError>>;
  /** Per-agent field metadata. */
  agentFields(): Promise<Result<readonly AgentCreateInfo[], ApiError>>;
  /** Public listing of MCP servers exposed by the proxy. */
  mcpHub(): Promise<Result<readonly MCPPublicServer[], ApiError>>;
  /** Public listing of Anthropic skills exposed by the proxy. */
  skillHub(): Promise<Result<unknown, ApiError>>;
  /** Supported provider catalog (provider slugs). */
  providers(): Promise<Result<readonly string[], ApiError>>;
  /** Per-provider field metadata for the admin UI. */
  providerFields(): Promise<Result<readonly ProviderCreateInfo[], ApiError>>;
  /** Supported endpoint catalog. */
  endpoints(): Promise<Result<SupportedEndpointsResponse, ApiError>>;
  /** LiteLLM model-cost map (the snapshot the proxy boots with). */
  litellmModelCostMap(): Promise<Result<unknown, ApiError>>;
  /** LiteLLM blog post manifest. */
  litellmBlogPosts(): Promise<Result<BlogPostsResponse, ApiError>>;
}

/** Bind a `PublicNamespace` to a constructed `Transport`. */
export const createPublic = (transport: Transport): PublicNamespace => ({
  modelHub() {
    return transport.request<readonly Readonly<Record<string, unknown>>[]>({
      method: "GET",
      path: "/public/model_hub",
    });
  },
  modelHubInfo() {
    return transport.request<PublicModelHubInfo>({ method: "GET", path: "/public/model_hub/info" });
  },
  agentHub() {
    return transport.request<readonly AgentCard[]>({ method: "GET", path: "/public/agent_hub" });
  },
  agentFields() {
    return transport.request<readonly AgentCreateInfo[]>({
      method: "GET",
      path: "/public/agents/fields",
    });
  },
  mcpHub() {
    return transport.request<readonly MCPPublicServer[]>({
      method: "GET",
      path: "/public/mcp_hub",
    });
  },
  skillHub() {
    return transport.request<unknown>({ method: "GET", path: "/public/skill_hub" });
  },
  providers() {
    return transport.request<readonly string[]>({ method: "GET", path: "/public/providers" });
  },
  providerFields() {
    return transport.request<readonly ProviderCreateInfo[]>({
      method: "GET",
      path: "/public/providers/fields",
    });
  },
  endpoints() {
    return transport.request<SupportedEndpointsResponse>({
      method: "GET",
      path: "/public/endpoints",
    });
  },
  litellmModelCostMap() {
    return transport.request<unknown>({
      method: "GET",
      path: "/public/litellm_model_cost_map",
    });
  },
  litellmBlogPosts() {
    return transport.request<BlogPostsResponse>({
      method: "GET",
      path: "/public/litellm_blog_posts",
    });
  },
});
