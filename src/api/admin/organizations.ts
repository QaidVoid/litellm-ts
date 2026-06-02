import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Role of a member within an organization. */
export type OrganizationMemberRole = "org_admin" | "org_user" | "internal_user";

/**
 * Member specification accepted when creating or updating an organization.
 * The proxy resolves `user_email` to a `user_id` and raises `ValueError` when
 * neither is provided; this union encodes the constraint at the type level.
 */
export type OrganizationMemberSpec =
  & { readonly role: OrganizationMemberRole }
  & (
    | { readonly user_id: string; readonly user_email?: string }
    | { readonly user_id?: string; readonly user_email: string }
  );

/** Request body for `/organization/new`. */
export interface CreateOrganizationRequest {
  /** Friendly alias shown in dashboards. */
  readonly organization_alias?: string;
  /** Explicit organization id. Defaults to a server-generated UUID. */
  readonly organization_id?: string;
  /** Model allowlist for the organization. */
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
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Initial member roster. */
  readonly members?: readonly OrganizationMemberSpec[];
}

/** A single organization record. */
export interface Organization {
  /** Server-assigned id. */
  readonly organization_id: string;
  /** Friendly alias. */
  readonly organization_alias?: string;
  /** Model allowlist. */
  readonly models?: readonly string[];
  /** Accumulated spend in USD. */
  readonly spend?: number;
  /** Hard spend ceiling in USD. */
  readonly max_budget?: number;
  /** Warning threshold below `max_budget`. */
  readonly soft_budget?: number;
  /** Rolling window duration. */
  readonly budget_duration?: string;
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Member roster. */
  readonly members?: readonly OrganizationMemberSpec[];
}

/** Request body for `/organization/update`. */
export interface UpdateOrganizationRequest
  extends Partial<Omit<CreateOrganizationRequest, "organization_id">> {
  /** Id of the organization to update. */
  readonly organization_id: string;
}

/** Request body for `/organization/delete`. */
export interface DeleteOrganizationsRequest {
  /** Organization ids to delete. */
  readonly organization_ids: readonly string[];
}

/** Request body for `/organization/member_add`. */
export interface AddOrganizationMemberRequest {
  /** Target organization. */
  readonly organization_id: string;
  /** Member to add. */
  readonly member: OrganizationMemberSpec;
}

/** Request body for `/organization/member_delete`. */
export interface DeleteOrganizationMemberRequest {
  /** Target organization. */
  readonly organization_id: string;
  /** User id to remove. */
  readonly user_id: string;
}

/** Request body for `/organization/member_update`. */
export interface UpdateOrganizationMemberRequest {
  /** Target organization. */
  readonly organization_id: string;
  /** User id whose membership changes. */
  readonly user_id: string;
  /** New role to assign. */
  readonly role?: OrganizationMemberRole;
}

/** Response from `/organization/list`. The proxy returns a flat array. */
export type ListOrganizationsResponse = readonly Organization[];

/** Query parameters for `GET /organization/daily/activity`. */
export interface OrganizationDailyActivityQuery {
  /** Comma-separated organization ids. */
  readonly organization_ids?: string;
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
  /** Organization ids to exclude from the aggregation. */
  readonly exclude_organization_ids?: string;
}

/** Surface for organization administration on the `Client`. */
/**
 * Response from `/organization/member_add`: the affected user and membership
 * rows, not a single member spec.
 */
export interface OrganizationMemberAddResponse {
  /** Organization the members were added to. */
  readonly organization_id: string;
  /** User rows created or updated by the add. */
  readonly updated_users: readonly Readonly<Record<string, unknown>>[];
  /** Organization-membership rows created or updated by the add. */
  readonly updated_organization_memberships: readonly Readonly<Record<string, unknown>>[];
}

/**
 * A single organization-membership row, returned by `/organization/member_delete`
 * and `/organization/member_update`. Note the role field is `user_role`, not
 * `role`.
 */
export interface OrganizationMembership {
  /** User identifier. */
  readonly user_id: string;
  /** Organization the membership belongs to. */
  readonly organization_id: string;
  /** Role within the organization (e.g. `"org_admin"`). */
  readonly user_role?: string;
  /** Accumulated spend in USD within the organization. */
  readonly spend?: number;
  /** Linked budget id, when one is attached. */
  readonly budget_id?: string;
  /** ISO-8601 creation timestamp. */
  readonly created_at: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at: string;
  /** User email, when known. */
  readonly user_email?: string;
  /** Embedded user record, when expanded. */
  readonly user?: Readonly<Record<string, unknown>>;
  /** Embedded budget record, when attached. */
  readonly litellm_budget_table?: Readonly<Record<string, unknown>>;
}

export interface OrganizationsNamespace {
  /** Create an organization. */
  create(req: CreateOrganizationRequest): Promise<Result<Organization, ApiError>>;
  /** Retrieve an organization by id. */
  info(organizationId: string): Promise<Result<Organization, ApiError>>;
  /** List organizations. */
  list(): Promise<Result<ListOrganizationsResponse, ApiError>>;
  /** Partially update an organization. */
  update(req: UpdateOrganizationRequest): Promise<Result<Organization, ApiError>>;
  /** Soft-delete one or more organizations. Returns the deleted rows. */
  delete(
    req: DeleteOrganizationsRequest,
  ): Promise<Result<readonly Organization[], ApiError>>;
  /** Add a member to an organization. Returns the affected user/membership rows. */
  addMember(
    req: AddOrganizationMemberRequest,
  ): Promise<Result<OrganizationMemberAddResponse, ApiError>>;
  /** Remove a member from an organization. Returns the deleted membership row. */
  deleteMember(
    req: DeleteOrganizationMemberRequest,
  ): Promise<Result<OrganizationMembership, ApiError>>;
  /** Update a member's role. Returns the updated membership row. */
  updateMember(
    req: UpdateOrganizationMemberRequest,
  ): Promise<Result<OrganizationMembership, ApiError>>;
  /** Per-day spend / request counters for organizations. */
  dailyActivity(
    query?: OrganizationDailyActivityQuery,
  ): Promise<Result<unknown, ApiError>>;
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

/** Bind an `OrganizationsNamespace` to a constructed `Transport`. */
export const createOrganizations = (transport: Transport): OrganizationsNamespace => ({
  create(req) {
    return transport.request<Organization>({
      method: "POST",
      path: "/organization/new",
      body: req,
    });
  },
  info(organizationId) {
    return transport.request<Organization>({
      method: "GET",
      path: "/organization/info",
      query: { organization_id: organizationId },
    });
  },
  list() {
    return transport.request<ListOrganizationsResponse>({
      method: "GET",
      path: "/organization/list",
    });
  },
  update(req) {
    return transport.request<Organization>({
      method: "PATCH",
      path: "/organization/update",
      body: req,
    });
  },
  delete(req) {
    return transport.request<readonly Organization[]>({
      method: "DELETE",
      path: "/organization/delete",
      body: req,
    });
  },
  addMember(req) {
    return transport.request<OrganizationMemberAddResponse>({
      method: "POST",
      path: "/organization/member_add",
      body: req,
    });
  },
  deleteMember(req) {
    return transport.request<OrganizationMembership>({
      method: "DELETE",
      path: "/organization/member_delete",
      body: req,
    });
  },
  updateMember(req) {
    return transport.request<OrganizationMembership>({
      method: "PATCH",
      path: "/organization/member_update",
      body: req,
    });
  },
  dailyActivity(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/organization/daily/activity",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
});
