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
