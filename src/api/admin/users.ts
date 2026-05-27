import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Role granted to an internal user. */
export type UserRole =
  | "proxy_admin"
  | "proxy_admin_view_only"
  | "internal_user"
  | "internal_user_view_only";

/** Team-membership entry attached to a user. */
export interface UserTeamMembership {
  /** Team id the user joins. */
  readonly team_id: string;
  /** Per-member spend ceiling within the team. */
  readonly max_budget_in_team?: number;
  /** Role inside the team. */
  readonly user_role?: "user" | "admin";
}

/** Request body for `/user/new`. */
export interface CreateUserRequest {
  /** Explicit user id. Defaults to a server-generated UUID. */
  readonly user_id?: string;
  /** Primary email address. */
  readonly user_email?: string;
  /** Friendly alias shown in dashboards. */
  readonly user_alias?: string;
  /** Authorization role. */
  readonly user_role?: UserRole;
  /** Either a list of team ids or richer membership descriptors. */
  readonly teams?: readonly string[] | readonly UserTeamMembership[];
  /** Hard spend ceiling in USD. */
  readonly max_budget?: number;
  /** Warning threshold below `max_budget`. */
  readonly soft_budget?: number;
  /** Rolling window duration. */
  readonly budget_duration?: string;
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Model allowlist for the user. */
  readonly models?: readonly string[];
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Generate and return an API key alongside user creation. Defaults to true. */
  readonly auto_create_key?: boolean;
  /** Send an invitation email after creation. */
  readonly send_invite_email?: boolean;
  /** External SSO user identifier. */
  readonly sso_user_id?: string;
  /** Organizations the user belongs to. */
  readonly organizations?: readonly string[];
  /** Guardrails enforced on the user. */
  readonly guardrails?: readonly string[];
  /** Policies applied to the user. */
  readonly policies?: readonly string[];
  /** Fine-grained permission map. */
  readonly permissions?: Readonly<Record<string, unknown>>;
  /** Per-model budget map keyed by model name. */
  readonly model_max_budget?: Readonly<Record<string, unknown>>;
  /** Per-model requests-per-minute ceilings. */
  readonly model_rpm_limit?: Readonly<Record<string, number>>;
  /** Per-model tokens-per-minute ceilings. */
  readonly model_tpm_limit?: Readonly<Record<string, number>>;
  /** Lifetime for the key created when `auto_create_key` is true. */
  readonly duration?: string;
  /** Alias attached to the auto-created key. */
  readonly key_alias?: string;
}

/** A single internal user record. */
export interface User {
  /** Server-assigned id. */
  readonly user_id: string;
  /** Primary email. */
  readonly user_email?: string;
  /** Friendly alias. */
  readonly user_alias?: string;
  /** Authorization role. */
  readonly user_role?: UserRole;
  /** Hard spend ceiling. */
  readonly max_budget?: number;
  /** Warning threshold below `max_budget`. */
  readonly soft_budget?: number;
  /** Accumulated spend in USD. */
  readonly spend?: number;
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Teams the user belongs to. */
  readonly teams?: readonly string[];
  /** Model allowlist. */
  readonly models?: readonly string[];
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
  /** When `auto_create_key` is true on `create`, the response includes the generated key. */
  readonly key?: string;
  /** Expiry timestamp of the auto-created key. */
  readonly expires?: string;
}

/** Request body for `/user/update`. */
export interface UpdateUserRequest
  extends Partial<Omit<CreateUserRequest, "user_id" | "user_email">> {
  /** User id to update (one of `user_id` or `user_email` is required). */
  readonly user_id?: string;
  /** Primary email; resolved to `user_id` when set. */
  readonly user_email?: string;
  /** Replace the user's password (admin flow only). */
  readonly password?: string;
  /** Replace the accumulated spend counter. */
  readonly spend?: number;
}

/** Request body for `/user/delete`. */
export interface DeleteUsersRequest {
  /** User ids to delete. */
  readonly user_ids: readonly string[];
}

/** Query parameters for `/user/list`. */
export interface ListUsersQuery {
  /** 1-based page number. */
  readonly page?: number;
  /** Page size. */
  readonly size?: number;
  /** Filter by user id. */
  readonly user_id?: string;
  /** Filter by email. */
  readonly user_email?: string;
  /** Filter by role. */
  readonly user_role?: UserRole;
}

/** Metadata for one selectable user role on `/user/available_roles`. */
export interface AvailableUserRoleEntry {
  /** Free-form role description. */
  readonly description: string;
  /** Display label used by the Admin UI. */
  readonly ui_label: string;
}

/**
 * Response from `GET /user/available_roles`. Keys are role identifiers
 * (e.g. `"proxy_admin"`), values describe each role.
 */
export type AvailableUserRolesResponse = Readonly<Record<string, AvailableUserRoleEntry>>;

/**
 * Update payload accepted by `/user/bulk_update` when `all_users=true` is set.
 * Mirrors `UpdateUserRequest` but without the user-identifying fields.
 */
export type BulkUserUpdateFields =
  & Partial<Omit<UpdateUserRequest, "user_id" | "user_email">>
  & {
    /** Replace the accumulated spend counter. */
    readonly spend?: number;
  };

/** Request body for `POST /user/bulk_update`. */
export type BulkUpdateUsersRequest =
  | {
    /** Per-user update payloads (each carries `user_id` or `user_email`). */
    readonly users: readonly UpdateUserRequest[];
    readonly all_users?: false;
    readonly user_updates?: never;
  }
  | {
    readonly users?: never;
    /** Apply `user_updates` to every user in the database. */
    readonly all_users: true;
    /** Updates broadcast to every user. */
    readonly user_updates: BulkUserUpdateFields;
  };

