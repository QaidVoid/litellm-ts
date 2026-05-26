import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Lifecycle states of a fine-tuning job. */
export type FineTuningJobStatus =
  | "validating_files"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

/** Hyperparameters for a fine-tune. `"auto"` lets the provider pick. */
export interface FineTuningHyperparameters {
  readonly batch_size?: number | "auto";
  readonly learning_rate_multiplier?: number | "auto";
  readonly n_epochs?: number | "auto";
}

/** Optional weights & biases integration on the job. */
export interface FineTuningIntegration {
  readonly type: "wandb";
  readonly wandb: {
    readonly project: string;
    readonly name?: string;
    readonly entity?: string;
    readonly tags?: readonly string[];
  };
}

/** Request body for `POST /v1/fine_tuning/jobs`. */
export interface FineTuningCreateRequest {
  /** Base model to fine-tune. */
  readonly model: string;
  /** Id of a previously uploaded JSONL training file (`purpose: "fine-tune"`). */
  readonly training_file: string;
  /** Optional validation file id. */
  readonly validation_file?: string;
  readonly hyperparameters?: FineTuningHyperparameters;
  /** Suffix appended to the resulting model name. */
  readonly suffix?: string;
  readonly integrations?: readonly FineTuningIntegration[];
  readonly seed?: number;
}

/** Per-fine-tune error payload. */
export interface FineTuningError {
  readonly code: string;
  readonly message: string;
  readonly param?: string | null;
}

/** A single fine-tuning job record. */
export interface FineTuningJob {
  readonly id: string;
  readonly object: "fine_tuning.job";
  readonly created_at: number;
  readonly finished_at?: number | null;
  readonly model: string;
  readonly fine_tuned_model?: string | null;
  readonly organization_id?: string;
  readonly result_files?: readonly string[];
  readonly status: FineTuningJobStatus;
  readonly validation_file?: string | null;
  readonly training_file: string;
  readonly hyperparameters?: FineTuningHyperparameters;
  readonly trained_tokens?: number | null;
  readonly error?: FineTuningError | null;
  readonly user_provided_suffix?: string | null;
  readonly seed?: number;
  readonly estimated_finish?: number | null;
  readonly integrations?: readonly FineTuningIntegration[];
}

/** Query parameters for `GET /v1/fine_tuning/jobs`. */
export interface ListFineTuningJobsQuery {
  readonly after?: string;
  readonly limit?: number;
}

/** Response from `GET /v1/fine_tuning/jobs`. */
export interface ListFineTuningJobsResponse {
  readonly object: "list";
  readonly data: readonly FineTuningJob[];
  readonly has_more: boolean;
}

/** A single event in a fine-tuning job's stream of progress messages. */
export interface FineTuningJobEvent {
  readonly id: string;
  readonly object: "fine_tuning.job.event";
  readonly created_at: number;
  readonly level: "info" | "warn" | "error";
  readonly message: string;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly type?: "message" | "metrics";
}

/** Query parameters for `GET /v1/fine_tuning/jobs/{job_id}/events`. */
export interface ListFineTuningEventsQuery {
  readonly after?: string;
  readonly limit?: number;
}

/** Response from the events endpoint. */
export interface ListFineTuningEventsResponse {
  readonly object: "list";
  readonly data: readonly FineTuningJobEvent[];
  readonly has_more: boolean;
}

/** Surface for fine-tuning endpoints on the `Client`. */
export interface FineTuningNamespace {
  /** Submit a new fine-tuning job. */
  create(req: FineTuningCreateRequest): Promise<Result<FineTuningJob, ApiError>>;
  /** Look up a fine-tuning job by id. */
  retrieve(jobId: string): Promise<Result<FineTuningJob, ApiError>>;
  /** Page through fine-tuning jobs. */
  list(query?: ListFineTuningJobsQuery): Promise<Result<ListFineTuningJobsResponse, ApiError>>;
  /** Cancel a running fine-tuning job. */
  cancel(jobId: string): Promise<Result<FineTuningJob, ApiError>>;
  /** Stream events emitted by a fine-tuning job. */
  events(
    jobId: string,
    query?: ListFineTuningEventsQuery,
  ): Promise<Result<ListFineTuningEventsResponse, ApiError>>;
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

/** Bind a `FineTuningNamespace` to a constructed `Transport`. */
export const createFineTuning = (transport: Transport): FineTuningNamespace => ({
  create(req) {
    return transport.request<FineTuningJob>({
      method: "POST",
      path: "/v1/fine_tuning/jobs",
      body: req,
    });
  },
  retrieve(jobId) {
    return transport.request<FineTuningJob>({
      method: "GET",
      path: `/v1/fine_tuning/jobs/${encodeURIComponent(jobId)}`,
    });
  },
  list(query) {
    return transport.request<ListFineTuningJobsResponse>({
      method: "GET",
      path: "/v1/fine_tuning/jobs",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  cancel(jobId) {
    return transport.request<FineTuningJob>({
      method: "POST",
      path: `/v1/fine_tuning/jobs/${encodeURIComponent(jobId)}/cancel`,
    });
  },
  events(jobId, query) {
    return transport.request<ListFineTuningEventsResponse>({
      method: "GET",
      path: `/v1/fine_tuning/jobs/${encodeURIComponent(jobId)}/events`,
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
});
