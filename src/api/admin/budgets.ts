import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Per-model budget descriptor. */
export interface ModelBudget {
  readonly max_budget?: number;
  readonly budget_duration?: string;
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
}

/** Request body for `/budget/new`. */
export interface CreateBudgetRequest {
  /** Explicit budget id. Defaults to a server-generated UUID. */
  readonly budget_id?: string;
  readonly max_budget?: number;
  readonly soft_budget?: number;
  readonly max_parallel_requests?: number;
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
  readonly budget_duration?: string;
  /** Per-model budgets keyed by model name. */
  readonly model_max_budget?: Readonly<Record<string, ModelBudget>>;
  readonly budget_reset_at?: string;
}

/** A single budget record. */
export interface Budget {
  readonly budget_id: string;
  readonly max_budget?: number;
  readonly soft_budget?: number;
  readonly spend?: number;
  readonly tpm_limit?: number;
  readonly rpm_limit?: number;
  readonly budget_duration?: string;
  readonly model_max_budget?: Readonly<Record<string, ModelBudget>>;
  readonly created_at?: string;
  readonly updated_at?: string;
}

/** Request body for `/budget/update`. */
export interface UpdateBudgetRequest extends Partial<Omit<CreateBudgetRequest, "budget_id">> {
  readonly budget_id: string;
}

/** Request body for `/budget/delete`. */
export interface DeleteBudgetRequest {
  readonly id: string;
}

/** Response from `/budget/list`. */
export interface ListBudgetsResponse {
  readonly budgets: readonly Budget[];
  readonly total_count?: number;
}

/** Surface for budget administration on the `Client`. */
export interface BudgetsNamespace {
  /** Create a new budget. */
  create(req: CreateBudgetRequest): Promise<Result<Budget, ApiError>>;
  /** Retrieve a budget by id. */
  info(budgetId: string): Promise<Result<Budget, ApiError>>;
  /** List all budgets. */
  list(): Promise<Result<ListBudgetsResponse, ApiError>>;
  /** Partially update a budget. */
  update(req: UpdateBudgetRequest): Promise<Result<Budget, ApiError>>;
  /** Delete a budget. */
  delete(req: DeleteBudgetRequest): Promise<Result<{ readonly status: "success" }, ApiError>>;
}

/** Bind a `BudgetsNamespace` to a constructed `Transport`. */
export const createBudgets = (transport: Transport): BudgetsNamespace => ({
  create(req) {
    return transport.request<Budget>({ method: "POST", path: "/budget/new", body: req });
  },
  info(budgetId) {
    return transport.request<Budget>({
      method: "GET",
      path: "/budget/info",
      query: { budget_id: budgetId },
    });
  },
  list() {
    return transport.request<ListBudgetsResponse>({ method: "GET", path: "/budget/list" });
  },
  update(req) {
    return transport.request<Budget>({ method: "POST", path: "/budget/update", body: req });
  },
  delete(req) {
    return transport.request<{ readonly status: "success" }>({
      method: "POST",
      path: "/budget/delete",
      body: req,
    });
  },
});
