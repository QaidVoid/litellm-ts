import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Per-model budget descriptor accepted on project create/update. */
export interface ProjectModelBudget {
  /** Hard spend ceiling in USD. */
  readonly max_budget?: number;
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Rolling window duration (e.g. `"30d"`). */
  readonly budget_duration?: string;
}

/** Request body for `POST /project/new`. */
export interface CreateProjectRequest {
  /** Owning team id. Required by the proxy. */
  readonly team_id: string;
  /** Explicit project id. Defaults to a server-generated UUID. */
  readonly project_id?: string;
  /** Friendly alias shown in dashboards. */
  readonly project_alias?: string;
  /** Free-form description. */
  readonly description?: string;
  /** Model allowlist for the project. */
  readonly models?: readonly string[];
  /** Reuse an existing budget. Mutually exclusive with the inline budget fields. */
  readonly budget_id?: string;
  /** Hard spend ceiling in USD. */
  readonly max_budget?: number;
  /** Warning threshold below `max_budget`. */
  readonly soft_budget?: number;
  /** Rolling window duration (e.g. `"30d"`). */
  readonly budget_duration?: string;
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Maximum parallel in-flight requests. */
  readonly max_parallel_requests?: number;
  /** Per-model budget map keyed by model name. */
  readonly model_max_budget?: Readonly<Record<string, ProjectModelBudget>>;
  /** Per-model requests-per-minute ceilings. */
  readonly model_rpm_limit?: Readonly<Record<string, number>>;
  /** Per-model tokens-per-minute ceilings. */
  readonly model_tpm_limit?: Readonly<Record<string, number>>;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Tags applied to the project. */
  readonly tags?: readonly string[];
  /** Guardrails applied to the project. */
  readonly guardrails?: readonly string[];
  /** Policies applied to the project. */
  readonly policies?: readonly string[];
  /** Object-level permissions (vector stores, etc.). */
  readonly object_permission?: Readonly<Record<string, unknown>>;
  /** Block the project at creation time. */
  readonly blocked?: boolean;
}

/** Request body for `POST /project/update`. */
export interface UpdateProjectRequest
  extends Partial<Omit<CreateProjectRequest, "project_id" | "team_id">> {
  /** Project id to update. */
  readonly project_id: string;
  /** Move the project to a different team. */
  readonly team_id?: string;
}

/** Request body for `DELETE /project/delete`. */
export interface DeleteProjectRequest {
  /** Project ids to delete. */
  readonly project_ids: readonly string[];
}

/** A single project record. */
export interface Project {
  /** Server-assigned id. */
  readonly project_id: string;
  /** Owning team id. */
  readonly team_id?: string;
  /** Friendly alias. */
  readonly project_alias?: string;
  /** Free-form description. */
  readonly description?: string;
  /** Bound budget id, when not inline. */
  readonly budget_id?: string;
  /** Model allowlist. */
  readonly models?: readonly string[];
  /** Per-model RPM caps. */
  readonly model_rpm_limit?: Readonly<Record<string, number>>;
  /** Per-model TPM caps. */
  readonly model_tpm_limit?: Readonly<Record<string, number>>;
  /** Per-model accumulated spend. */
  readonly model_spend?: Readonly<Record<string, number>>;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Accumulated spend in USD. */
  readonly spend?: number;
  /** True when the project is blocked from new traffic. */
  readonly blocked?: boolean;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** Identifier of the creating user. */
  readonly created_by?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
  /** Identifier of the last user to update. */
  readonly updated_by?: string;
  /** Joined budget row, when the project has one. */
  readonly litellm_budget_table?: Readonly<Record<string, unknown>>;
  /** Object permission record id, when bound. */
  readonly object_permission_id?: string;
  /** Inline object permission block. */
  readonly object_permission?: Readonly<Record<string, unknown>>;
}

/** Surface for project administration on the `Client`. */
export interface ProjectsNamespace {
  /** Create a new project under a team. */
  create(req: CreateProjectRequest): Promise<Result<Project, ApiError>>;
  /** List all projects visible to the caller. */
  list(): Promise<Result<readonly Project[], ApiError>>;
  /** Retrieve a project by id. */
  info(projectId: string): Promise<Result<Project, ApiError>>;
  /** Partially update a project. */
  update(req: UpdateProjectRequest): Promise<Result<Project, ApiError>>;
  /** Delete one or more projects. */
  delete(req: DeleteProjectRequest): Promise<Result<readonly Project[], ApiError>>;
}

/** Bind a `ProjectsNamespace` to a constructed `Transport`. */
export const createProjects = (transport: Transport): ProjectsNamespace => ({
  create(req) {
    return transport.request<Project>({ method: "POST", path: "/project/new", body: req });
  },
  list() {
    return transport.request<readonly Project[]>({ method: "GET", path: "/project/list" });
  },
  info(projectId) {
    return transport.request<Project>({
      method: "GET",
      path: "/project/info",
      query: { project_id: projectId },
    });
  },
  update(req) {
    return transport.request<Project>({ method: "POST", path: "/project/update", body: req });
  },
  delete(req) {
    return transport.request<readonly Project[]>({
      method: "DELETE",
      path: "/project/delete",
      body: req,
    });
  },
});
