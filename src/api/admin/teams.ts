import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Role of a team member. */
export type TeamMemberRole = "admin" | "user";

/** A single team membership record. */
export interface TeamMembership {
  readonly user_id: string;
  readonly role: TeamMemberRole;
  readonly max_budget_in_team?: number;
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
  readonly allowed_models?: readonly string[];
}

/** Budget window descriptor used in `budget_limits` arrays. */
export interface TeamBudgetLimit {
  readonly budget_duration: string;
  readonly max_budget: number;
  readonly reset_at?: string;
}

/** Member specification accepted by `team.new`. */
export interface TeamMemberSpec {
  readonly user_id: string;
  readonly role: TeamMemberRole;
}

/** Request body for `/team/new`. */
export interface CreateTeamRequest {
  readonly team_alias?: string;
  readonly team_id?: string;
  readonly organization_id?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly models?: readonly string[];
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
  readonly max_budget?: number;
  readonly soft_budget?: number;
  readonly budget_duration?: string;
  readonly members_with_roles?: readonly TeamMemberSpec[];
  readonly model_aliases?: Readonly<Record<string, string>>;
  readonly tags?: readonly string[];
  readonly guardrails?: readonly string[];
  readonly policies?: readonly string[];
  readonly team_member_budget?: number;
  readonly team_member_rpm_limit?: number;
  readonly team_member_tpm_limit?: number;
  readonly team_member_key_duration?: string;
  readonly team_member_budget_duration?: string;
  readonly allowed_passthrough_routes?: readonly string[];
  readonly object_permission?: Readonly<Record<string, unknown>>;
  readonly router_settings?: Readonly<Record<string, unknown>>;
  readonly access_group_ids?: readonly string[];
  readonly enforced_file_expires_after?: Readonly<Record<string, unknown>>;
  readonly enforced_batch_output_expires_after?: Readonly<Record<string, unknown>>;
  readonly budget_limits?: readonly TeamBudgetLimit[];
  readonly default_team_member_models?: readonly string[];
}

/** Full team record returned by create/info/update. */
export interface Team {
  readonly team_id: string;
  readonly team_alias?: string;
  readonly organization_id?: string;
  readonly spend?: number;
  readonly max_budget?: number;
  readonly soft_budget?: number;
  readonly budget_duration?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly models?: readonly string[];
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
  readonly members_with_roles?: readonly TeamMemberSpec[];
  readonly members?: readonly TeamMembership[];
  readonly blocked?: boolean;
  readonly created_at?: string;
  readonly updated_at?: string;
}

/** Partial-update body for `/team/update`. */
export interface UpdateTeamRequest extends Partial<Omit<CreateTeamRequest, "team_id">> {
  /** Target team id. */
  readonly team_id: string;
  readonly blocked?: boolean;
}

/** Body for `/team/delete`. */
export interface DeleteTeamsRequest {
  readonly team_ids: readonly string[];
}

/** Body for `/team/block` and `/team/unblock`. */
export interface TeamIdRequest {
  readonly team_id: string;
}

/** Body for `/team/member/add`. */
export interface AddTeamMemberRequest {
  readonly team_id: string;
  readonly member: {
    readonly user_id?: string;
    readonly user_email?: string;
    readonly role: TeamMemberRole;
  };
  readonly max_budget_in_team?: number;
  readonly allowed_models?: readonly string[];
}

/** Body for `/team/member/delete`. */
export interface DeleteTeamMemberRequest {
  readonly team_id: string;
  readonly user_id: string;
}

/** Body for `/team/member/update`. */
export interface UpdateTeamMemberRequest {
  readonly team_id: string;
  readonly user_id: string;
  readonly role?: TeamMemberRole;
  readonly max_budget_in_team?: number;
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
  readonly allowed_models?: readonly string[];
}

/** Body for `/team/model/add` and `/team/model/delete`. */
export interface TeamModelsRequest {
  readonly team_id: string;
  readonly models: readonly string[];
}

/** Response from `/team/list`. */
export interface ListTeamsResponse {
  readonly teams: readonly Team[];
  readonly total_count?: number;
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
