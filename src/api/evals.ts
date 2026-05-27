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
    /** Optional metadata filter applied to stored completions. */
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
  /** Data source the eval reads rows from. */
  readonly data_source_config: EvalDataSourceConfig;
  /** Ordered list of graders applied to each row. */
  readonly testing_criteria: readonly EvalGraderConfig[];
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Request body for `POST /v1/evals/{eval_id}` (update). */
export interface UpdateEvalRequest {
  /** Rename the evaluation. */
  readonly name?: string;
  /** Replace the metadata bag. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** A single evaluation record. */
export interface Eval {
  /** Server-assigned id. */
  readonly id: string;
  /** Discriminator, always `"eval"`. */
  readonly object: "eval";
  /** Unix epoch seconds when the eval was created. */
  readonly created_at: number;
  /** Unix epoch seconds when the eval was last updated. */
  readonly updated_at?: number;
  /** Human-readable label. */
  readonly name?: string;
  /** Stored data source configuration. */
  readonly data_source_config: Readonly<Record<string, unknown>>;
  /** Stored grader configurations. */
  readonly testing_criteria: readonly Readonly<Record<string, unknown>>[];
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Query parameters for `GET /v1/evals`. */
export interface ListEvalsQuery {
  /** Maximum records per page. */
  readonly limit?: number;
  /** Sort direction. */
  readonly order?: "asc" | "desc";
  /** Cursor: return records after this id. */
  readonly after?: string;
}

/** Response from `GET /v1/evals`. */
export interface ListEvalsResponse {
  /** Discriminator, always `"list"`. */
  readonly object: "list";
  /** Evaluations on the current page. */
  readonly data: readonly Eval[];
  /** Id of the first record on the page. */
  readonly first_id?: string;
  /** Id of the last record on the page. */
  readonly last_id?: string;
  /** True when more pages remain. */
  readonly has_more: boolean;
}

/** Response from `DELETE /v1/evals/{eval_id}`. */
export interface DeleteEvalResponse {
  /** Id of the deleted evaluation. */
  readonly eval_id: string;
  /** Discriminator, always `"eval.deleted"`. */
  readonly object: "eval.deleted";
  /** True when the delete succeeded. */
  readonly deleted: boolean;
}

/** Response from `POST /v1/evals/{eval_id}/cancel`. */
export interface CancelEvalResponse {
  /** Id of the cancelled evaluation. */
  readonly id: string;
  /** Discriminator, always `"eval"`. */
  readonly object: "eval";
  /** Resulting status, always `"cancelled"`. */
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
  /** Human-readable label for the run. */
  readonly name?: string;
  /** Source of inputs for this run. */
  readonly data_source: EvalRunDataSource;
  /** Model evaluated by this run, when applicable. */
  readonly model?: string;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Request body for `POST /v1/evals/{eval_id}/runs/{run_id}` (update). */
export interface UpdateEvalRunRequest {
  /** Rename the run. */
  readonly name?: string;
  /** Replace the metadata bag. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Per-criterion result counts on `Run.per_testing_criteria_results`. */
export interface PerTestingCriteriaResult {
  /** Identifier of the grader. */
  readonly testing_criteria: string;
  /** Number of rows that passed this grader. */
  readonly passed?: number;
  /** Number of rows that failed this grader. */
  readonly failed?: number;
}

/** A single evaluation run. */
export interface EvalRun {
  /** Server-assigned id. */
  readonly id: string;
  /** Discriminator, always `"eval.run"`. */
  readonly object: "eval.run";
  /** Unix epoch seconds when the run was created. */
  readonly created_at: number;
  /** Lifecycle status. */
  readonly status: "queued" | "running" | "completed" | "failed" | "cancelled";
  /** Stored data source configuration. */
  readonly data_source: Readonly<Record<string, unknown>>;
  /** Id of the parent evaluation. */
  readonly eval_id: string;
  /** Run name. */
  readonly name?: string;
  /** Unix epoch seconds when execution started. */
  readonly started_at?: number;
  /** Unix epoch seconds when execution completed. */
  readonly completed_at?: number;
  /** Model evaluated by this run, when applicable. */
  readonly model?: string;
  /** Aggregated per-model usage statistics. */
  readonly per_model_usage?: unknown;
  /** Per-grader pass/fail counts. */
  readonly per_testing_criteria_results?: readonly PerTestingCriteriaResult[];
  /** URL to the rendered report, when available. */
  readonly report_url?: string;
  /** Free-form aggregate counters keyed by name. */
  readonly result_counts?: Readonly<Record<string, number>>;
  /** True when this run is shared with OpenAI for evaluation review. */
  readonly shared_with_openai?: boolean;
  /** Free-form metadata. */
  readonly metadata?: Readonly<Record<string, unknown>>;
  /** Error details when the run failed. */
  readonly error?: Readonly<Record<string, unknown>>;
}

/** Query parameters for `GET /v1/evals/{eval_id}/runs`. */
export interface ListEvalRunsQuery {
  /** Maximum records per page. */
  readonly limit?: number;
  /** Sort direction. */
  readonly order?: "asc" | "desc";
  /** Cursor: return records after this id. */
  readonly after?: string;
  /** Filter by lifecycle status. */
  readonly status?: EvalRun["status"];
}

/** Response from `GET /v1/evals/{eval_id}/runs`. */
export interface ListEvalRunsResponse {
  /** Discriminator, always `"list"`. */
  readonly object: "list";
  /** Runs on the current page. */
  readonly data: readonly EvalRun[];
  /** Id of the first record on the page. */
  readonly first_id?: string;
  /** Id of the last record on the page. */
  readonly last_id?: string;
  /** True when more pages remain. */
  readonly has_more: boolean;
}

/** Response from `DELETE /v1/evals/{eval_id}/runs/{run_id}`. */
export interface DeleteEvalRunResponse {
  /** Id of the deleted run. */
  readonly run_id: string;
  /** Discriminator returned by the proxy. */
  readonly object?: "eval.run.deleted";
  /** True when the delete succeeded. */
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
  /** Run-management sub-namespace (CRUD + cancel under `/v1/evals/{id}/runs`). */
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
