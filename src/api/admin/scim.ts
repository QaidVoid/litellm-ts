import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Common fields on a SCIM resource (RFC 7643). */
export interface ScimResource {
  readonly schemas: readonly string[];
  readonly id?: string;
  readonly externalId?: string;
  readonly meta?: Readonly<Record<string, unknown>>;
}

/** Multi-part name component on `ScimUser.name`. */
export interface ScimUserName {
  readonly familyName?: string;
  readonly givenName?: string;
  readonly formatted?: string;
  readonly middleName?: string;
  readonly honorificPrefix?: string;
  readonly honorificSuffix?: string;
}

/** Email entry on a `ScimUser`. */
export interface ScimUserEmail {
  readonly value: string;
  readonly type?: string;
  readonly primary?: boolean;
}

/** Group reference on a `ScimUser`. */
export interface ScimUserGroup {
  readonly value: string;
  readonly display?: string;
  readonly type?: "direct" | "indirect";
}

/** A SCIM user resource. */
export interface ScimUser extends ScimResource {
  readonly userName?: string;
  readonly name?: ScimUserName;
  readonly displayName?: string;
  readonly active?: boolean;
  readonly emails?: readonly ScimUserEmail[];
  readonly groups?: readonly ScimUserGroup[];
}

/** Group member on a `ScimGroup`. */
export interface ScimMember {
  readonly value: string;
  readonly display?: string;
}

/** A SCIM group resource. */
export interface ScimGroup extends ScimResource {
  readonly displayName: string;
  readonly members?: readonly ScimMember[];
}

/** Generic SCIM list response wrapping a `Resources` array. */
export interface ScimListResponse<T> {
  readonly schemas: readonly string[];
  readonly totalResults: number;
  readonly startIndex?: number;
  readonly itemsPerPage?: number;
  readonly Resources: readonly T[];
}

/** A single PATCH operation in `ScimPatchOp.Operations`. */
export interface ScimPatchOperation {
  readonly op: "add" | "remove" | "replace";
  readonly path?: string;
  readonly value?: unknown;
}

/** Request body for SCIM PATCH endpoints. */
export interface ScimPatchOp {
  readonly schemas?: readonly string[];
  readonly Operations: readonly ScimPatchOperation[];
}

/** Service-provider feature flag block in `ScimServiceProviderConfig`. */
export interface ScimFeature {
  readonly supported: boolean;
  readonly maxOperations?: number;
  readonly maxPayloadSize?: number;
  readonly maxResults?: number;
}

/** Response from `GET /scim/v2/ServiceProviderConfig`. */
export interface ScimServiceProviderConfig {
  readonly schemas: readonly string[];
  readonly patch?: ScimFeature;
  readonly bulk?: ScimFeature;
  readonly filter?: ScimFeature;
  readonly changePassword?: ScimFeature;
  readonly sort?: ScimFeature;
  readonly etag?: ScimFeature;
  readonly authenticationSchemes?: readonly Readonly<Record<string, unknown>>[];
  readonly meta?: Readonly<Record<string, unknown>>;
}

/** Resource-type metadata in `GET /scim/v2/ResourceTypes`. */
export interface ScimResourceType {
  readonly schemas: readonly string[];
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly endpoint: string;
  readonly schema: string;
  readonly schemaExtensions?: readonly Readonly<Record<string, unknown>>[];
  readonly meta?: Readonly<Record<string, unknown>>;
}

/** Attribute descriptor on a `ScimSchema`. */
export interface ScimSchemaAttribute {
  readonly name: string;
  readonly type: string;
  readonly multiValued: boolean;
  readonly description?: string;
  readonly required: boolean;
  readonly mutability: string;
  readonly returned: string;
  readonly uniqueness: string;
  readonly subAttributes?: readonly ScimSchemaAttribute[];
}

/** A SCIM schema definition (RFC 7643 Section 7). */
export interface ScimSchema {
  readonly schemas: readonly string[];
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly attributes: readonly ScimSchemaAttribute[];
  readonly meta?: Readonly<Record<string, unknown>>;
}

/** Query parameters supported by `GET /scim/v2/{Users,Groups}`. */
export interface ScimListQuery {
  readonly startIndex?: number;
  readonly count?: number;
  /** SCIM filter expression. The proxy supports a limited subset Okta emits. */
  readonly filter?: string;
}

/** Sub-namespace for `/scim/v2/Users`. */
export interface ScimUsersNamespace {
  list(query?: ScimListQuery): Promise<Result<ScimListResponse<ScimUser>, ApiError>>;
  get(userId: string): Promise<Result<ScimUser, ApiError>>;
  create(user: ScimUser): Promise<Result<ScimUser, ApiError>>;
  update(userId: string, user: ScimUser): Promise<Result<ScimUser, ApiError>>;
  patch(userId: string, patch: ScimPatchOp): Promise<Result<ScimUser, ApiError>>;
  delete(userId: string): Promise<Result<unknown, ApiError>>;
}

