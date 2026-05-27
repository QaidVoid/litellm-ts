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
  /** Attach the key to a team. */
  readonly team_id?: string;
  /** Attach the key to a user. */
  readonly user_id?: string;
  /** Attach the key to an agent. */
  readonly agent_id?: string;
  /** Attach the key to an organization. */
  readonly organization_id?: string;
  /** Attach the key to a project (Anthropic-style). */
  readonly project_id?: string;
  /** Whitelist of model names the key may call. */
  readonly models?: readonly string[];
  /** Existing budget record id to attach. */
  readonly budget_id?: string;
  /** Hard spend ceiling in USD. */
  readonly max_budget?: number;
  /** Warning threshold below `max_budget`. */
  readonly soft_budget?: number;
  /** Reset window (e.g. `"30d"`). */
  readonly budget_duration?: string;
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Maximum parallel in-flight requests. */
  readonly max_parallel_requests?: number;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Model name aliases applied to traffic from this key. */
  readonly aliases?: Readonly<Record<string, string>>;
  /** Provider configuration overrides. */
  readonly config?: Readonly<Record<string, unknown>>;
  /** Fine-grained permission overrides. */
  readonly permissions?: Readonly<Record<string, unknown>>;
  /** Per-model budget map keyed by model name. */
  readonly model_max_budget?: Readonly<Record<string, unknown>>;
  /** Per-model requests-per-minute ceilings. */
  readonly model_rpm_limit?: Readonly<Record<string, number>>;
  /** Per-model tokens-per-minute ceilings. */
  readonly model_tpm_limit?: Readonly<Record<string, number>>;
  /** Allocation mode for the TPM limiter. */
  readonly tpm_limit_type?: LimitType;
  /** Allocation mode for the RPM limiter. */
  readonly rpm_limit_type?: LimitType;
  /** Guardrails enforced on the key. */
  readonly guardrails?: readonly string[];
  /** Policies applied to the key. */
  readonly policies?: readonly string[];
  /** Cache-control header values the key may set. */
  readonly allowed_cache_controls?: readonly string[];
  /** Pre-block the key at creation. */
  readonly blocked?: boolean;
  /** Authorization tier (LLM API, management, etc.). */
  readonly key_type?: KeyType;
  /** Automatically rotate the key on a schedule. */
  readonly auto_rotate?: boolean;
  /** Rotation interval (e.g. `"30d"`). */
  readonly rotation_interval?: string;
}

/**
 * Wrapper returned by `GET /key/info`: the plaintext key plus an `info`
 * block carrying the metadata. The generate/update endpoints return
 * `KeyMetadata` directly, so this wrapper is specific to `info`.
 */
export interface KeyInfoResponse {
  /** The plaintext key value the request asked about. */
  readonly key: string;
  /** Metadata block. */
  readonly info: KeyMetadata;
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
  /** Human-friendly alias for lookup and display. */
  readonly key_alias?: string;
  /** User the key is attached to. */
  readonly user_id?: string;
  /** Team the key is attached to. */
  readonly team_id?: string;
  /** Organization the key is attached to. */
  readonly organization_id?: string;
  /** Project the key is attached to. */
  readonly project_id?: string;
  /** Model whitelist. */
  readonly models?: readonly string[];
  /** Accumulated spend in USD. */
  readonly spend?: number;
  /** Hard spend ceiling in USD. */
  readonly max_budget?: number;
  /** Warning threshold below `max_budget`. */
  readonly soft_budget?: number;
  /** Reset window. */
  readonly budget_duration?: string;
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Maximum parallel in-flight requests. */
  readonly max_parallel_requests?: number;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Fine-grained permission map. */
  readonly permissions?: Readonly<Record<string, unknown>>;
  /** True when the key is currently blocked. */
  readonly blocked?: boolean;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
  /** Identifier of the creating user. */
  readonly created_by?: string;
  /** Identifier of the last user to update. */
  readonly updated_by?: string;
  /** Authorization tier. */
  readonly key_type?: KeyType;
}

/**
 * Optional one-shot budget bump on `/key/update`. The proxy requires both
 * `temp_budget_increase` and `temp_budget_expiry` to be set together or both
 * omitted; this union encodes that rule.
 */
export type KeyTempBudgetBump =
  | {
    /** One-shot budget bump amount in USD. */
    readonly temp_budget_increase: number;
    /** Expiry of the temporary bump (ISO 8601). */
    readonly temp_budget_expiry: string;
  }
  | {
    readonly temp_budget_increase?: never;
    readonly temp_budget_expiry?: never;
  };

/** Request body for `/key/update`. */
export type UpdateKeyRequest =
  & Partial<GenerateKeyRequest>
  & {
    /** Target key value. */
    readonly key: string;
    /** Replace the accumulated spend counter. */
    readonly spend?: number;
  }
  & KeyTempBudgetBump;

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
  /** Status string, always `"success"`. */
  readonly status: "success";
  /** Number of keys removed. */
  readonly deleted_keys: number;
}

