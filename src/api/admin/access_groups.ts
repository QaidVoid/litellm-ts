import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Request body for `POST /v1/access_group`. */
export interface CreateAccessGroupRequest {
  readonly access_group_name: string;
  readonly description?: string;
  readonly access_model_names?: readonly string[];
  readonly access_mcp_server_ids?: readonly string[];
  readonly access_agent_ids?: readonly string[];
  readonly assigned_team_ids?: readonly string[];
  readonly assigned_key_ids?: readonly string[];
}

/** Request body for `PUT /v1/access_group/{id}`. */
export interface UpdateAccessGroupRequest {
  readonly access_group_name?: string;
  readonly description?: string;
  readonly access_model_names?: readonly string[];
  readonly access_mcp_server_ids?: readonly string[];
  readonly access_agent_ids?: readonly string[];
  readonly assigned_team_ids?: readonly string[];
  readonly assigned_key_ids?: readonly string[];
}

/** A single access group record. */
export interface AccessGroup {
  readonly access_group_id: string;
  readonly access_group_name: string;
  readonly description?: string;
  readonly access_model_names: readonly string[];
  readonly access_mcp_server_ids: readonly string[];
  readonly access_agent_ids: readonly string[];
  readonly assigned_team_ids: readonly string[];
  readonly assigned_key_ids: readonly string[];
  readonly created_at: string;
  readonly created_by?: string;
  readonly updated_at: string;
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
