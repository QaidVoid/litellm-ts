import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Role of a member within an organization. */
export type OrganizationMemberRole = "org_admin" | "org_user" | "internal_user";

/** Member specification accepted when creating or updating an organization. */
export interface OrganizationMemberSpec {
  readonly user_id?: string;
  readonly user_email?: string;
  readonly role: OrganizationMemberRole;
}

/** Request body for `/organization/new`. */
export interface CreateOrganizationRequest {
  readonly organization_alias?: string;
  readonly organization_id?: string;
  readonly models?: readonly string[];
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
  readonly max_budget?: number;
  readonly soft_budget?: number;
  readonly budget_duration?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly members?: readonly OrganizationMemberSpec[];
}

/** A single organization record. */
export interface Organization {
  readonly organization_id: string;
  readonly organization_alias?: string;
  readonly models?: readonly string[];
  readonly spend?: number;
  readonly max_budget?: number;
  readonly soft_budget?: number;
  readonly budget_duration?: string;
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
  readonly created_at?: string;
  readonly updated_at?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly members?: readonly OrganizationMemberSpec[];
}

/** Request body for `/organization/update`. */
export interface UpdateOrganizationRequest
  extends Partial<Omit<CreateOrganizationRequest, "organization_id">> {
  readonly organization_id: string;
}

/** Request body for `/organization/delete`. */
export interface DeleteOrganizationsRequest {
  readonly organization_ids: readonly string[];
}

/** Request body for `/organization/member_add`. */
export interface AddOrganizationMemberRequest {
  readonly organization_id: string;
  readonly member: OrganizationMemberSpec;
}

/** Request body for `/organization/member_delete`. */
export interface DeleteOrganizationMemberRequest {
  readonly organization_id: string;
  readonly user_id: string;
}

/** Request body for `/organization/member_update`. */
export interface UpdateOrganizationMemberRequest {
  readonly organization_id: string;
  readonly user_id: string;
  readonly role?: OrganizationMemberRole;
}

/** Response from `/organization/list`. */
export interface ListOrganizationsResponse {
  readonly organizations: readonly Organization[];
  readonly total_count?: number;
}

/** Surface for organization administration on the `Client`. */
export interface OrganizationsNamespace {
  /** Create an organization. */
  create(req: CreateOrganizationRequest): Promise<Result<Organization, ApiError>>;
  /** Retrieve an organization by id. */
  info(organizationId: string): Promise<Result<Organization, ApiError>>;
  /** List organizations. */
  list(): Promise<Result<ListOrganizationsResponse, ApiError>>;
  /** Partially update an organization. */
  update(req: UpdateOrganizationRequest): Promise<Result<Organization, ApiError>>;
  /** Soft-delete one or more organizations. */
  delete(
    req: DeleteOrganizationsRequest,
  ): Promise<Result<{ readonly status: "success" }, ApiError>>;
  /** Add a member to an organization. */
  addMember(req: AddOrganizationMemberRequest): Promise<Result<OrganizationMemberSpec, ApiError>>;
  /** Remove a member from an organization. */
  deleteMember(
    req: DeleteOrganizationMemberRequest,
  ): Promise<Result<{ readonly status: "success" }, ApiError>>;
  /** Update a member's role. */
  updateMember(
    req: UpdateOrganizationMemberRequest,
  ): Promise<Result<OrganizationMemberSpec, ApiError>>;
}

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
      method: "POST",
      path: "/organization/update",
      body: req,
    });
  },
  delete(req) {
    return transport.request<{ readonly status: "success" }>({
      method: "POST",
      path: "/organization/delete",
      body: req,
    });
  },
  addMember(req) {
    return transport.request<OrganizationMemberSpec>({
      method: "POST",
      path: "/organization/member_add",
      body: req,
    });
  },
  deleteMember(req) {
    return transport.request<{ readonly status: "success" }>({
      method: "POST",
      path: "/organization/member_delete",
      body: req,
    });
  },
  updateMember(req) {
    return transport.request<OrganizationMemberSpec>({
      method: "POST",
      path: "/organization/member_update",
      body: req,
    });
  },
});