/** Single-key body for block/unblock and `/key/health`. */
export interface KeyTokenRequest {
  /** Target key value. */
  readonly key: string;
}

/** Query parameters accepted by `/key/list`. */
export interface ListKeysQuery {
  /** 1-based page number. */
  readonly page?: number;
  /** Page size. */
  readonly size?: number;
  /** Filter by user. */
  readonly user_id?: string;
  /** Filter by team. */
  readonly team_id?: string;
  /** Filter by organization. */
  readonly organization_id?: string;
  /** Filter by key alias. */
  readonly key_alias?: string;
  /** Filter by hashed key value. */
  readonly key_hash?: string;
  /** Filter by project. */
  readonly project_id?: string;
  /** Filter by lifecycle status. */
  readonly status?: string;
  /** Filter by access group membership. */
  readonly access_group_id?: string;
  /** Return the full key record instead of a summary. */
  readonly return_full_object?: boolean;
  /** Include keys owned by the user's teams. */
  readonly include_team_keys?: boolean;
  /** Include keys the caller created on behalf of others. */
  readonly include_created_by_keys?: boolean;
  /** Field to sort on. */
  readonly sort_by?: string;
  /** Sort direction. */
  readonly sort_order?: "asc" | "desc";
  /** Comma-separated list of related fields to expand. */
  readonly expand?: string;
}

/** Response from `/key/list`. */
export interface ListKeysResponse {
  /** Keys on the current page. */
  readonly keys: readonly KeyMetadata[];
  /** Total key count across all pages. */
  readonly total_count: number;
  /** Page number returned. */
  readonly page: number;
  /** Page size returned. */
  readonly size: number;
}

/** Request body for `POST /key/{key}/reset_spend`. */
export interface ResetKeySpendRequest {
  /** New spend value (USD) to write. */
  readonly reset_to: number;
}

/** Response from `POST /key/{key}/reset_spend`. */
export interface ResetKeySpendResponse {
  /** Hashed token of the key whose spend was reset. */
  readonly key_hash: string;
  /** Spend after the reset. */
  readonly spend: number;
  /** Spend before the reset. */
  readonly previous_spend: number;
  /** Hard budget ceiling for the key, when set. */
  readonly max_budget?: number | null;
  /** Next scheduled budget reset, when configured. */
  readonly budget_reset_at?: string | null;
}

/** Query parameters for `GET /key/aliases`. */
export interface ListKeyAliasesQuery {
  /** 1-based page number. */
  readonly page?: number;
  /** Page size (1-100). Defaults to 50. */
  readonly size?: number;
  /** Case-insensitive substring filter applied to aliases. */
  readonly search?: string;
  /** Restrict to aliases for keys belonging to this team. */
  readonly team_id?: string;
}

/** Response from `GET /key/aliases`. */
export interface ListKeyAliasesResponse {
  /** Distinct alias strings. */
  readonly aliases: readonly string[];
  /** Total alias count across all pages. */
  readonly total_count: number;
  /** Page number returned. */
  readonly current_page: number;
  /** Total page count. */
  readonly total_pages: number;
  /** Page size returned. */
  readonly size: number;
}

/** A single key-update entry for `/key/bulk_update`. */
export interface BulkUpdateKeyItem {
  /** Target key (token). */
  readonly key: string;
  /** Replace the attached budget id. */
  readonly budget_id?: string;
  /** Hard spend ceiling in USD. */
  readonly max_budget?: number;
  /** Replace the attached team id. */
  readonly team_id?: string;
  /** Replace the tag list. */
  readonly tags?: readonly string[];
}

/** Request body for `POST /key/bulk_update`. */
/** Request body for `POST /team/key/bulk_update`. */
export interface BulkUpdateKeysByTeamRequest {
  /** Target team id. */
  readonly team_id: string;
  /** Bulk-update payload applied to every key on the team. */
  readonly key_updates: BulkUpdateKeysRequest;
}

export interface BulkUpdateKeysRequest {
  /** Individual key update entries (max 500 per call). */
  readonly keys: readonly BulkUpdateKeyItem[];
}

/** Per-key success record returned by `/key/bulk_update`. */
export interface BulkKeyUpdateSuccess {
  /** Key that was updated. */
  readonly key: string;
  /** Snapshot of the updated key row. */
  readonly key_info: Readonly<Record<string, unknown>>;
}

/** Per-key failure record returned by `/key/bulk_update`. */
export interface BulkKeyUpdateFailure {
  /** Key that failed to update. */
  readonly key: string;
  /** Snapshot of the original key row, when available. */
  readonly key_info?: Readonly<Record<string, unknown>>;
  /** Reason the update was rejected. */
  readonly failed_reason: string;
}

/** Response from `POST /key/bulk_update`. */
export interface BulkUpdateKeysResponse {
  /** Number of update entries received. */
  readonly total_requested: number;
  /** Per-key success records. */
  readonly successful_updates: readonly BulkKeyUpdateSuccess[];
  /** Per-key failure records. */
  readonly failed_updates: readonly BulkKeyUpdateFailure[];
}

