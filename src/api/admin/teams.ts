import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Role of a team member. */
export type TeamMemberRole = "admin" | "user";

/** A single team membership record. */
export interface TeamMembership {
  /** User identifier. */
  readonly user_id: string;
  /** Role inside the team. */
  readonly role: TeamMemberRole;
  /** Per-member spend ceiling within the team. */
  readonly max_budget_in_team?: number;
  /** Per-member tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Per-member requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Per-member model allowlist override. */
  readonly allowed_models?: readonly string[];
}

/** Budget window descriptor used in `budget_limits` arrays. */
export interface TeamBudgetLimit {
  /** Rolling window duration. */
  readonly budget_duration: string;
  /** Hard spend ceiling for the window, in USD. */
  readonly max_budget: number;
  /** ISO-8601 timestamp when the window resets. */
  readonly reset_at?: string;
}

/** Member specification accepted by `team.new`. */
export interface TeamMemberSpec {
  /** User identifier. */
  readonly user_id: string;
  /** Role inside the team. */
  readonly role: TeamMemberRole;
}

/** Request body for `/team/new`. */
export interface CreateTeamRequest {
  /** Friendly alias shown in dashboards. */
  readonly team_alias?: string;
  /** Explicit team id. Defaults to a server-generated UUID. */
  readonly team_id?: string;
  /** Parent organization id. */
  readonly organization_id?: string;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Model allowlist for the team. */
  readonly models?: readonly string[];
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Hard spend ceiling in USD. */
  readonly max_budget?: number;
  /** Warning threshold below `max_budget`. */
  readonly soft_budget?: number;
  /** Rolling window duration. */
  readonly budget_duration?: string;
  /** Initial member roster. */
  readonly members_with_roles?: readonly TeamMemberSpec[];
  /** Model name aliases applied to team traffic. */
  readonly model_aliases?: Readonly<Record<string, string>>;
  /** Tags attached to the team. */
  readonly tags?: readonly string[];
  /** Guardrails enforced on the team. */
  readonly guardrails?: readonly string[];
  /** Policies applied to the team. */
  readonly policies?: readonly string[];
  /** Default per-member spend ceiling. */
  readonly team_member_budget?: number;
  /** Default per-member requests-per-minute ceiling. */
  readonly team_member_rpm_limit?: number;
  /** Default per-member tokens-per-minute ceiling. */
  readonly team_member_tpm_limit?: number;
  /** Default lifetime for keys minted by team members. */
  readonly team_member_key_duration?: string;
  /** Default rolling window for per-member budgets. */
  readonly team_member_budget_duration?: string;
  /** Passthrough routes the team may call. */
  readonly allowed_passthrough_routes?: readonly string[];
  /** Object-level permission overrides. */
  readonly object_permission?: Readonly<Record<string, unknown>>;
  /** Router settings overrides scoped to the team. */
  readonly router_settings?: Readonly<Record<string, unknown>>;
  /** Access groups the team is a member of. */
  readonly access_group_ids?: readonly string[];
  /** File-expiration policy enforced on the team. */
  readonly enforced_file_expires_after?: Readonly<Record<string, unknown>>;
  /** Batch-output expiration policy enforced on the team. */
  readonly enforced_batch_output_expires_after?: Readonly<Record<string, unknown>>;
  /** Multiple budget windows applied to the team. */
  readonly budget_limits?: readonly TeamBudgetLimit[];
  /** Default model allowlist for new members. */
  readonly default_team_member_models?: readonly string[];
}

/** Full team record returned by create/info/update. */
/**
 * Wrapper returned by `GET /team/info`: the team id plus a `team_info`
 * block with the row, alongside the team's keys and membership records.
 */
export interface TeamInfoResponse {
  /** Server-assigned team id. */
  readonly team_id: string;
  /** The team row itself. */
  readonly team_info: Team;
  /** Keys scoped to this team. */
  readonly keys: readonly Readonly<Record<string, unknown>>[];
  /** Per-member membership records. */
  readonly team_memberships: readonly Readonly<Record<string, unknown>>[];
}

