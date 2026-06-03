import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** A single audit log entry. */
export interface AuditLogEntry {
  /** Server-assigned id. */
  readonly id: string;
  /** ISO-8601 timestamp the record was last updated. */
  readonly updated_at: string;
  /** User id of the actor who triggered the change. */
  readonly changed_by?: string;
  /** Key (hash) that authenticated the change. */
  readonly changed_by_api_key?: string;
  /** Operation tag (e.g. `"created"`, `"updated"`, `"deleted"`). */
  readonly action: string;
  /** Table the audited row lives in. */
  readonly table_name: string;
  /** Primary key of the audited row. */
  readonly object_id: string;
  /** Row snapshot before the change. */
  readonly before_value?: Readonly<Record<string, unknown>>;
  /** Field-level updates applied. */
  readonly updated_values?: Readonly<Record<string, unknown>>;
}

/** Query parameters for `GET /audit`. */
export interface ListAuditLogsQuery {
  /** 1-based page number. */
  readonly page?: number;
  /** Page size. */
  readonly page_size?: number;
  /** Filter by actor user id. */
  readonly changed_by?: string;
  /** Filter by the key (hash) that authenticated the change. */
  readonly changed_by_api_key?: string;
  /** Filter by action (`"created"`, `"updated"`, `"deleted"`). */
  readonly action?: string;
  /** Filter by audited table name. */
  readonly table_name?: string;
  /** Filter by audited row primary key. */
  readonly object_id?: string;
  /** ISO-8601 inclusive lower bound on `updated_at`. */
  readonly start_date?: string;
  /** ISO-8601 inclusive upper bound on `updated_at`. */
  readonly end_date?: string;
  /** Restrict to entries scoped to a single team. */
  readonly object_team_id?: string;
}

/** Paginated response from `GET /audit`. */
export interface ListAuditLogsResponse {
  /** Audit entries on the current page. */
  readonly audit_logs: readonly AuditLogEntry[];
  /** Total entries matching the filters across all pages. */
  readonly total: number;
  /** Page number returned. */
  readonly page: number;
  /** Page size used. */
  readonly page_size: number;
  /** Total page count. */
  readonly total_pages: number;
}

/** Surface for the proxy audit log on the `Client`. */
export interface AuditNamespace {
  /** List audit log entries with optional filters and pagination. */
  list(query?: ListAuditLogsQuery): Promise<Result<ListAuditLogsResponse, ApiError>>;
  /** Retrieve a single audit log entry by id. */
  get(id: string): Promise<Result<AuditLogEntry, ApiError>>;
}

/** Bind an `AuditNamespace` to a constructed `Transport`. */
export const createAudit = (transport: Transport): AuditNamespace => ({
  list(query) {
    return transport.request<ListAuditLogsResponse>({
      method: "GET",
      path: "/audit",
      ...(query === undefined ? {} : { query }),
    });
  },
  get(id) {
    return transport.request<AuditLogEntry>({
      method: "GET",
      path: `/audit/${encodeURIComponent(id)}`,
    });
  },
});
