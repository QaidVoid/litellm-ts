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

/** Body for `/team/member/add`. */
export interface AddTeamMemberRequest {
  /** Target team id. */
  readonly team_id: string;
  /** Member to add (resolved by user id or email). */
  readonly member: {
    /** User identifier. */
    readonly user_id?: string;
    /** User email; resolved to `user_id` when set. */
    readonly user_email?: string;
    /** Role inside the team. */
    readonly role: TeamMemberRole;
  };
  /** Per-member spend ceiling within the team. */
  readonly max_budget_in_team?: number;
  /** Per-member model allowlist override. */
  readonly allowed_models?: readonly string[];
}

/** Body for `/team/member/delete`. */
export interface DeleteTeamMemberRequest {
  /** Target team id. */
  readonly team_id: string;
  /** User id to remove. */
  readonly user_id: string;
}

/** Body for `/team/member/update`. */
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

/** Response from `/team/list`. */
export interface ListTeamsResponse {
  /** Returned teams. */
  readonly teams: readonly Team[];
  /** Total team count across all pages. */
  readonly total_count?: number;
  /** Page number returned. */
  readonly page?: number;
}

/** Surface for team administration on the `Client`. */
export interface TeamsNamespace {
  /** Create a team. */
  create(req: CreateTeamRequest): Promise<Result<Team, ApiError>>;
  /** Retrieve a team by id. */
  info(teamId: string): Promise<Result<Team, ApiError>>;
  /** List teams accessible to the caller. */
  list(): Promise<Result<ListTeamsResponse, ApiError>>;
  /** Partially update a team. */
  update(req: UpdateTeamRequest): Promise<Result<Team, ApiError>>;
  /** Soft-delete one or more teams. */
  delete(req: DeleteTeamsRequest): Promise<Result<{ readonly status: "success" }, ApiError>>;
  /** Block a team (and all its keys). */
  block(req: TeamIdRequest): Promise<Result<Team, ApiError>>;
  /** Unblock a previously blocked team. */
  unblock(req: TeamIdRequest): Promise<Result<Team, ApiError>>;
  /** Add a member to a team. */
  addMember(req: AddTeamMemberRequest): Promise<Result<TeamMembership, ApiError>>;
  /** Remove a member from a team. */
  deleteMember(
    req: DeleteTeamMemberRequest,
  ): Promise<Result<{ readonly status: "success" }, ApiError>>;
  /** Update a member's role or per-member limits. */
  updateMember(req: UpdateTeamMemberRequest): Promise<Result<TeamMembership, ApiError>>;
  /** Append models to a team's allowed model list. */
  addModels(req: TeamModelsRequest): Promise<Result<Team, ApiError>>;
  /** Remove models from a team's allowed model list. */
  deleteModels(req: TeamModelsRequest): Promise<Result<Team, ApiError>>;
}

/** Bind a `TeamsNamespace` to a constructed `Transport`. */
export const createTeams = (transport: Transport): TeamsNamespace => ({
  create(req) {
    return transport.request<Team>({ method: "POST", path: "/team/new", body: req });
  },
  info(teamId) {
    return transport.request<Team>({
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
    return transport.request<{ readonly status: "success" }>({
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
      path: "/team/member/add",
      body: req,
    });
  },
  deleteMember(req) {
    return transport.request<{ readonly status: "success" }>({
      method: "POST",
      path: "/team/member/delete",
      body: req,
    });
  },
  updateMember(req) {
    return transport.request<TeamMembership>({
      method: "POST",
      path: "/team/member/update",
      body: req,
    });
  },
  addModels(req) {
    return transport.request<Team>({ method: "POST", path: "/team/model/add", body: req });
  },
  deleteModels(req) {
    return transport.request<Team>({ method: "POST", path: "/team/model/delete", body: req });
  },
});