export interface Team {
  /** Server-assigned id. */
  readonly team_id: string;
  /** Friendly alias. */
  readonly team_alias?: string;
  /** Parent organization id. */
  readonly organization_id?: string;
  /** Accumulated spend in USD. */
  readonly spend?: number;
  /** Hard spend ceiling. */
  readonly max_budget?: number;
  /** Warning threshold below `max_budget`. */
  readonly soft_budget?: number;
  /** Rolling window duration. */
  readonly budget_duration?: string;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Model allowlist. */
  readonly models?: readonly string[];
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Members with explicit roles. */
  readonly members_with_roles?: readonly TeamMemberSpec[];
  /** Full membership records. */
  readonly members?: readonly TeamMembership[];
  /** True when the team is currently blocked. */
  readonly blocked?: boolean;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
}

/** Partial-update body for `/team/update`. */
export interface UpdateTeamRequest extends Partial<Omit<CreateTeamRequest, "team_id">> {
  /** Target team id. */
  readonly team_id: string;
  /** Block or unblock the team. */
  readonly blocked?: boolean;
}

/** Body for `/team/delete`. */
export interface DeleteTeamsRequest {
  /** Team ids to delete. */
  readonly team_ids: readonly string[];
}

/** Body for `/team/block` and `/team/unblock`. */
export interface TeamIdRequest {
  /** Target team id. */
  readonly team_id: string;
}

/** Body for `/team/member_add`. */
/**
 * Member identity used when adding to a team. Discriminated by which of
 * `user_id` or `user_email` is supplied; the proxy raises `ValueError` when
 * both are missing.
 */
export type MemberIdentity =
  | { readonly user_id: string; readonly user_email?: string }
  | { readonly user_id?: string; readonly user_email: string };

export interface AddTeamMemberRequest {
  /** Target team id. */
  readonly team_id: string;
  /** Member to add (resolved by user id or email). */
  readonly member: MemberIdentity & {
    /** Role inside the team. */
    readonly role: TeamMemberRole;
  };
  /** Per-member spend ceiling within the team. */
  readonly max_budget_in_team?: number;
  /** Per-member model allowlist override. */
  readonly allowed_models?: readonly string[];
}

/** Body for `/team/member_delete`. */
export interface DeleteTeamMemberRequest {
  /** Target team id. */
  readonly team_id: string;
  /** User id to remove. */
  readonly user_id: string;
}

/** Body for `/team/member_update`. */
export interface UpdateTeamMemberRequest {
  /** Target team id. */
  readonly team_id: string;
  /** User id whose membership changes. */
  readonly user_id: string;
  /** New role to assign. */
  readonly role?: TeamMemberRole;
  /** Replace the per-member spend ceiling. */
  readonly max_budget_in_team?: number;
  /** Replace the per-member tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Replace the per-member requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Replace the per-member model allowlist. */
  readonly allowed_models?: readonly string[];
}

/** Body for `/team/model/add` and `/team/model/delete`. */
export interface TeamModelsRequest {
  /** Target team id. */
  readonly team_id: string;
  /** Models to add or remove. */
  readonly models: readonly string[];
}

/** Body for `/team/bulk_member_add`. */
export interface BulkAddTeamMembersRequest {
  /** Target team id. */
  readonly team_id: string;
  /** Members to add (mutually exclusive with `all_users`). */
  readonly members?: readonly (MemberIdentity & {
    /** Role inside the team. */
    readonly role: TeamMemberRole;
  })[];
  /** Add every user on the proxy to the team. */
  readonly all_users?: boolean;
  /** Per-member spend ceiling shared by every added member. */
  readonly max_budget_in_team?: number;
}

/** Per-member outcome row in `BulkAddTeamMembersResponse.results`. */
export interface BulkTeamMemberAddResult {
  /** Resolved user id, when known. */
  readonly user_id?: string;
  /** Email used to look the user up. */
  readonly user_email?: string;
  /** True when the member was added successfully. */
  readonly success: boolean;
  /** Error string when `success === false`. */
  readonly error?: string;
  /** Updated user row (when success). */
  readonly updated_user?: Readonly<Record<string, unknown>>;
  /** Updated team-membership row (when success). */
  readonly updated_team_membership?: Readonly<Record<string, unknown>>;
}

