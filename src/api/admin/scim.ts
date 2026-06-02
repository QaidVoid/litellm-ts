import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Common fields on a SCIM resource (RFC 7643). */
export interface ScimResource {
  /** SCIM schemas the resource conforms to. */
  readonly schemas: readonly string[];
  /** Server-assigned SCIM id. */
  readonly id?: string;
  /** External identifier supplied by the identity provider. */
  readonly externalId?: string;
  /** Standard SCIM metadata block. */
  readonly meta?: Readonly<Record<string, unknown>>;
}

/** Multi-part name component on `ScimUser.name`. */
export interface ScimUserName {
  /** Family (last) name. */
  readonly familyName?: string;
  /** Given (first) name. */
  readonly givenName?: string;
  /** Formatted full name. */
  readonly formatted?: string;
  /** Middle name. */
  readonly middleName?: string;
  /** Honorific prefix (e.g. `"Dr."`). */
  readonly honorificPrefix?: string;
  /** Honorific suffix (e.g. `"PhD"`). */
  readonly honorificSuffix?: string;
}

/** Email entry on a `ScimUser`. */
export interface ScimUserEmail {
  /** Email address. */
  readonly value: string;
  /** Address category (e.g. `"work"`). */
  readonly type?: string;
  /** True for the user's primary email. */
  readonly primary?: boolean;
}

/** Group reference on a `ScimUser`. */
export interface ScimUserGroup {
  /** SCIM id of the group. */
  readonly value: string;
  /** Display label for the group. */
  readonly display?: string;
  /** Membership type. */
  readonly type?: "direct" | "indirect";
}

/** A SCIM user resource. */
export interface ScimUser extends ScimResource {
  /** Login username. */
  readonly userName?: string;
  /** Structured name. */
  readonly name?: ScimUserName;
  /** Display name. */
  readonly displayName?: string;
  /** Whether the account is active. */
  readonly active?: boolean;
  /** User email addresses. */
  readonly emails?: readonly ScimUserEmail[];
  /** Groups the user belongs to. */
  readonly groups?: readonly ScimUserGroup[];
}

/** Group member on a `ScimGroup`. */
export interface ScimMember {
  /** SCIM id of the member. */
  readonly value: string;
  /** Display label for the member. */
  readonly display?: string;
}

/** A SCIM group resource. */
export interface ScimGroup extends ScimResource {
  /** Group display name. */
  readonly displayName: string;
  /** Group members. */
  readonly members?: readonly ScimMember[];
}

/** Generic SCIM list response wrapping a `Resources` array. */
export interface ScimListResponse<T> {
  /** SCIM schemas applied to the list response. */
  readonly schemas: readonly string[];
  /** Total matching resources. */
  readonly totalResults: number;
  /** 1-based start index of this page. */
  readonly startIndex?: number;
  /** Number of items on this page. */
  readonly itemsPerPage?: number;
  /** Resources on the current page. */
  readonly Resources: readonly T[];
}

/** A single PATCH operation in `ScimPatchOp.Operations`. */
export interface ScimPatchOperation {
  /** Operation kind. */
  readonly op: "add" | "remove" | "replace";
  /** SCIM attribute path the operation targets. */
  readonly path?: string;
  /** Value applied by the operation. */
  readonly value?: unknown;
}

/** Request body for SCIM PATCH endpoints. */
export interface ScimPatchOp {
  /** SCIM schemas applied to the PATCH request. */
  readonly schemas?: readonly string[];
  /** Ordered operations to apply. */
  readonly Operations: readonly ScimPatchOperation[];
}

/** Service-provider feature flag block in `ScimServiceProviderConfig`. */
export interface ScimFeature {
  /** Whether the feature is supported. */
  readonly supported: boolean;
  /** Maximum operations per bulk request. */
  readonly maxOperations?: number;
  /** Maximum payload size in bytes. */
  readonly maxPayloadSize?: number;
  /** Maximum results per filter call. */
  readonly maxResults?: number;
}

/** Response from `GET /scim/v2/ServiceProviderConfig`. */
export interface ScimServiceProviderConfig {
  /** SCIM schemas applied to the config. */
  readonly schemas: readonly string[];
  /** PATCH feature block. */
  readonly patch?: ScimFeature;
  /** Bulk feature block. */
  readonly bulk?: ScimFeature;
  /** Filter feature block. */
  readonly filter?: ScimFeature;
  /** Change-password feature block. */
  readonly changePassword?: ScimFeature;
  /** Sort feature block. */
  readonly sort?: ScimFeature;
  /** ETag feature block. */
  readonly etag?: ScimFeature;
  /** Advertised authentication schemes. */
  readonly authenticationSchemes?: readonly Readonly<Record<string, unknown>>[];
  /** Standard SCIM metadata block. */
  readonly meta?: Readonly<Record<string, unknown>>;
}

