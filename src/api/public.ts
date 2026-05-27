import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/**
 * Surface for the proxy's anonymous discovery endpoints. None of these
 * require an API key, so a `client.public.*` call works even before a
 * caller has provisioned credentials.
 */
export interface PublicNamespace {
  /** Marketing-style model hub listing. */
  modelHub(): Promise<Result<unknown, ApiError>>;
  /** Extra metadata for the model hub (e.g. icons, useful links). */
  modelHubInfo(): Promise<Result<unknown, ApiError>>;
  /** Public listing of available agents. */
  agentHub(): Promise<Result<unknown, ApiError>>;
  /** Per-agent field metadata. */
  agentFields(): Promise<Result<unknown, ApiError>>;
  /** Public listing of MCP servers exposed by the proxy. */
  mcpHub(): Promise<Result<unknown, ApiError>>;
  /** Public listing of Anthropic skills exposed by the proxy. */
  skillHub(): Promise<Result<unknown, ApiError>>;
  /** Supported provider catalog. */
  providers(): Promise<Result<unknown, ApiError>>;
  /** Per-provider field metadata for the admin UI. */
  providerFields(): Promise<Result<unknown, ApiError>>;
  /** Supported endpoint catalog. */
  endpoints(): Promise<Result<unknown, ApiError>>;
  /** LiteLLM model-cost map (the snapshot the proxy boots with). */
  litellmModelCostMap(): Promise<Result<unknown, ApiError>>;
  /** LiteLLM blog post manifest. */
  litellmBlogPosts(): Promise<Result<unknown, ApiError>>;
}

/** Bind a `PublicNamespace` to a constructed `Transport`. */
export const createPublic = (transport: Transport): PublicNamespace => ({
  modelHub() {
    return transport.request<unknown>({ method: "GET", path: "/public/model_hub" });
  },
  modelHubInfo() {
    return transport.request<unknown>({ method: "GET", path: "/public/model_hub/info" });
  },
  agentHub() {
    return transport.request<unknown>({ method: "GET", path: "/public/agent_hub" });
  },
  agentFields() {
    return transport.request<unknown>({ method: "GET", path: "/public/agents/fields" });
  },
  mcpHub() {
    return transport.request<unknown>({ method: "GET", path: "/public/mcp_hub" });
  },
  skillHub() {
    return transport.request<unknown>({ method: "GET", path: "/public/skill_hub" });
  },
  providers() {
    return transport.request<unknown>({ method: "GET", path: "/public/providers" });
  },
  providerFields() {
    return transport.request<unknown>({
      method: "GET",
      path: "/public/providers/fields",
    });
  },
  endpoints() {
    return transport.request<unknown>({ method: "GET", path: "/public/endpoints" });
  },
  litellmModelCostMap() {
    return transport.request<unknown>({
      method: "GET",
      path: "/public/litellm_model_cost_map",
    });
  },
  litellmBlogPosts() {
    return transport.request<unknown>({
      method: "GET",
      path: "/public/litellm_blog_posts",
    });
  },
});