/** Response from `/team/bulk_member_add`. */
export interface BulkAddTeamMembersResponse {
  /** Target team id. */
  readonly team_id: string;
  /** Per-member outcomes in request order. */
  readonly results: readonly BulkTeamMemberAddResult[];
  /** Total members requested. */
  readonly total_requested: number;
  /** Number of successful additions. */
  readonly successful_additions: number;
  /** Number of failed additions. */
  readonly failed_additions: number;
  /** Refreshed team row after the bulk operation. */
  readonly updated_team?: Readonly<Record<string, unknown>>;
}

/** Response from `GET /team/{id}/members/me`. */
export interface TeamMemberMeResponse {
  /** Calling user id. */
  readonly user_id?: string;
  /** Calling user's email. */
  readonly user_email?: string;
  /** Role inside the team. */
  readonly role?: string;
  /** Friendly team alias. */
  readonly team_alias?: string;
  /** Per-member spend ceiling. */
  readonly max_budget_in_team?: number;
  /** Other membership fields the proxy may include. */
  readonly [key: string]: unknown;
}

/** Body for `POST /team/{id}/callback`. */
export interface AddTeamCallbackRequest {
  /** Logging callback identifier (e.g. `"langfuse"`). */
  readonly callback_name: string;
  /** Stage the callback fires in. Default `"success_and_failure"`. */
  readonly callback_type?: "success" | "failure" | "success_and_failure";
  /** Provider-specific configuration variables. */
  readonly callback_vars: Readonly<Record<string, string>>;
}

/** Response from `GET /team/{id}/callback`. */
export interface TeamCallbacksResponse {
  /** Configured callbacks. */
  readonly callbacks: readonly Readonly<Record<string, unknown>>[];
  /** Other top-level fields the proxy may include. */
  readonly [key: string]: unknown;
}

/** Response from `GET /team/permissions_list`. */
export interface TeamMemberPermissionsResponse {
  /** Team id the permissions apply to. */
  readonly team_id: string;
  /** Permissions currently granted to team members. */
  readonly team_member_permissions: readonly string[];
  /** Catalog of permissions the proxy knows about. */
  readonly all_available_permissions: readonly string[];
}

/** Body for `POST /team/permissions_update`. */
export interface UpdateTeamMemberPermissionsRequest {
  /** Target team id. */
  readonly team_id: string;
  /** Replacement permission set. */
  readonly team_member_permissions: readonly string[];
}

/** Body for `POST /team/permissions_bulk_update`. */
export interface BulkUpdateTeamMemberPermissionsRequest {
  /** Permissions appended to each target team (duplicates skipped). */
  readonly permissions: readonly string[];
  /** Specific team ids to update. Required unless `apply_to_all_teams` is `true`. */
  readonly team_ids?: readonly string[];
  /** When `true`, apply to every team. Mutually exclusive with `team_ids`. */
  readonly apply_to_all_teams?: boolean;
}

/** Response from `POST /team/permissions_bulk_update`. */
export interface BulkUpdateTeamMemberPermissionsResponse {
  /** Human-readable summary. */
  readonly message: string;
  /** Number of teams that received the update. */
  readonly teams_updated: number;
  /** Permissions appended (after dedup). */
  readonly permissions_appended?: readonly string[];
}

/** Query parameters for `GET /team/daily/activity`. */
export interface TeamDailyActivityQuery {
  /** Comma-separated team ids. */
  readonly team_ids?: string;
  /** Inclusive start date `YYYY-MM-DD`. */
  readonly start_date?: string;
  /** Inclusive end date `YYYY-MM-DD`. */
  readonly end_date?: string;
  /** Filter by model name. */
  readonly model?: string;
  /** Filter by virtual key. */
  readonly api_key?: string;
  /** Page number (1-indexed). */
  readonly page?: number;
  /** Page size. */
  readonly page_size?: number;
  /** Team ids to exclude from the aggregation. */
  readonly exclude_team_ids?: string;
}

/** Response from `/team/list`. */
/** Response from `/team/list`. The proxy returns a flat array. */
export type ListTeamsResponse = readonly Team[];

