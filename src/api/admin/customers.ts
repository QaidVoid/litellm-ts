import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Restrict a customer's traffic to models in this region. */
export type CustomerRegion = "eu" | "us";

/** Object-level permissions attached to a customer. */
export interface CustomerObjectPermission {
  /** MCP servers the customer may reach. */
  readonly mcp_servers?: readonly string[];
  /** MCP access groups that authorize this customer. */
  readonly mcp_access_groups?: readonly string[];
  /** Per-server tool allowlists, keyed by MCP server name. */
  readonly mcp_tool_permissions?: Readonly<Record<string, readonly string[]>>;
  /** Vector stores the customer may access. */
  readonly vector_stores?: readonly string[];
  /** Agents the customer may invoke. */
  readonly agents?: readonly string[];
  /** Agent access groups the customer is a member of. */
  readonly agent_access_groups?: readonly string[];
}

/** Request body for `/customer/new`. */
export interface CreateCustomerRequest {
  /** Unique end-user identifier. */
  readonly user_id: string;
  /** Friendly alias shown in dashboards. */
  readonly alias?: string;
  /** Pre-block the customer at creation time. */
  readonly blocked?: boolean;
  /** Either `max_budget` or `budget_id` may be set, not both. */
  readonly max_budget?: number;
  /** Attach an existing budget record by id. */
  readonly budget_id?: string;
  /** Warning threshold below `max_budget`. */
  readonly soft_budget?: number;
  /** Rolling window duration. */
  readonly budget_duration?: string;
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Maximum parallel in-flight requests. */
  readonly max_parallel_requests?: number;
  /** Per-model budget map keyed by model name. */
  readonly model_max_budget?: Readonly<Record<string, unknown>>;
  /** Region restriction for upstream model routing. */
  readonly allowed_model_region?: CustomerRegion;
  /** Default model used when the caller does not specify one. */
  readonly default_model?: string;
  /** Initial spend in USD. */
  readonly spend?: number;
  /** ISO-8601 timestamp when the budget counters reset. */
  readonly budget_reset_at?: string;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Object-level permission overrides. */
  readonly object_permission?: CustomerObjectPermission;
}

/** Request body for `/customer/update`. */
export interface UpdateCustomerRequest {
  /** End-user identifier to update. */
  readonly user_id: string;
  /** Replace the alias. */
  readonly alias?: string;
  /** Block or unblock the customer. */
  readonly blocked?: boolean;
  /** Replace the spend ceiling. */
  readonly max_budget?: number;
  /** Reattach to a different budget record. */
  readonly budget_id?: string;
  /** Replace the allowed region. */
  readonly allowed_model_region?: CustomerRegion;
  /** Replace the default model. */
  readonly default_model?: string;
  /** Replace the object-level permissions. */
  readonly object_permission?: CustomerObjectPermission;
}

/** Request body for `/customer/delete`. */
export interface DeleteCustomersRequest {
  /** End-user identifiers to delete. */
  readonly user_ids: readonly string[];
}

/** Request body for `/customer/block` and `/customer/unblock`. */
export interface BlockCustomersRequest {
  /** End-user identifiers to block or unblock. */
  readonly user_ids: readonly string[];
}

/** A single customer (end user) record. */
export interface Customer {
  /** End-user identifier. */
  readonly user_id: string;
  /** True when the customer is currently blocked. */
  readonly blocked: boolean;
  /** Friendly alias. */
  readonly alias?: string;
  /** Lifetime spend in USD. */
  readonly spend?: number;
  /** Region restriction for upstream model routing. */
  readonly allowed_model_region?: CustomerRegion;
  /** Default model used when the caller does not specify one. */
  readonly default_model?: string;
  /** Id of the attached budget record. */
  readonly budget_id?: string;
  /** Id of the attached object-permission record. */
  readonly object_permission_id?: string;
  /** Stored object-level permission overrides. */
  readonly object_permission?: CustomerObjectPermission;
  /** Stored budget rollup row from the proxy database. */
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
