import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** What a key is authorized to do. */
export type KeyType = "llm_api" | "management" | "read_only" | "default";

/** Rate-limit allocation modes for the proxy's request planner. */
export type LimitType = "best_effort_throughput" | "guaranteed_throughput" | "dynamic";

/** Request body for `/key/generate` and `/key/service-account/generate`. */
export interface GenerateKeyRequest {
  /** Explicit key value. Defaults to a server-generated `sk-*` token. */
  readonly key?: string;
  /** Human-friendly alias for lookup and display. */
  readonly key_alias?: string;
  /** Lifetime (e.g. `"30d"`, `"1h"`). Defaults to never-expiring. */
  readonly duration?: string;
  readonly team_id?: string;
  readonly user_id?: string;
  readonly agent_id?: string;
  readonly organization_id?: string;
  readonly project_id?: string;
  /** Whitelist of model names the key may call. */
  readonly models?: readonly string[];
  readonly budget_id?: string;
  readonly max_budget?: number;
  readonly soft_budget?: number;
  /** Reset window (e.g. `"30d"`). */
  readonly budget_duration?: string;
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
  readonly max_parallel_requests?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly aliases?: Readonly<Record<string, string>>;
  readonly config?: Readonly<Record<string, unknown>>;
  readonly permissions?: Readonly<Record<string, unknown>>;
  readonly model_max_budget?: Readonly<Record<string, unknown>>;
  readonly model_rpm_limit?: Readonly<Record<string, number>>;
  readonly model_tpm_limit?: Readonly<Record<string, number>>;
  readonly tpm_limit_type?: LimitType;
  readonly rpm_limit_type?: LimitType;
  readonly guardrails?: readonly string[];
  readonly policies?: readonly string[];
  readonly allowed_cache_controls?: readonly string[];
  readonly blocked?: boolean;
  readonly key_type?: KeyType;
  readonly auto_rotate?: boolean;
  readonly rotation_interval?: string;
}

/** Full key metadata returned by generate/info/update endpoints. */
export interface KeyMetadata {
  /** The bearer token. Treat as a secret. */
  readonly key: string;
  /** Expiry timestamp (ISO 8601), or absent for never-expiring keys. */
  readonly expires?: string;
  /** Server-side identifier for the key row. */
  readonly token_id?: string;
  /** Server-assigned identifier separate from `token_id` in some shapes. */
  readonly token?: string;
  readonly key_alias?: string;
  readonly user_id?: string;
  readonly team_id?: string;
  readonly organization_id?: string;
  readonly project_id?: string;
  readonly models?: readonly string[];
  readonly spend?: number;
  readonly max_budget?: number;
  readonly soft_budget?: number;
  readonly budget_duration?: string;
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
  readonly max_parallel_requests?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly permissions?: Readonly<Record<string, unknown>>;
  readonly blocked?: boolean;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly created_by?: string;
  readonly updated_by?: string;
  readonly key_type?: KeyType;
}

/** Request body for `/key/update`. */
export interface UpdateKeyRequest extends Partial<GenerateKeyRequest> {
  /** Target key value. */
  readonly key: string;
  readonly spend?: number;
  /** One-shot budget bump active until `temp_budget_expiry`. */
  readonly temp_budget_increase?: number;
  /** Expiry of the temporary budget bump (ISO 8601). */
  readonly temp_budget_expiry?: string;
}

/** Request body for `/key/regenerate`. */
export interface RegenerateKeyRequest extends Partial<GenerateKeyRequest> {
  /** Existing key to rotate. */
  readonly key?: string;
  /** Explicit replacement key. Defaults to a server-generated value. */
  readonly new_key?: string;
  /** Window in which the old key keeps working (e.g. `"24h"`). */
  readonly grace_period?: string;
}

/** Request body for `/key/delete`. Provide one of the two lists. */
export type DeleteKeysRequest =
  | { readonly keys: readonly string[] }
  | { readonly key_aliases: readonly string[] };

/** Response from `/key/delete`. */
export interface DeleteKeysResponse {
  readonly status: "success";
  readonly deleted_keys: number;
}

/** Single-key body for block/unblock and `/key/health`. */
export interface KeyTokenRequest {
  readonly key: string;
}

