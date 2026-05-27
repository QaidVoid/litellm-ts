import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Plugin author block. */
export interface PluginAuthor {
  /** Author display name. */
  readonly name: string;
  /** Author contact email. */
  readonly email?: string;
}

/** Marketplace owner block. */
export interface PluginOwner {
  /** Owner display name. */
  readonly name: string;
  /** Owner contact email. */
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
  /** Source descriptor pointing at the plugin's repository. */
  readonly source: PluginSource;
  /** Semantic version. Defaults to `"1.0.0"`. */
  readonly version?: string;
  /** Short description shown in marketplace listings. */
  readonly description?: string;
  /** Plugin author. */
  readonly author?: PluginAuthor;
  /** Homepage URL. */
  readonly homepage?: string;
  /** Discovery keywords. */
  readonly keywords?: readonly string[];
  /** Catalog category. */
  readonly category?: string;
  /** Logical domain grouping (e.g. `"dev-tools"`). */
  readonly domain?: string;
  /** Namespace the plugin commands are mounted under. */
  readonly namespace?: string;
}

/** Plugin information returned alongside a registration response. */
export interface PluginInfo {
  /** Server-assigned id. */
  readonly id: string;
  /** Plugin name. */
  readonly name: string;
  /** Plugin semantic version. */
  readonly version?: string;
  /** Short description. */
  readonly description?: string;
  /** Source descriptor pointing at the plugin's repository. */
  readonly source: PluginSource;
  /** Whether the plugin is currently enabled. */
  readonly enabled: boolean;
}

/** Response from `POST /claude-code/plugins`. */
export interface RegisterPluginResponse {
  /** Status string returned by the proxy. */
  readonly status: string;
  /** Whether the call created a new record or updated an existing one. */
  readonly action: "created" | "updated";
  /** Stored plugin summary. */
  readonly plugin: PluginInfo;
}

/** Single entry in `ListPluginsResponse.plugins`. */
export interface PluginListItem {
  /** Server-assigned id. */
  readonly id: string;
  /** Plugin name. */
  readonly name: string;
  /** Plugin semantic version. */
  readonly version?: string;
  /** Short description. */
  readonly description?: string;
  /** Source descriptor pointing at the plugin's repository. */
  readonly source: PluginSource;
  /** Plugin author. */
  readonly author?: PluginAuthor;
  /** Homepage URL. */
  readonly homepage?: string;
  /** Discovery keywords. */
  readonly keywords?: readonly string[];
  /** Catalog category. */
  readonly category?: string;
  /** Logical domain grouping. */
  readonly domain?: string;
  /** Namespace the plugin commands are mounted under. */
  readonly namespace?: string;
  /** Whether the plugin is currently enabled. */
  readonly enabled: boolean;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
}

/** Response from `GET /claude-code/plugins`. */
export interface ListPluginsResponse {
  /** Registered plugins. */
  readonly plugins: readonly PluginListItem[];
  /** Total number of registered plugins. */
  readonly count: number;
}

/** Plugin entry in `MarketplaceResponse.plugins`. */
export interface MarketplacePluginEntry {
  /** Plugin name. */
  readonly name: string;
  /** Source descriptor pointing at the plugin's repository. */
  readonly source: PluginSource;
  /** Plugin semantic version. */
  readonly version?: string;
  /** Short description. */
  readonly description?: string;
  /** Plugin author. */
  readonly author?: PluginAuthor;
  /** Homepage URL. */
  readonly homepage?: string;
  /** Discovery keywords. */
  readonly keywords?: readonly string[];
  /** Catalog category. */
  readonly category?: string;
}

/** Response from `GET /claude-code/marketplace.json`. */
export interface MarketplaceResponse {
  /** Marketplace name. */
  readonly name: string;
  /** Marketplace owner. */
  readonly owner: PluginOwner;
  /** Plugins published in the marketplace. */
  readonly plugins: readonly MarketplacePluginEntry[];
}

/** Generic `{ status, message }` envelope used by enable/disable. */
export interface ClaudeCodeMutationResponse {
  /** Status string returned by the proxy. */
  readonly status: string;
  /** Human-readable message. */
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