/** Per-user result returned by `/user/bulk_update`. */
export interface BulkUserUpdateResult {
  /** Target user id, when supplied or resolved. */
  readonly user_id?: string;
  /** Target user email, when supplied. */
  readonly user_email?: string;
  /** Whether the per-user update succeeded. */
  readonly success: boolean;
  /** Failure reason, when `success` is false. */
  readonly error?: string;
  /** Updated user row, when `success` is true. */
  readonly updated_user?: Readonly<Record<string, unknown>>;
}

/** Response from `POST /user/bulk_update`. */
export interface BulkUpdateUsersResponse {
  /** Per-user results, one entry per attempted update. */
  readonly results: readonly BulkUserUpdateResult[];
  /** Number of update entries received. */
  readonly total_requested: number;
  /** Count of successful updates. */
  readonly successful_updates: number;
  /** Count of failed updates. */
  readonly failed_updates: number;
}

/** Query parameters for `GET /user/daily/activity`. */
export interface UserDailyActivityQuery {
  /** Inclusive start date `YYYY-MM-DD`. */
  readonly start_date?: string;
  /** Inclusive end date `YYYY-MM-DD`. */
  readonly end_date?: string;
  /** Filter by model name. */
  readonly model?: string;
  /** Filter by virtual key. */
  readonly api_key?: string;
  /** Filter by user id. Admins may omit for a global view. */
  readonly user_id?: string;
  /** Page number (1-indexed). */
  readonly page?: number;
  /** Page size (1-1000). */
  readonly page_size?: number;
  /** Timezone offset in minutes from UTC. */
  readonly timezone?: number;
}

/** Query parameters for `GET /user/daily/activity/aggregated`. */
export interface UserDailyActivityAggregatedQuery {
  /** Inclusive start date `YYYY-MM-DD`. */
  readonly start_date?: string;
  /** Inclusive end date `YYYY-MM-DD`. */
  readonly end_date?: string;
  /** Filter by model name. */
  readonly model?: string;
  /** Filter by virtual key. */
  readonly api_key?: string;
  /** Filter by user id. Admins may omit for a global view. */
  readonly user_id?: string;
  /** Timezone offset in minutes from UTC. */
  readonly timezone?: number;
}

/** Response from `/user/list`. */
export interface ListUsersResponse {
  /** Users on the current page. */
  readonly users: readonly User[];
  /** Total user count across all pages. */
  readonly total_count?: number;
  /** Page number returned. */
  readonly page?: number;
}

/** Surface for user administration on the `Client`. */
export interface UsersNamespace {
  /** Create an internal user. */
  create(req: CreateUserRequest): Promise<Result<User, ApiError>>;
  /** Retrieve a user by id or email. */
  info(query: { user_id?: string; user_email?: string }): Promise<Result<User, ApiError>>;
  /** List internal users. */
  list(query?: ListUsersQuery): Promise<Result<ListUsersResponse, ApiError>>;
  /** Partially update a user. */
  update(req: UpdateUserRequest): Promise<Result<User, ApiError>>;
  /** Soft-delete one or more users. */
  delete(req: DeleteUsersRequest): Promise<Result<{ readonly status: "success" }, ApiError>>;
  /** Roles the Admin UI exposes when assigning a user role. */
  availableRoles(): Promise<Result<AvailableUserRolesResponse, ApiError>>;
  /** Bulk-update users by id/email, or broadcast a payload to every user. */
  bulkUpdate(req: BulkUpdateUsersRequest): Promise<Result<BulkUpdateUsersResponse, ApiError>>;
  /** Per-day spend / request counters scoped to a user. */
  dailyActivity(query: UserDailyActivityQuery): Promise<Result<unknown, ApiError>>;
  /** Aggregated per-day activity across all dates in the window. */
  dailyActivityAggregated(
    query: UserDailyActivityAggregatedQuery,
  ): Promise<Result<unknown, ApiError>>;
}

const filterUndefined = <T extends object>(
  q: T,
): Readonly<Record<string, string | number | boolean>> => {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) out[k] = v as string | number | boolean;
  }
  return out;
};

/** Bind a `UsersNamespace` to a constructed `Transport`. */
export const createUsers = (transport: Transport): UsersNamespace => ({
  create(req) {
    return transport.request<User>({ method: "POST", path: "/user/new", body: req });
  },
  info(query) {
    return transport.request<User>({
      method: "GET",
      path: "/user/info",
      query: filterUndefined(query),
    });
  },
  list(query) {
    return transport.request<ListUsersResponse>({
      method: "GET",
      path: "/user/list",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  update(req) {
    return transport.request<User>({ method: "POST", path: "/user/update", body: req });
  },
  delete(req) {
    return transport.request<{ readonly status: "success" }>({
      method: "POST",
      path: "/user/delete",
      body: req,
    });
  },
  availableRoles() {
    return transport.request<AvailableUserRolesResponse>({
      method: "GET",
      path: "/user/available_roles",
    });
  },
  bulkUpdate(req) {
    return transport.request<BulkUpdateUsersResponse>({
      method: "POST",
      path: "/user/bulk_update",
      body: req,
    });
  },
  dailyActivity(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/user/daily/activity",
      query: filterUndefined(query),
    });
  },
  dailyActivityAggregated(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/user/daily/activity/aggregated",
      query: filterUndefined(query),
    });
  },
});