/** Query parameters accepted by `/key/list`. */
export interface ListKeysQuery {
  readonly page?: number;
  readonly size?: number;
  readonly user_id?: string;
  readonly team_id?: string;
  readonly organization_id?: string;
  readonly key_alias?: string;
  readonly key_hash?: string;
  readonly project_id?: string;
  readonly status?: string;
  readonly access_group_id?: string;
  readonly return_full_object?: boolean;
  readonly include_team_keys?: boolean;
  readonly include_created_by_keys?: boolean;
  readonly sort_by?: string;
  readonly sort_order?: "asc" | "desc";
  readonly expand?: string;
}

/** Response from `/key/list`. */
export interface ListKeysResponse {
  readonly keys: readonly KeyMetadata[];
  readonly total_count: number;
  readonly page: number;
  readonly size: number;
}

/** Response from `/key/health`. */
export interface KeyHealthResponse {
  readonly key: "healthy" | "unhealthy";
  readonly logging_callbacks?: {
    readonly callbacks: readonly string[];
    readonly status: "healthy" | "unhealthy";
    readonly details: string;
  };
}

/** Surface for proxy key administration. */
export interface KeysNamespace {
  /** Generate a new virtual key. Plaintext value is returned in the response. */
  generate(req?: GenerateKeyRequest): Promise<Result<KeyMetadata, ApiError>>;
  /** Generate a team-scoped service-account key (not tied to a user). */
  generateServiceAccount(req?: GenerateKeyRequest): Promise<Result<KeyMetadata, ApiError>>;
  /** Retrieve metadata for a single key (defaults to the calling key). */
  info(key?: string): Promise<Result<KeyMetadata, ApiError>>;
  /** List keys with optional filters and pagination. */
  list(query?: ListKeysQuery): Promise<Result<ListKeysResponse, ApiError>>;
  /** Partially update a key. */
  update(req: UpdateKeyRequest): Promise<Result<KeyMetadata, ApiError>>;
  /** Rotate a key, optionally keeping the old value live for `grace_period`. */
  regenerate(req: RegenerateKeyRequest): Promise<Result<KeyMetadata, ApiError>>;
  /** Delete one or more keys by value or alias. */
  delete(req: DeleteKeysRequest): Promise<Result<DeleteKeysResponse, ApiError>>;
  /** Block a key from making requests. */
  block(req: KeyTokenRequest): Promise<Result<KeyMetadata, ApiError>>;
  /** Reverse a previous `block` call. */
  unblock(req: KeyTokenRequest): Promise<Result<KeyMetadata, ApiError>>;
  /** Probe the logging callbacks configured for the calling key. */
  health(): Promise<Result<KeyHealthResponse, ApiError>>;
}

const toQuery = (q: ListKeysQuery): Readonly<Record<string, string | number | boolean>> => {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) out[k] = v as string | number | boolean;
  }
  return out;
};

/** Bind a `KeysNamespace` to a constructed `Transport`. */
export const createKeys = (transport: Transport): KeysNamespace => ({
  generate(req = {}) {
    return transport.request<KeyMetadata>({
      method: "POST",
      path: "/key/generate",
      body: req,
    });
  },
  generateServiceAccount(req = {}) {
    return transport.request<KeyMetadata>({
      method: "POST",
      path: "/key/service-account/generate",
      body: req,
    });
  },
  info(key) {
    return transport.request<KeyMetadata>({
      method: "GET",
      path: "/key/info",
      ...(key === undefined ? {} : { query: { key } }),
    });
  },
  list(query) {
    return transport.request<ListKeysResponse>({
      method: "GET",
      path: "/key/list",
      ...(query === undefined ? {} : { query: toQuery(query) }),
    });
  },
  update(req) {
    return transport.request<KeyMetadata>({
      method: "POST",
      path: "/key/update",
      body: req,
    });
  },
  regenerate(req) {
    return transport.request<KeyMetadata>({
      method: "POST",
      path: "/key/regenerate",
      body: req,
    });
  },
  delete(req) {
    return transport.request<DeleteKeysResponse>({
      method: "POST",
      path: "/key/delete",
      body: req,
    });
  },
  block(req) {
    return transport.request<KeyMetadata>({
      method: "POST",
      path: "/key/block",
      body: req,
    });
  },
  unblock(req) {
    return transport.request<KeyMetadata>({
      method: "POST",
      path: "/key/unblock",
      body: req,
    });
  },
  health() {
    return transport.request<KeyHealthResponse>({
      method: "POST",
      path: "/key/health",
    });
  },
});
