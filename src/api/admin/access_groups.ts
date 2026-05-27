import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Request body for `POST /v1/access_group`. */
export interface CreateAccessGroupRequest {
  /** Unique group name. */
  readonly access_group_name: string;
  /** Free-form description. */
  readonly description?: string;
  /** Model names members of this group may use. */
  readonly access_model_names?: readonly string[];
  /** MCP server ids members may reach. */
  readonly access_mcp_server_ids?: readonly string[];
  /** Agent ids members may invoke. */
  readonly access_agent_ids?: readonly string[];
  /** Team ids that inherit this group's permissions. */
  readonly assigned_team_ids?: readonly string[];
  /** Key ids that inherit this group's permissions. */
  readonly assigned_key_ids?: readonly string[];
}

/** Request body for `PUT /v1/access_group/{id}`. */
export interface UpdateAccessGroupRequest {
  /** Rename the group. */
  readonly access_group_name?: string;
  /** Replace the description. */
  readonly description?: string;
  /** Replace the model allowlist. */
  readonly access_model_names?: readonly string[];
  /** Replace the MCP server allowlist. */
  readonly access_mcp_server_ids?: readonly string[];
  /** Replace the agent allowlist. */
  readonly access_agent_ids?: readonly string[];
  /** Replace the team assignment list. */
  readonly assigned_team_ids?: readonly string[];
  /** Replace the key assignment list. */
  readonly assigned_key_ids?: readonly string[];
}

/** A single access group record. */
export interface AccessGroup {
  /** Server-assigned id. */
  readonly access_group_id: string;
  /** Group display name. */
  readonly access_group_name: string;
  /** Free-form description. */
  readonly description?: string;
  /** Model allowlist. */
  readonly access_model_names: readonly string[];
  /** MCP server allowlist. */
  readonly access_mcp_server_ids: readonly string[];
  /** Agent allowlist. */
  readonly access_agent_ids: readonly string[];
  /** Teams assigned to the group. */
  readonly assigned_team_ids: readonly string[];
  /** Keys assigned to the group. */
  readonly assigned_key_ids: readonly string[];
  /** ISO-8601 creation timestamp. */
  readonly created_at: string;
  /** Identifier of the creating user. */
  readonly created_by?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at: string;
  /** Identifier of the last user to update. */
  readonly updated_by?: string;
}

/** Surface for access-group administration on the `Client`. */
export interface AccessGroupsNamespace {
  /** Create a new access group. */
  create(req: CreateAccessGroupRequest): Promise<Result<AccessGroup, ApiError>>;
  /** List all access groups. */
  list(): Promise<Result<readonly AccessGroup[], ApiError>>;
  /** Retrieve an access group by id. */
  get(accessGroupId: string): Promise<Result<AccessGroup, ApiError>>;
  /** Partially update an access group. */
  update(
    accessGroupId: string,
    req: UpdateAccessGroupRequest,
  ): Promise<Result<AccessGroup, ApiError>>;
  /** Delete an access group by id. */
  delete(accessGroupId: string): Promise<Result<unknown, ApiError>>;
}

/**
 * Request body for the legacy `POST /access_group/new` endpoint. Distinct
 * from `CreateAccessGroupRequest`: this form tags model deployments by name
 * (or by id) so that keys/teams referencing the access group can route to
 * them.
 */
export interface CreateModelAccessGroupRequest {
  /** Access group name (e.g. `"production-models"`). */
  readonly access_group: string;
  /** Model names to tag (tags every deployment for each name). */
  readonly model_names?: readonly string[];
  /** Specific deployment ids to tag (more precise than `model_names`). */
  readonly model_ids?: readonly string[];
}

/**
 * Request body for `PUT /access_group/{access_group}/update`. At least one of
 * `model_names` and `model_ids` must be provided.
 */
export interface UpdateModelAccessGroupRequest {
  /** Replacement model names list. */
  readonly model_names?: readonly string[];
  /** Replacement deployment id list. */
  readonly model_ids?: readonly string[];
}

/** Response from create / update on a model access group. */
export interface ModelAccessGroupMutationResponse {
  /** Access group name. */
  readonly access_group: string;
  /** Echoed model names list, when supplied. */
  readonly model_names?: readonly string[] | null;
  /** Echoed deployment ids, when supplied. */
  readonly model_ids?: readonly string[] | null;
  /** Number of deployments updated by the call. */
  readonly models_updated: number;
}