/** Resource-type metadata in `GET /scim/v2/ResourceTypes`. */
export interface ScimResourceType {
  /** SCIM schemas the descriptor conforms to. */
  readonly schemas: readonly string[];
  /** Resource type id. */
  readonly id: string;
  /** Resource type name. */
  readonly name: string;
  /** Human-readable description. */
  readonly description?: string;
  /** Resource endpoint path. */
  readonly endpoint: string;
  /** Base schema id. */
  readonly schema: string;
  /** Optional schema extensions. */
  readonly schemaExtensions?: readonly Readonly<Record<string, unknown>>[];
  /** Standard SCIM metadata block. */
  readonly meta?: Readonly<Record<string, unknown>>;
}

/** Attribute descriptor on a `ScimSchema`. */
export interface ScimSchemaAttribute {
  /** Attribute name. */
  readonly name: string;
  /** SCIM-defined type. */
  readonly type: string;
  /** True for multi-valued attributes. */
  readonly multiValued: boolean;
  /** Human-readable description. */
  readonly description?: string;
  /** Whether the attribute is required. */
  readonly required: boolean;
  /** Mutability rule (`"readOnly"`, `"readWrite"`, etc.). */
  readonly mutability: string;
  /** When the attribute is returned. */
  readonly returned: string;
  /** Uniqueness constraint. */
  readonly uniqueness: string;
  /** Nested attributes for complex types. */
  readonly subAttributes?: readonly ScimSchemaAttribute[];
}

/** A SCIM schema definition (RFC 7643 Section 7). */
export interface ScimSchema {
  /** SCIM schemas the schema descriptor conforms to. */
  readonly schemas: readonly string[];
  /** Schema id (URN). */
  readonly id: string;
  /** Schema name. */
  readonly name: string;
  /** Human-readable description. */
  readonly description?: string;
  /** Declared attributes. */
  readonly attributes: readonly ScimSchemaAttribute[];
  /** Standard SCIM metadata block. */
  readonly meta?: Readonly<Record<string, unknown>>;
}

/** Query parameters supported by `GET /scim/v2/{Users,Groups}`. */
export interface ScimListQuery {
  /** 1-based start index. */
  readonly startIndex?: number;
  /** Page size. */
  readonly count?: number;
  /** SCIM filter expression. The proxy supports a limited subset Okta emits. */
  readonly filter?: string;
}

/** Sub-namespace for `/scim/v2/Users`. */
export interface ScimUsersNamespace {
  /** Page through users, optionally filtered by a SCIM filter expression. */
  list(query?: ScimListQuery): Promise<Result<ScimListResponse<ScimUser>, ApiError>>;
  /** Retrieve a single user by SCIM id. */
  get(userId: string): Promise<Result<ScimUser, ApiError>>;
  /** Provision a new user from an identity provider. */
  create(user: ScimUser): Promise<Result<ScimUser, ApiError>>;
  /** Full-replace a user (PUT semantics). */
  update(userId: string, user: ScimUser): Promise<Result<ScimUser, ApiError>>;
  /** Apply a SCIM PATCH-Operations document to a user. */
  patch(userId: string, patch: ScimPatchOp): Promise<Result<ScimUser, ApiError>>;
  /** Deprovision (delete) a user. */
  delete(userId: string): Promise<Result<unknown, ApiError>>;
}

/** Sub-namespace for `/scim/v2/Groups`. */
export interface ScimGroupsNamespace {
  /** Page through groups, optionally filtered by a SCIM filter expression. */
  list(query?: ScimListQuery): Promise<Result<ScimListResponse<ScimGroup>, ApiError>>;
  /** Retrieve a single group by SCIM id. */
  get(groupId: string): Promise<Result<ScimGroup, ApiError>>;
  /** Provision a new group from an identity provider. */
  create(group: ScimGroup): Promise<Result<ScimGroup, ApiError>>;
  /** Full-replace a group (PUT semantics). */
  update(groupId: string, group: ScimGroup): Promise<Result<ScimGroup, ApiError>>;
  /** Apply a SCIM PATCH-Operations document to a group. */
  patch(groupId: string, patch: ScimPatchOp): Promise<Result<ScimGroup, ApiError>>;
  /** Deprovision (delete) a group. */
  delete(groupId: string): Promise<Result<unknown, ApiError>>;
}

/** Surface for SCIM v2 administration on the `Client` (enterprise only). */
export interface ScimNamespace {
  /** Service provider configuration discovery. */
  serviceProviderConfig(): Promise<Result<ScimServiceProviderConfig, ApiError>>;
  /** List supported resource types. */
  resourceTypes(): Promise<Result<ScimListResponse<ScimResourceType>, ApiError>>;
  /** Get a specific resource type by id. */
  resourceType(resourceTypeId: string): Promise<Result<ScimResourceType, ApiError>>;
  /** List supported schemas. */
  schemas(): Promise<Result<ScimListResponse<ScimSchema>, ApiError>>;
  /** Get a specific schema by id. */
  schema(schemaId: string): Promise<Result<ScimSchema, ApiError>>;
  /** Per-user provisioning sub-namespace. */
  readonly users: ScimUsersNamespace;
  /** Per-group provisioning sub-namespace. */
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
    return transport.request<ScimListResponse<ScimResourceType>>({
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
    return transport.request<ScimListResponse<ScimSchema>>({
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