/** Response from `/key/health`. */
export interface KeyHealthResponse {
  /** Overall key health verdict. */
  readonly key: "healthy" | "unhealthy";
  /** Logging-callback health detail for the calling key. */
  readonly logging_callbacks?: {
    /** Configured callback names. */
    readonly callbacks: readonly string[];
    /** Combined callback health verdict. */
    readonly status: "healthy" | "unhealthy";
    /** Diagnostic detail. */
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
  info(key?: string): Promise<Result<KeyInfoResponse, ApiError>>;
  /** List keys with optional filters and pagination. */
  list(query?: ListKeysQuery): Promise<Result<ListKeysResponse, ApiError>>;
  /** Partially update a key. */
  update(req: UpdateKeyRequest): Promise<Result<KeyMetadata, ApiError>>;
  /** Rotate a key, optionally keeping the old value live for `grace_period`. */
  regenerate(req: RegenerateKeyRequest): Promise<Result<KeyMetadata, ApiError>>;
  /**
   * Rotate a specific key identified by its value in the URL path. Mirrors
   * `POST /key/{key}/regenerate`; useful when the proxy enforces path-based
   * audit checks.
   */
  regenerateByPath(
    key: string,
    req?: RegenerateKeyRequest,
  ): Promise<Result<KeyMetadata, ApiError>>;
  /** Reset a key's accumulated spend counter (`POST /key/{key}/reset_spend`). */
  resetSpend(
    key: string,
    req: ResetKeySpendRequest,
  ): Promise<Result<ResetKeySpendResponse, ApiError>>;
  /** Paginated list of key aliases visible to the caller. */
  aliases(query?: ListKeyAliasesQuery): Promise<Result<ListKeyAliasesResponse, ApiError>>;
  /** Bulk-update multiple keys in a single round trip (admin only). */
  bulkUpdate(req: BulkUpdateKeysRequest): Promise<Result<BulkUpdateKeysResponse, ApiError>>;
  /** Bulk-update keys scoped to a single team (`POST /team/key/bulk_update`). */
  bulkUpdateByTeam(
    req: BulkUpdateKeysByTeamRequest,
  ): Promise<Result<BulkUpdateKeysResponse, ApiError>>;
  /** Delete one or more keys by value or alias. */
  delete(req: DeleteKeysRequest): Promise<Result<DeleteKeysResponse, ApiError>>;
  /** Block a key from making requests. */
  block(req: KeyTokenRequest): Promise<Result<KeyMetadata, ApiError>>;
  /** Reverse a previous `block` call. */
  unblock(req: KeyTokenRequest): Promise<Result<KeyMetadata, ApiError>>;
  /** Probe the logging callbacks configured for the calling key. */
  health(): Promise<Result<KeyHealthResponse, ApiError>>;
  /**
   * Batched key info via `POST /v2/key/info`. Accepts an explicit list of
   * `keys` and/or `key_aliases`; the response carries an `info` array with
   * one row per resolved key. Returned as `unknown` since the proxy
   * forwards each key's raw row from the database verbatim.
   */
  infoV2(req: KeyInfoBatchRequest): Promise<Result<unknown, ApiError>>;
}

/**
 * Request body for `POST /v2/key/info`. At least one of `keys` or
 * `key_aliases` must be supplied; the proxy validates this server-side.
 */
export interface KeyInfoBatchRequest {
  /** Key token values to look up. */
  readonly keys?: readonly string[];
  /** Key aliases to resolve to tokens server-side. */
  readonly key_aliases?: readonly string[];
}

const toQuery = (q: ListKeysQuery): Readonly<Record<string, string | number | boolean>> => {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) out[k] = v as string | number | boolean;
  }
  return out;
};

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
    return transport.request<KeyInfoResponse>({
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
  regenerateByPath(key, req) {
    return transport.request<KeyMetadata>({
      method: "POST",
      path: `/key/${encode(key)}/regenerate`,
      ...(req === undefined ? {} : { body: req }),
    });
  },
  resetSpend(key, req) {
    return transport.request<ResetKeySpendResponse>({
      method: "POST",
      path: `/key/${encode(key)}/reset_spend`,
      body: req,
    });
  },
  aliases(query) {
    return transport.request<ListKeyAliasesResponse>({
      method: "GET",
      path: "/key/aliases",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  bulkUpdate(req) {
    return transport.request<BulkUpdateKeysResponse>({
      method: "POST",
      path: "/key/bulk_update",
      body: req,
    });
  },
  bulkUpdateByTeam(req) {
    return transport.request<BulkUpdateKeysResponse>({
      method: "POST",
      path: "/team/key/bulk_update",
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
  infoV2(req) {
    return transport.request<unknown>({
      method: "POST",
      path: "/v2/key/info",
      body: req,
    });
  },
});