/** Response from `DELETE /access_group/{access_group}/delete`. */
export interface DeleteModelAccessGroupResponse {
  /** Access group name. */
  readonly access_group: string;
  /** Number of deployments where the access group tag was removed. */
  readonly models_updated: number;
  /** Human-readable status message. */
  readonly message: string;
}

/** Aggregated info for one model access group. */
export interface ModelAccessGroupInfo {
  /** Access group name. */
  readonly access_group: string;
  /** Model names that belong to this access group. */
  readonly model_names: readonly string[];
  /** Total number of deployments carrying this access group. */
  readonly deployment_count: number;
}

/** Response from `GET /access_group/list`. */
export interface ListModelAccessGroupsResponse {
  /** Access groups, sorted by name. */
  readonly access_groups: readonly ModelAccessGroupInfo[];
}

/**
 * Surface for the legacy model access group endpoints (`/access_group/*`).
 * Distinct from `AccessGroupsNamespace`, which targets the newer unified
 * access-group ACL API.
 */
export interface ModelAccessGroupsNamespace {
  /** Create a model access group by tagging deployments. */
  create(
    req: CreateModelAccessGroupRequest,
  ): Promise<Result<ModelAccessGroupMutationResponse, ApiError>>;
  /** List every model access group with deployment counts. */
  list(): Promise<Result<ListModelAccessGroupsResponse, ApiError>>;
  /** Retrieve aggregated info for one access group. */
  info(accessGroup: string): Promise<Result<ModelAccessGroupInfo, ApiError>>;
  /** Replace the deployment membership for an access group. */
  update(
    accessGroup: string,
    req: UpdateModelAccessGroupRequest,
  ): Promise<Result<ModelAccessGroupMutationResponse, ApiError>>;
  /** Remove the access group tag from every deployment. */
  delete(
    accessGroup: string,
  ): Promise<Result<DeleteModelAccessGroupResponse, ApiError>>;
}

const encode = (s: string) => encodeURIComponent(s);

/** Bind an `AccessGroupsNamespace` to a constructed `Transport`. */
export const createAccessGroups = (transport: Transport): AccessGroupsNamespace => ({
  create(req) {
    return transport.request<AccessGroup>({
      method: "POST",
      path: "/v1/access_group",
      body: req,
    });
  },
  list() {
    return transport.request<readonly AccessGroup[]>({
      method: "GET",
      path: "/v1/access_group",
    });
  },
  get(accessGroupId) {
    return transport.request<AccessGroup>({
      method: "GET",
      path: `/v1/access_group/${encode(accessGroupId)}`,
    });
  },
  update(accessGroupId, req) {
    return transport.request<AccessGroup>({
      method: "PUT",
      path: `/v1/access_group/${encode(accessGroupId)}`,
      body: req,
    });
  },
  delete(accessGroupId) {
    return transport.request<unknown>({
      method: "DELETE",
      path: `/v1/access_group/${encode(accessGroupId)}`,
    });
  },
});

/** Bind a `ModelAccessGroupsNamespace` to a constructed `Transport`. */
export const createModelAccessGroups = (
  transport: Transport,
): ModelAccessGroupsNamespace => ({
  create(req) {
    return transport.request<ModelAccessGroupMutationResponse>({
      method: "POST",
      path: "/access_group/new",
      body: req,
    });
  },
  list() {
    return transport.request<ListModelAccessGroupsResponse>({
      method: "GET",
      path: "/access_group/list",
    });
  },
  info(accessGroup) {
    return transport.request<ModelAccessGroupInfo>({
      method: "GET",
      path: `/access_group/${encode(accessGroup)}/info`,
    });
  },
  update(accessGroup, req) {
    return transport.request<ModelAccessGroupMutationResponse>({
      method: "PUT",
      path: `/access_group/${encode(accessGroup)}/update`,
      body: req,
    });
  },
  delete(accessGroup) {
    return transport.request<DeleteModelAccessGroupResponse>({
      method: "DELETE",
      path: `/access_group/${encode(accessGroup)}/delete`,
    });
  },
});