/** Surface for team administration on the `Client`. */
export interface TeamsNamespace {
  /** Create a team. */
  create(req: CreateTeamRequest): Promise<Result<Team, ApiError>>;
  /** Retrieve a team by id. */
  info(teamId: string): Promise<Result<TeamInfoResponse, ApiError>>;
  /** List teams accessible to the caller. */
  list(): Promise<Result<ListTeamsResponse, ApiError>>;
  /** Partially update a team. */
  update(req: UpdateTeamRequest): Promise<Result<Team, ApiError>>;
  /** Soft-delete one or more teams. Returns the deleted rows. */
  delete(req: DeleteTeamsRequest): Promise<Result<readonly Team[], ApiError>>;
  /** Block a team (and all its keys). */
  block(req: TeamIdRequest): Promise<Result<Team, ApiError>>;
  /** Unblock a previously blocked team. */
  unblock(req: TeamIdRequest): Promise<Result<Team, ApiError>>;
  /** Add a member to a team. */
  addMember(req: AddTeamMemberRequest): Promise<Result<TeamMembership, ApiError>>;
  /** Remove a member from a team. Returns the updated team. */
  deleteMember(
    req: DeleteTeamMemberRequest,
  ): Promise<Result<Team, ApiError>>;
  /** Update a member's role or per-member limits. */
  updateMember(req: UpdateTeamMemberRequest): Promise<Result<TeamMembership, ApiError>>;
  /** Append models to a team's allowed model list. */
  addModels(req: TeamModelsRequest): Promise<Result<Team, ApiError>>;
  /** Remove models from a team's allowed model list. */
  deleteModels(req: TeamModelsRequest): Promise<Result<Team, ApiError>>;
  /** Bulk-add members to a team (with optional per-member budget). */
  bulkAddMembers(
    req: BulkAddTeamMembersRequest,
  ): Promise<Result<BulkAddTeamMembersResponse, ApiError>>;
  /** List teams the caller has access to (auth-context-derived). */
  available(): Promise<Result<readonly Team[], ApiError>>;
  /** Return the caller's membership row inside a team. */
  myMembership(teamId: string): Promise<Result<TeamMemberMeResponse, ApiError>>;
  /** Get the configured logging callbacks for a team. */
  getCallbacks(teamId: string): Promise<Result<TeamCallbacksResponse, ApiError>>;
  /** Add a logging callback to a team. */
  addCallback(
    teamId: string,
    req: AddTeamCallbackRequest,
  ): Promise<Result<unknown, ApiError>>;
  /** Disable per-request logging for a team. */
  disableLogging(teamId: string): Promise<Result<unknown, ApiError>>;
  /** Get team member permissions for a team. */
  getMemberPermissions(
    teamId: string,
  ): Promise<Result<TeamMemberPermissionsResponse, ApiError>>;
  /** Replace team member permissions for a team. */
  updateMemberPermissions(
    req: UpdateTeamMemberPermissionsRequest,
  ): Promise<Result<unknown, ApiError>>;
  /** Append permissions across many teams (or all teams). */
  bulkUpdateMemberPermissions(
    req: BulkUpdateTeamMemberPermissionsRequest,
  ): Promise<Result<BulkUpdateTeamMemberPermissionsResponse, ApiError>>;
  /** Per-day spend / request counters for a team. */
  dailyActivity(query?: TeamDailyActivityQuery): Promise<Result<unknown, ApiError>>;
  /**
   * Paginated team listing with rich filtering (`GET /v2/team/list`).
   * Distinct from `list`, which returns every accessible team without
   * pagination. Returned as `unknown` because the v2 response includes
   * pagination metadata the v1 shape lacks.
   */
  listV2(query?: ListTeamsV2Query): Promise<Result<unknown, ApiError>>;
}

/** Query parameters for `GET /v2/team/list`. */
export interface ListTeamsV2Query {
  /** Restrict to teams a particular user belongs to. */
  readonly user_id?: string;
  /** Restrict to a single organization. */
  readonly organization_id?: string;
  /** Restrict to a single team id. */
  readonly team_id?: string;
  /** Partial-match filter on `team_alias`. */
  readonly team_alias?: string;
  /** Combined `team_id` / `team_alias` substring filter. */
  readonly search?: string;
  /** 1-based page number. Default 1. */
  readonly page?: number;
  /** Page size (1-100). Default 10. */
  readonly page_size?: number;
  /** Sort column (`"team_id"`, `"team_alias"`, `"created_at"`). */
  readonly sort_by?: string;
  /** Sort direction (`"asc"` or `"desc"`). Default `"asc"`. */
  readonly sort_order?: "asc" | "desc";
  /** Filter by status. Currently only `"deleted"` is supported. */
  readonly status?: string;
}

