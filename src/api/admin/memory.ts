import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** A single memory record. */
export interface MemoryRow {
  /** Server-assigned id. */
  readonly memory_id: string;
  /** Lookup key (the URL namespace). */
  readonly key: string;
  /** Stored content. Typically markdown/text used as LLM context. */
  readonly value: string;
  /** Optional JSON metadata (tags, structured fields). */
  readonly metadata?: unknown;
  /** Owning user, when the row is user-scoped. */
  readonly user_id?: string;
  /** Owning team, when the row is team-scoped. */
  readonly team_id?: string;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** Identifier of the creating user. */
  readonly created_by?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
  /** Identifier of the last updating user. */
  readonly updated_by?: string;
}

/** Request body for `POST /v1/memory`. */
export interface CreateMemoryRequest {
  /** Lookup key (the URL namespace). */
  readonly key: string;
  /** Stored content. */
  readonly value: string;
  /** Optional JSON metadata. */
  readonly metadata?: unknown;
  /** Scope to a specific user. Defaults to the caller's user_id. */
  readonly user_id?: string;
  /** Scope to a specific team. Defaults to the caller's team_id. */
  readonly team_id?: string;
}

/** Request body for `PUT /v1/memory/{key}`. */
export interface UpdateMemoryRequest {
  /** Replacement value. */
  readonly value?: string;
  /** Replacement metadata. */
  readonly metadata?: unknown;
  /**
   * Only honored on create when the row doesn't exist yet, and only for
   * PROXY_ADMIN callers. Lets admins bootstrap rows on behalf of a user.
   */
  readonly user_id?: string;
  /**
   * Only honored on create when the row doesn't exist yet, and only for
   * PROXY_ADMIN callers. Lets admins bootstrap rows on behalf of a team.
   */
  readonly team_id?: string;
}

/** Query parameters for `GET /v1/memory`. */
export interface ListMemoryQuery {
  /** Filter by exact key match. */
  readonly key?: string;
  /** Restrict to a single user. */
  readonly user_id?: string;
  /** Restrict to a single team. */
  readonly team_id?: string;
  /** Maximum rows returned. */
  readonly limit?: number;
}

/** Response from `GET /v1/memory`. */
export interface ListMemoryResponse {
  /** Returned rows. */
  readonly memories: readonly MemoryRow[];
  /** Total row count matching the filter. */
  readonly total: number;
}

/** Response from `DELETE /v1/memory/{key}`. */
export interface DeleteMemoryResponse {
  /** Key that was deleted. */
  readonly key: string;
  /** True when the delete succeeded. */
  readonly deleted: boolean;
}

/** Surface for the proxy KV memory store on the `Client`. */
export interface MemoryNamespace {
  /** Create a new memory row. */
  create(req: CreateMemoryRequest): Promise<Result<MemoryRow, ApiError>>;
  /** List memory rows, optionally filtered. */
  list(query?: ListMemoryQuery): Promise<Result<ListMemoryResponse, ApiError>>;
  /** Retrieve a single memory row by key. */
  get(key: string): Promise<Result<MemoryRow, ApiError>>;
  /** Upsert a memory row by key. */
  upsert(key: string, req: UpdateMemoryRequest): Promise<Result<MemoryRow, ApiError>>;
  /** Delete a memory row by key. */
  delete(key: string): Promise<Result<DeleteMemoryResponse, ApiError>>;
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

/** Bind a `MemoryNamespace` to a constructed `Transport`. */
export const createMemory = (transport: Transport): MemoryNamespace => ({
  create(req) {
    return transport.request<MemoryRow>({
      method: "POST",
      path: "/v1/memory",
      body: req,
    });
  },
  list(query) {
    return transport.request<ListMemoryResponse>({
      method: "GET",
      path: "/v1/memory",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  get(key) {
    return transport.request<MemoryRow>({
      method: "GET",
      path: `/v1/memory/${encode(key)}`,
    });
  },
  upsert(key, req) {
    return transport.request<MemoryRow>({
      method: "PUT",
      path: `/v1/memory/${encode(key)}`,
      body: req,
    });
  },
  delete(key) {
    return transport.request<DeleteMemoryResponse>({
      method: "DELETE",
      path: `/v1/memory/${encode(key)}`,
    });
  },
});
