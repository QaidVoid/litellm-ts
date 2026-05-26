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
  readonly team_id: string;
  readonly max_budget_in_team?: number;
  readonly user_role?: "user" | "admin";
}

/** Request body for `/user/new`. */
export interface CreateUserRequest {
  readonly user_id?: string;
  readonly user_email?: string;
  readonly user_alias?: string;
  readonly user_role?: UserRole;
  /** Either a list of team ids or richer membership descriptors. */
  readonly teams?: readonly string[] | readonly UserTeamMembership[];
  readonly max_budget?: number;
  readonly soft_budget?: number;
  readonly budget_duration?: string;
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
  readonly models?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Generate and return an API key alongside user creation. Defaults to true. */
  readonly auto_create_key?: boolean;
  readonly send_invite_email?: boolean;
  readonly sso_user_id?: string;
  readonly organizations?: readonly string[];
  readonly guardrails?: readonly string[];
  readonly policies?: readonly string[];
  readonly permissions?: Readonly<Record<string, unknown>>;
  readonly model_max_budget?: Readonly<Record<string, unknown>>;
  readonly model_rpm_limit?: Readonly<Record<string, number>>;
  readonly model_tpm_limit?: Readonly<Record<string, number>>;
  readonly duration?: string;
  readonly key_alias?: string;
}

/** A single internal user record. */
export interface User {
  readonly user_id: string;
  readonly user_email?: string;
  readonly user_alias?: string;
  readonly user_role?: UserRole;
  readonly max_budget?: number;
  readonly soft_budget?: number;
  readonly spend?: number;
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
  readonly teams?: readonly string[];
  readonly models?: readonly string[];
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly created_at?: string;
  readonly updated_at?: string;
  /** When `auto_create_key` is true on `create`, the response includes the generated key. */
  readonly key?: string;
  readonly expires?: string;
}

/** Request body for `/user/update`. */
export interface UpdateUserRequest
  extends Partial<Omit<CreateUserRequest, "user_id" | "user_email">> {
  readonly user_id?: string;
  readonly user_email?: string;
  readonly password?: string;
  readonly spend?: number;
}

/** Request body for `/user/delete`. */
export interface DeleteUsersRequest {
  readonly user_ids: readonly string[];
}

/** Query parameters for `/user/list`. */
export interface ListUsersQuery {
  readonly page?: number;
  readonly size?: number;
  readonly user_id?: string;
  readonly user_email?: string;
  readonly user_role?: UserRole;
}

/** Response from `/user/list`. */
export interface ListUsersResponse {
  readonly users: readonly User[];
  readonly total_count?: number;
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
});