/** Bind a `TeamsNamespace` to a constructed `Transport`. */
export const createTeams = (transport: Transport): TeamsNamespace => ({
  create(req) {
    return transport.request<Team>({ method: "POST", path: "/team/new", body: req });
  },
  info(teamId) {
    return transport.request<TeamInfoResponse>({
      method: "GET",
      path: "/team/info",
      query: { team_id: teamId },
    });
  },
  list() {
    return transport.request<ListTeamsResponse>({ method: "GET", path: "/team/list" });
  },
  update(req) {
    return transport.request<Team>({ method: "POST", path: "/team/update", body: req });
  },
  delete(req) {
    return transport.request<readonly Team[]>({
      method: "POST",
      path: "/team/delete",
      body: req,
    });
  },
  block(req) {
    return transport.request<Team>({ method: "POST", path: "/team/block", body: req });
  },
  unblock(req) {
    return transport.request<Team>({ method: "POST", path: "/team/unblock", body: req });
  },
  addMember(req) {
    return transport.request<TeamMembership>({
      method: "POST",
      path: "/team/member_add",
      body: req,
    });
  },
  deleteMember(req) {
    return transport.request<Team>({
      method: "POST",
      path: "/team/member_delete",
      body: req,
    });
  },
  updateMember(req) {
    return transport.request<TeamMembership>({
      method: "POST",
      path: "/team/member_update",
      body: req,
    });
  },
  addModels(req) {
    return transport.request<Team>({ method: "POST", path: "/team/model/add", body: req });
  },
  deleteModels(req) {
    return transport.request<Team>({ method: "POST", path: "/team/model/delete", body: req });
  },
  bulkAddMembers(req) {
    return transport.request<BulkAddTeamMembersResponse>({
      method: "POST",
      path: "/team/bulk_member_add",
      body: req,
    });
  },
  available() {
    return transport.request<readonly Team[]>({ method: "GET", path: "/team/available" });
  },
  myMembership(teamId) {
    return transport.request<TeamMemberMeResponse>({
      method: "GET",
      path: `/team/${encodeURIComponent(teamId)}/members/me`,
    });
  },
  getCallbacks(teamId) {
    return transport.request<TeamCallbacksResponse>({
      method: "GET",
      path: `/team/${encodeURIComponent(teamId)}/callback`,
    });
  },
  addCallback(teamId, req) {
    return transport.request<unknown>({
      method: "POST",
      path: `/team/${encodeURIComponent(teamId)}/callback`,
      body: req,
    });
  },
  disableLogging(teamId) {
    return transport.request<unknown>({
      method: "POST",
      path: `/team/${encodeURIComponent(teamId)}/disable_logging`,
    });
  },
  getMemberPermissions(teamId) {
    return transport.request<TeamMemberPermissionsResponse>({
      method: "GET",
      path: "/team/permissions_list",
      query: { team_id: teamId },
    });
  },
  updateMemberPermissions(req) {
    return transport.request<unknown>({
      method: "POST",
      path: "/team/permissions_update",
      body: req,
    });
  },
  bulkUpdateMemberPermissions(req) {
    return transport.request<BulkUpdateTeamMemberPermissionsResponse>({
      method: "POST",
      path: "/team/permissions_bulk_update",
      body: req,
    });
  },
  dailyActivity(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/team/daily/activity",
      ...(query === undefined ? {} : {
        query: Object.fromEntries(
          Object.entries(query).filter(([, v]) => v !== undefined) as [string, string | number][],
        ),
      }),
    });
  },
  listV2(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/v2/team/list",
      ...(query === undefined ? {} : {
        query: Object.fromEntries(
          Object.entries(query).filter(([, v]) => v !== undefined) as [string, string | number][],
        ),
      }),
    });
  },
});
