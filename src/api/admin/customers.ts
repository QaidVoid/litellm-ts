import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Restrict a customer's traffic to models in this region. */
export type CustomerRegion = "eu" | "us";

/** Object-level permissions attached to a customer. */
export interface CustomerObjectPermission {
  readonly mcp_servers?: readonly string[];
  readonly mcp_access_groups?: readonly string[];
  readonly mcp_tool_permissions?: Readonly<Record<string, readonly string[]>>;
  readonly vector_stores?: readonly string[];
  readonly agents?: readonly string[];
  readonly agent_access_groups?: readonly string[];
}

/** Request body for `/customer/new`. */
export interface CreateCustomerRequest {
  readonly user_id: string;
  readonly alias?: string;
  readonly blocked?: boolean;
  /** Either `max_budget` or `budget_id` may be set, not both. */
  readonly max_budget?: number;
  readonly budget_id?: string;
  readonly soft_budget?: number;
  readonly budget_duration?: string;
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
  readonly max_parallel_requests?: number;
  readonly model_max_budget?: Readonly<Record<string, unknown>>;
  readonly allowed_model_region?: CustomerRegion;
  readonly default_model?: string;
  readonly spend?: number;
  readonly budget_reset_at?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly object_permission?: CustomerObjectPermission;
}

/** Request body for `/customer/update`. */
export interface UpdateCustomerRequest {
  readonly user_id: string;
  readonly alias?: string;
  readonly blocked?: boolean;
  readonly max_budget?: number;
  readonly budget_id?: string;
  readonly allowed_model_region?: CustomerRegion;
  readonly default_model?: string;
  readonly object_permission?: CustomerObjectPermission;
}

/** Request body for `/customer/delete`. */
export interface DeleteCustomersRequest {
  readonly user_ids: readonly string[];
}

/** Request body for `/customer/block` and `/customer/unblock`. */
export interface BlockCustomersRequest {
  readonly user_ids: readonly string[];
}

/** A single customer (end user) record. */
export interface Customer {
  readonly user_id: string;
  readonly blocked: boolean;
  readonly alias?: string;
  readonly spend?: number;
  readonly allowed_model_region?: CustomerRegion;
  readonly default_model?: string;
  readonly budget_id?: string;
  readonly object_permission_id?: string;
  readonly object_permission?: CustomerObjectPermission;
  readonly litellm_budget_table?: Readonly<Record<string, unknown>>;
}

/** Surface for customer (end-user) administration on the `Client`. */
export interface CustomersNamespace {
  /** Create a new customer. */
  create(req: CreateCustomerRequest): Promise<Result<Customer, ApiError>>;
  /** Retrieve a customer by `end_user_id`. */
  info(endUserId: string): Promise<Result<Customer, ApiError>>;
  /** List all customers. */
  list(): Promise<Result<readonly Customer[], ApiError>>;
  /** Partially update a customer. */
  update(req: UpdateCustomerRequest): Promise<Result<Customer, ApiError>>;
  /** Delete one or more customers. */
  delete(req: DeleteCustomersRequest): Promise<Result<{ readonly status: "success" }, ApiError>>;
  /** Block the given customers from making requests. */
  block(req: BlockCustomersRequest): Promise<Result<readonly Customer[], ApiError>>;
  /** Lift a previous block. */
  unblock(req: BlockCustomersRequest): Promise<Result<readonly Customer[], ApiError>>;
}

/** Bind a `CustomersNamespace` to a constructed `Transport`. */
export const createCustomers = (transport: Transport): CustomersNamespace => ({
  create(req) {
    return transport.request<Customer>({ method: "POST", path: "/customer/new", body: req });
  },
  info(endUserId) {
    return transport.request<Customer>({
      method: "GET",
      path: "/customer/info",
      query: { end_user_id: endUserId },
    });
  },
  list() {
    return transport.request<readonly Customer[]>({ method: "GET", path: "/customer/list" });
  },
  update(req) {
    return transport.request<Customer>({ method: "POST", path: "/customer/update", body: req });
  },
  delete(req) {
    return transport.request<{ readonly status: "success" }>({
      method: "POST",
      path: "/customer/delete",
      body: req,
    });
  },
  block(req) {
    return transport.request<readonly Customer[]>({
      method: "POST",
      path: "/customer/block",
      body: req,
    });
  },
  unblock(req) {
    return transport.request<readonly Customer[]>({
      method: "POST",
      path: "/customer/unblock",
      body: req,
    });
  },
});