/** Sub-namespace for `/scim/v2/Groups`. */
export interface ScimGroupsNamespace {
  list(query?: ScimListQuery): Promise<Result<ScimListResponse<ScimGroup>, ApiError>>;
  get(groupId: string): Promise<Result<ScimGroup, ApiError>>;
  create(group: ScimGroup): Promise<Result<ScimGroup, ApiError>>;
  update(groupId: string, group: ScimGroup): Promise<Result<ScimGroup, ApiError>>;
  patch(groupId: string, patch: ScimPatchOp): Promise<Result<ScimGroup, ApiError>>;
  delete(groupId: string): Promise<Result<unknown, ApiError>>;
}

/** Surface for SCIM v2 administration on the `Client` (enterprise only). */
export interface ScimNamespace {
  /** Service provider configuration discovery. */
  serviceProviderConfig(): Promise<Result<ScimServiceProviderConfig, ApiError>>;
  /** List supported resource types. */
  resourceTypes(): Promise<Result<readonly ScimResourceType[], ApiError>>;
  /** Get a specific resource type by id. */
  resourceType(resourceTypeId: string): Promise<Result<ScimResourceType, ApiError>>;
  /** List supported schemas. */
  schemas(): Promise<Result<readonly ScimSchema[], ApiError>>;
  /** Get a specific schema by id. */
  schema(schemaId: string): Promise<Result<ScimSchema, ApiError>>;
  readonly users: ScimUsersNamespace;
  readonly groups: ScimGroupsNamespace;
}

const encode = (s: string) => encodeURIComponent(s);

const filterUndefined = <T extends object>(
  q: T,
): Readonly<Record<string, string | number | boolean>> => {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) out[k] = v as string | number | boolean;
  }
  return out;
};

const createUsers = (transport: Transport): ScimUsersNamespace => ({
  list(query) {
    return transport.request<ScimListResponse<ScimUser>>({
      method: "GET",
      path: "/scim/v2/Users",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  get(userId) {
    return transport.request<ScimUser>({
      method: "GET",
      path: `/scim/v2/Users/${encode(userId)}`,
    });
  },
  create(user) {
    return transport.request<ScimUser>({ method: "POST", path: "/scim/v2/Users", body: user });
  },
  update(userId, user) {
    return transport.request<ScimUser>({
      method: "PUT",
      path: `/scim/v2/Users/${encode(userId)}`,
      body: user,
    });
  },
  patch(userId, patch) {
    return transport.request<ScimUser>({
      method: "PATCH",
      path: `/scim/v2/Users/${encode(userId)}`,
      body: patch,
    });
  },
  delete(userId) {
    return transport.request<unknown>({
      method: "DELETE",
      path: `/scim/v2/Users/${encode(userId)}`,
    });
  },
});

const createGroups = (transport: Transport): ScimGroupsNamespace => ({
  list(query) {
    return transport.request<ScimListResponse<ScimGroup>>({
      method: "GET",
      path: "/scim/v2/Groups",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  get(groupId) {
    return transport.request<ScimGroup>({
      method: "GET",
      path: `/scim/v2/Groups/${encode(groupId)}`,
    });
  },
  create(group) {
    return transport.request<ScimGroup>({ method: "POST", path: "/scim/v2/Groups", body: group });
  },
  update(groupId, group) {
    return transport.request<ScimGroup>({
      method: "PUT",
      path: `/scim/v2/Groups/${encode(groupId)}`,
      body: group,
    });
  },
  patch(groupId, patch) {
    return transport.request<ScimGroup>({
      method: "PATCH",
      path: `/scim/v2/Groups/${encode(groupId)}`,
      body: patch,
    });
  },
  delete(groupId) {
    return transport.request<unknown>({
      method: "DELETE",
      path: `/scim/v2/Groups/${encode(groupId)}`,
    });
  },
});

/** Bind a `ScimNamespace` to a constructed `Transport`. */
export const createScim = (transport: Transport): ScimNamespace => ({
  serviceProviderConfig() {
    return transport.request<ScimServiceProviderConfig>({
      method: "GET",
      path: "/scim/v2/ServiceProviderConfig",
    });
  },
  resourceTypes() {
    return transport.request<readonly ScimResourceType[]>({
      method: "GET",
      path: "/scim/v2/ResourceTypes",
    });
  },
  resourceType(resourceTypeId) {
    return transport.request<ScimResourceType>({
      method: "GET",
      path: `/scim/v2/ResourceTypes/${encode(resourceTypeId)}`,
    });
  },
  schemas() {
    return transport.request<readonly ScimSchema[]>({
      method: "GET",
      path: "/scim/v2/Schemas",
    });
  },
  schema(schemaId) {
    return transport.request<ScimSchema>({
      method: "GET",
      path: `/scim/v2/Schemas/${encode(schemaId)}`,
    });
  },
  users: createUsers(transport),
  groups: createGroups(transport),
});
