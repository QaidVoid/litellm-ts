import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Data source describing the dataset rows an eval will run over. */
export type EvalDataSourceConfig =
  | {
    readonly type: "custom";
    /** JSON Schema describing each row in the dataset. */
    readonly item_schema: Readonly<Record<string, unknown>>;
    /** Whether the eval expects sample-schema population. */
    readonly include_sample_schema?: boolean;
  }
  | {
    readonly type: "logs";
    /** Optional metadata filter applied to log rows. */
    readonly metadata?: Readonly<Record<string, unknown>>;
  }
  | {
    readonly type: "stored_completions";
    readonly metadata?: Readonly<Record<string, unknown>>;
  };

/** A single grader configuration inside `Eval.testing_criteria`. */
export interface EvalGraderConfig {
  /** Grader discriminator, e.g. `"llm_as_judge"`, `"string_check"`. */
  readonly type: string;
  /** Optional model the grader uses (LLM-as-judge graders). */
  readonly model?: string;
  /** Custom prompt for the grader. */
  readonly prompt?: string;
  /** Provider-specific extras. */
  readonly [key: string]: unknown;
}

/** Request body for `POST /v1/evals`. */
export interface CreateEvalRequest {
  /** Human-readable label. */
  readonly name?: string;
  readonly data_source_config: EvalDataSourceConfig;
  /** Ordered list of graders applied to each row. */
  readonly testing_criteria: readonly EvalGraderConfig[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Request body for `POST /v1/evals/{eval_id}` (update). */
export interface UpdateEvalRequest {
  readonly name?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** A single evaluation record. */
export interface Eval {
  readonly id: string;
  readonly object: "eval";
  readonly created_at: number;
  readonly updated_at?: number;
  readonly name?: string;
  readonly data_source_config: Readonly<Record<string, unknown>>;
  readonly testing_criteria: readonly Readonly<Record<string, unknown>>[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Query parameters for `GET /v1/evals`. */
export interface ListEvalsQuery {
  readonly limit?: number;
  readonly order?: "asc" | "desc";
  readonly after?: string;
}

/** Response from `GET /v1/evals`. */
export interface ListEvalsResponse {
  readonly object: "list";
  readonly data: readonly Eval[];
  readonly first_id?: string;
  readonly last_id?: string;
  readonly has_more: boolean;
}

/** Response from `DELETE /v1/evals/{eval_id}`. */
export interface DeleteEvalResponse {
  readonly eval_id: string;
  readonly object: "eval.deleted";
  readonly deleted: boolean;
}

/** Response from `POST /v1/evals/{eval_id}/cancel`. */
export interface CancelEvalResponse {
  readonly id: string;
  readonly object: "eval";
  readonly status: "cancelled";
}

/** Data source the run reads inputs from. */
export type EvalRunDataSource =
  | { readonly type: "dataset"; readonly dataset_id: string }
  | { readonly type: "sample_set"; readonly sample_set_id: string }
  | { readonly type: "completions"; readonly model?: string; readonly [k: string]: unknown }
  | { readonly type: string; readonly [k: string]: unknown };

/** Request body for `POST /v1/evals/{eval_id}/runs`. */
export interface CreateEvalRunRequest {
  readonly name?: string;
  readonly data_source: EvalRunDataSource;
  readonly model?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Request body for `POST /v1/evals/{eval_id}/runs/{run_id}` (update). */
export interface UpdateEvalRunRequest {
  readonly name?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Per-criterion result counts on `Run.per_testing_criteria_results`. */
export interface PerTestingCriteriaResult {
  readonly testing_criteria: string;
  readonly passed?: number;
  readonly failed?: number;
}

/** A single evaluation run. */
export interface EvalRun {
  readonly id: string;
  readonly object: "eval.run";
  readonly created_at: number;
  readonly status: "queued" | "running" | "completed" | "failed" | "cancelled";
  readonly data_source: Readonly<Record<string, unknown>>;
  readonly eval_id: string;
  readonly name?: string;
  readonly started_at?: number;
  readonly completed_at?: number;
  readonly model?: string;
  readonly per_model_usage?: unknown;
  readonly per_testing_criteria_results?: readonly PerTestingCriteriaResult[];
  readonly report_url?: string;
  readonly result_counts?: Readonly<Record<string, number>>;
  readonly shared_with_openai?: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly error?: Readonly<Record<string, unknown>>;
}

/** Query parameters for `GET /v1/evals/{eval_id}/runs`. */
export interface ListEvalRunsQuery {
  readonly limit?: number;
  readonly order?: "asc" | "desc";
  readonly after?: string;
  readonly status?: EvalRun["status"];
}

/** Response from `GET /v1/evals/{eval_id}/runs`. */
export interface ListEvalRunsResponse {
  readonly object: "list";
  readonly data: readonly EvalRun[];
  readonly first_id?: string;
  readonly last_id?: string;
  readonly has_more: boolean;
}

/** Response from `POST /v1/evals/{eval_id}/runs/{run_id}/cancel` (via POST update). */
export interface CancelEvalRunResponse {
  readonly id: string;
  readonly object: "eval.run";
  readonly status: "cancelled";
}

/** Response from `DELETE /v1/evals/{eval_id}/runs/{run_id}`. */
export interface DeleteEvalRunResponse {
  readonly run_id: string;
  readonly object?: "eval.run.deleted";
  readonly deleted?: boolean;
}

/** Run-management sub-namespace under `client.evals.runs`. */
export interface EvalRunsNamespace {
  /** Create a new run against an eval. */
  create(evalId: string, req: CreateEvalRunRequest): Promise<Result<EvalRun, ApiError>>;
  /** List runs for an eval. */
  list(
    evalId: string,
    query?: ListEvalRunsQuery,
  ): Promise<Result<ListEvalRunsResponse, ApiError>>;
  /** Retrieve a run by id. */
  retrieve(evalId: string, runId: string): Promise<Result<EvalRun, ApiError>>;
  /** Update mutable fields on a run. */
  update(
    evalId: string,
    runId: string,
    req: UpdateEvalRunRequest,
  ): Promise<Result<EvalRun, ApiError>>;
  /** Cancel a running run. */
  cancel(evalId: string, runId: string): Promise<Result<CancelEvalRunResponse, ApiError>>;
  /** Delete a run by id. */
  delete(evalId: string, runId: string): Promise<Result<DeleteEvalRunResponse, ApiError>>;
}

/** Surface for the OpenAI Evals API on the `Client`. */
export interface EvalsNamespace {
  /** Create a new evaluation. */
  create(req: CreateEvalRequest): Promise<Result<Eval, ApiError>>;
  /** List evaluations. */
  list(query?: ListEvalsQuery): Promise<Result<ListEvalsResponse, ApiError>>;
  /** Retrieve an evaluation by id. */
  retrieve(evalId: string): Promise<Result<Eval, ApiError>>;
  /** Update mutable fields on an evaluation. */
  update(evalId: string, req: UpdateEvalRequest): Promise<Result<Eval, ApiError>>;
  /** Cancel an in-progress evaluation. */
  cancel(evalId: string): Promise<Result<CancelEvalResponse, ApiError>>;
  /** Delete an evaluation by id. */
  delete(evalId: string): Promise<Result<DeleteEvalResponse, ApiError>>;
  readonly runs: EvalRunsNamespace;
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

const createRuns = (transport: Transport): EvalRunsNamespace => ({
  create(evalId, req) {
    return transport.request<EvalRun>({
      method: "POST",
      path: `/v1/evals/${encode(evalId)}/runs`,
      body: req,
    });
  },
  list(evalId, query) {
    return transport.request<ListEvalRunsResponse>({
      method: "GET",
      path: `/v1/evals/${encode(evalId)}/runs`,
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  retrieve(evalId, runId) {
    return transport.request<EvalRun>({
      method: "GET",
      path: `/v1/evals/${encode(evalId)}/runs/${encode(runId)}`,
    });
  },
  update(evalId, runId, req) {
    return transport.request<EvalRun>({
      method: "POST",
      path: `/v1/evals/${encode(evalId)}/runs/${encode(runId)}`,
      body: req,
    });
  },
  cancel(evalId, runId) {
    return transport.request<CancelEvalRunResponse>({
      method: "POST",
      path: `/v1/evals/${encode(evalId)}/runs/${encode(runId)}/cancel`,
    });
  },
  delete(evalId, runId) {
    return transport.request<DeleteEvalRunResponse>({
      method: "DELETE",
      path: `/v1/evals/${encode(evalId)}/runs/${encode(runId)}`,
    });
  },
});

/** Bind an `EvalsNamespace` to a constructed `Transport`. */
export const createEvals = (transport: Transport): EvalsNamespace => ({
  create(req) {
    return transport.request<Eval>({ method: "POST", path: "/v1/evals", body: req });
  },
  list(query) {
    return transport.request<ListEvalsResponse>({
      method: "GET",
      path: "/v1/evals",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  retrieve(evalId) {
    return transport.request<Eval>({
      method: "GET",
      path: `/v1/evals/${encode(evalId)}`,
    });
  },
  update(evalId, req) {
    return transport.request<Eval>({
      method: "POST",
      path: `/v1/evals/${encode(evalId)}`,
      body: req,
    });
  },
  cancel(evalId) {
    return transport.request<CancelEvalResponse>({
      method: "POST",
      path: `/v1/evals/${encode(evalId)}/cancel`,
    });
  },
  delete(evalId) {
    return transport.request<DeleteEvalResponse>({
      method: "DELETE",
      path: `/v1/evals/${encode(evalId)}`,
    });
  },
  runs: createRuns(transport),
});
