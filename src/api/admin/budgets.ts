import type { ApiError } from "../../error.ts";
import { httpError } from "../../error.ts";
import type { Result } from "../../result.ts";
import { err, ok } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Per-model budget descriptor. */
export interface ModelBudget {
  /** Hard spend ceiling in USD. */
  readonly max_budget?: number;
  /** Rolling window duration (e.g. `"30d"`). */
  readonly budget_duration?: string;
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
}

/** Request body for `/budget/new`. */
export interface CreateBudgetRequest {
  /** Explicit budget id. Defaults to a server-generated UUID. */
  readonly budget_id?: string;
  /** Hard spend ceiling in USD. */
  readonly max_budget?: number;
  /** Warning threshold below `max_budget`. */
  readonly soft_budget?: number;
  /** Maximum parallel in-flight requests. */
  readonly max_parallel_requests?: number;
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Rolling window duration (e.g. `"30d"`). */
  readonly budget_duration?: string;
  /** Per-model budgets keyed by model name. */
  readonly model_max_budget?: Readonly<Record<string, ModelBudget>>;
  /** ISO-8601 timestamp at which the budget counters reset. */
  readonly budget_reset_at?: string;
}

/** A single budget record. */
export interface Budget {
  /** Server-assigned id. */
  readonly budget_id: string;
  /** Hard spend ceiling in USD. */
  readonly max_budget?: number;
  /** Warning threshold below `max_budget`. */
  readonly soft_budget?: number;
  /** Spend accumulated in the current window. */
  readonly spend?: number;
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Rolling window duration. */
  readonly budget_duration?: string;
  /** Per-model budgets keyed by model name. */
  readonly model_max_budget?: Readonly<Record<string, ModelBudget>>;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
}

/** Request body for `/budget/update`. */
export interface UpdateBudgetRequest extends Partial<Omit<CreateBudgetRequest, "budget_id">> {
  /** Id of the budget to update. */
  readonly budget_id: string;
}

/** Request body for `/budget/delete`. */
export interface DeleteBudgetRequest {
  /** Id of the budget to delete. */
  readonly id: string;
}

/** Response from `/budget/list`. The proxy returns a flat array. */
export type ListBudgetsResponse = readonly Budget[];

/** Request body for the batch form of `POST /budget/info`. */
export interface BudgetInfoBatchRequest {
  /** Budget ids to retrieve in a single round trip. */
  readonly budgets: readonly string[];
}

/** A single configurable field returned from `GET /budget/settings`. */
export interface BudgetSettingsField {
  /** Backend field name (e.g. `"max_budget"`). */
  readonly field_name: string;
  /** Field type tag (`"Integer"`, `"Float"`, `"String"`, `"Object"`). */
  readonly field_type: string;
  /** Free-form description of the field. */
  readonly field_description: string;
  /** Currently stored value for the queried budget. */
  readonly field_value: unknown;
  /** Whether the field has a persisted value. */
  readonly stored_in_db: boolean;
  /** Default value applied when unset. */
  readonly field_default_value?: unknown;
}

/** Response from `GET /budget/settings`. */
export type BudgetSettingsResponse = readonly BudgetSettingsField[];

/** Budget configuration and current spend for a single provider. */
export interface ProviderBudgetEntry {
  /** Budget limit in USD for the time period. */
  readonly budget_limit?: number | null;
  /** Time period for the budget (e.g. `"1d"`, `"30d"`, `"1mo"`). */
  readonly time_period?: string | null;
  /** Current spend for this provider in the period. */
  readonly spend?: number;
  /** ISO-8601 timestamp when the current budget period resets. */
  readonly budget_reset_at?: string | null;
}

/** Response from `GET /provider/budgets`: provider name -> budget config. */
export interface ProviderBudgetResponse {
  readonly providers: Readonly<Record<string, ProviderBudgetEntry>>;
}

/** Surface for budget administration on the `Client`. */
export interface BudgetsNamespace {
  /**
   * Read provider-level budget routing state (per-provider budget, current
   * spend, and reset timestamp).
   */
  providerBudgets(): Promise<Result<ProviderBudgetResponse, ApiError>>;
  /** Create a new budget. */
  create(req: CreateBudgetRequest): Promise<Result<Budget, ApiError>>;
  /** Retrieve a budget by id. */
  info(budgetId: string): Promise<Result<Budget, ApiError>>;
  /** List all budgets. */
  list(): Promise<Result<ListBudgetsResponse, ApiError>>;
  /**
   * Batch retrieve multiple budgets by id. Mirrors the proxy's
   * `POST /budget/info` endpoint, which accepts a list of ids in the body.
   */
  infoBatch(req: BudgetInfoBatchRequest): Promise<Result<readonly Budget[], ApiError>>;
  /** Read the schema and current values for a single budget. */
  settings(budgetId: string): Promise<Result<BudgetSettingsResponse, ApiError>>;
  /** Partially update a budget. */
  update(req: UpdateBudgetRequest): Promise<Result<Budget, ApiError>>;
  /** Delete a budget. Returns the deleted row. */
  delete(req: DeleteBudgetRequest): Promise<Result<Budget, ApiError>>;
}

/** Bind a `BudgetsNamespace` to a constructed `Transport`. */
export const createBudgets = (transport: Transport): BudgetsNamespace => ({
  providerBudgets() {
    return transport.request<ProviderBudgetResponse>({ method: "GET", path: "/provider/budgets" });
  },
  create(req) {
    return transport.request<Budget>({ method: "POST", path: "/budget/new", body: req });
  },
  async info(budgetId) {
    // The proxy exposes only `POST /budget/info` with a batched body.
    // Wrap it in a single-id batch call and surface the first match (or a
    // 404-shaped http error when the proxy returns an empty array).
    const result = await transport.request<readonly Budget[]>({
      method: "POST",
      path: "/budget/info",
      body: { budgets: [budgetId] } satisfies BudgetInfoBatchRequest,
    });
    if (!result.ok) return result;
    const first = result.value[0];
    if (first === undefined) {
      return err(
        httpError({ status: 404, statusText: "Not Found", body: { budget_id: budgetId } }),
      );
    }
    return ok(first);
  },
  list() {
    return transport.request<ListBudgetsResponse>({ method: "GET", path: "/budget/list" });
  },
  infoBatch(req) {
    return transport.request<readonly Budget[]>({
      method: "POST",
      path: "/budget/info",
      body: req,
    });
  },
  settings(budgetId) {
    return transport.request<BudgetSettingsResponse>({
      method: "GET",
      path: "/budget/settings",
      query: { budget_id: budgetId },
    });
  },
  update(req) {
    return transport.request<Budget>({ method: "POST", path: "/budget/update", body: req });
  },
  delete(req) {
    return transport.request<Budget>({
      method: "POST",
      path: "/budget/delete",
      body: req,
    });
  },
});
