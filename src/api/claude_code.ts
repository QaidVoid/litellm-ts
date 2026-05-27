import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Plugin author block. */
export interface PluginAuthor {
  readonly name: string;
  readonly email?: string;
}

/** Marketplace owner block. */
export interface PluginOwner {
  readonly name: string;
  readonly email?: string;
}

/**
 * Git source reference for a plugin. The proxy accepts three shapes:
 * - `{ source: "github", repo: "org/repo" }`
 * - `{ source: "url", url: "https://github.com/org/repo.git" }`
 * - `{ source: "git-subdir", url: "https://github.com/org/repo.git", path: "plugins/x" }`
 */
export type PluginSource = Readonly<Record<string, string>>;

/** Request body for `POST /claude-code/plugins`. */
export interface RegisterPluginRequest {
  /** Plugin name in kebab-case. */
  readonly name: string;
  readonly source: PluginSource;
  /** Semantic version. Defaults to `"1.0.0"`. */
  readonly version?: string;
  readonly description?: string;
  readonly author?: PluginAuthor;
  readonly homepage?: string;
  readonly keywords?: readonly string[];
  readonly category?: string;
  readonly domain?: string;
  readonly namespace?: string;
}

/** Plugin information returned alongside a registration response. */
export interface PluginInfo {
  readonly id: string;
  readonly name: string;
  readonly version?: string;
  readonly description?: string;
  readonly source: PluginSource;
  readonly enabled: boolean;
}

/** Response from `POST /claude-code/plugins`. */
export interface RegisterPluginResponse {
  readonly status: string;
  readonly action: "created" | "updated";
  readonly plugin: PluginInfo;
}

/** Single entry in `ListPluginsResponse.plugins`. */
export interface PluginListItem {
  readonly id: string;
  readonly name: string;
  readonly version?: string;
  readonly description?: string;
  readonly source: PluginSource;
  readonly author?: PluginAuthor;
  readonly homepage?: string;
  readonly keywords?: readonly string[];
  readonly category?: string;
  readonly domain?: string;
  readonly namespace?: string;
  readonly enabled: boolean;
  readonly created_at?: string;
  readonly updated_at?: string;
}

/** Response from `GET /claude-code/plugins`. */
export interface ListPluginsResponse {
  readonly plugins: readonly PluginListItem[];
  readonly count: number;
}

/** Plugin entry in `MarketplaceResponse.plugins`. */
export interface MarketplacePluginEntry {
  readonly name: string;
  readonly source: PluginSource;
  readonly version?: string;
  readonly description?: string;
  readonly author?: PluginAuthor;
  readonly homepage?: string;
  readonly keywords?: readonly string[];
  readonly category?: string;
}

/** Response from `GET /claude-code/marketplace.json`. */
export interface MarketplaceResponse {
  readonly name: string;
  readonly owner: PluginOwner;
  readonly plugins: readonly MarketplacePluginEntry[];
}

/** Generic `{ status, message }` envelope used by enable/disable. */
export interface ClaudeCodeMutationResponse {
  readonly status: string;
  readonly message: string;
}

/** Surface for Claude Code marketplace endpoints on the `Client`. */
export interface ClaudeCodeNamespace {
  /** Fetch the marketplace catalog consumed by the Claude Code CLI. */
  marketplace(): Promise<Result<MarketplaceResponse, ApiError>>;
  /** Register (or update) a plugin in the marketplace. */
  register(req: RegisterPluginRequest): Promise<Result<RegisterPluginResponse, ApiError>>;
  /** List registered plugins. */
  list(): Promise<Result<ListPluginsResponse, ApiError>>;
  /** Retrieve a plugin by name. */
  get(pluginName: string): Promise<Result<PluginListItem, ApiError>>;
  /** Enable a previously disabled plugin. */
  enable(pluginName: string): Promise<Result<ClaudeCodeMutationResponse, ApiError>>;
  /** Disable a plugin without deleting it. */
  disable(pluginName: string): Promise<Result<ClaudeCodeMutationResponse, ApiError>>;
  /** Delete a plugin by name. */
  delete(pluginName: string): Promise<Result<ClaudeCodeMutationResponse, ApiError>>;
}

const encode = (s: string) => encodeURIComponent(s);

/** Bind a `ClaudeCodeNamespace` to a constructed `Transport`. */
export const createClaudeCode = (transport: Transport): ClaudeCodeNamespace => ({
  marketplace() {
    return transport.request<MarketplaceResponse>({
      method: "GET",
      path: "/claude-code/marketplace.json",
    });
  },
  register(req) {
    return transport.request<RegisterPluginResponse>({
      method: "POST",
      path: "/claude-code/plugins",
      body: req,
    });
  },
  list() {
    return transport.request<ListPluginsResponse>({
      method: "GET",
      path: "/claude-code/plugins",
    });
  },
  get(pluginName) {
    return transport.request<PluginListItem>({
      method: "GET",
      path: `/claude-code/plugins/${encode(pluginName)}`,
    });
  },
  enable(pluginName) {
    return transport.request<ClaudeCodeMutationResponse>({
      method: "POST",
      path: `/claude-code/plugins/${encode(pluginName)}/enable`,
    });
  },
  disable(pluginName) {
    return transport.request<ClaudeCodeMutationResponse>({
      method: "POST",
      path: `/claude-code/plugins/${encode(pluginName)}/disable`,
    });
  },
  delete(pluginName) {
    return transport.request<ClaudeCodeMutationResponse>({
      method: "DELETE",
      path: `/claude-code/plugins/${encode(pluginName)}`,
    });
  },
});
