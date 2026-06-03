import type { ApiError } from "../error.ts";
import { paginate } from "../pagination.ts";
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
  /** Mini-batch size; `"auto"` lets the provider pick. */
  readonly batch_size?: number | "auto";
  /** Learning-rate multiplier applied to the base model's default. */
  readonly learning_rate_multiplier?: number | "auto";
  /** Number of training epochs. */
  readonly n_epochs?: number | "auto";
}

/** Optional weights & biases integration on the job. */
export interface FineTuningIntegration {
  /** Discriminator, always `"wandb"`. */
  readonly type: "wandb";
  /** Weights & Biases configuration. */
  readonly wandb: {
    /** W&B project name. */
    readonly project: string;
    /** Run name shown in W&B. */
    readonly name?: string;
    /** W&B entity (team or user). */
    readonly entity?: string;
    /** Tags applied to the W&B run. */
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
  /** Hyperparameter overrides. */
  readonly hyperparameters?: FineTuningHyperparameters;
  /** Suffix appended to the resulting model name. */
  readonly suffix?: string;
  /** External integrations to attach (e.g. W&B). */
  readonly integrations?: readonly FineTuningIntegration[];
  /** Deterministic-sampling seed. */
  readonly seed?: number;
}

/** Per-fine-tune error payload. */
export interface FineTuningError {
  /** Machine-readable error code. */
  readonly code: string;
  /** Human-readable error message. */
  readonly message: string;
  /** Offending parameter name, when known. */
  readonly param?: string | null;
}

/** A single fine-tuning job record. */
export interface FineTuningJob {
  /** Server-assigned id. */
  readonly id: string;
  /** Discriminator, always `"fine_tuning.job"`. */
  readonly object: "fine_tuning.job";
  /** Unix epoch seconds when the job was created. */
  readonly created_at: number;
  /** Unix epoch seconds when the job finished, when applicable. */
  readonly finished_at?: number | null;
  /** Base model being fine-tuned. */
  readonly model: string;
  /** Name of the produced model, when training succeeded. */
  readonly fine_tuned_model?: string | null;
  /** Owning organization id. */
  readonly organization_id?: string;
  /** File ids holding training outputs. */
  readonly result_files?: readonly string[];
  /** Lifecycle status. */
  readonly status: FineTuningJobStatus;
  /** Validation file id, when supplied. */
  readonly validation_file?: string | null;
  /** Training file id. */
  readonly training_file: string;
  /** Hyperparameters used by the job. */
  readonly hyperparameters?: FineTuningHyperparameters;
  /** Total tokens consumed by training. */
  readonly trained_tokens?: number | null;
  /** Error details when the job failed. */
  readonly error?: FineTuningError | null;
  /** Suffix originally supplied by the caller. */
  readonly user_provided_suffix?: string | null;
  /** Deterministic-sampling seed. */
  readonly seed?: number;
  /** Estimated Unix epoch seconds when the job will finish. */
  readonly estimated_finish?: number | null;
  /** Configured external integrations. */
  readonly integrations?: readonly FineTuningIntegration[];
}

/** Query parameters for `GET /v1/fine_tuning/jobs`. */
export interface ListFineTuningJobsQuery {
  /** Cursor: return jobs after this id. */
  readonly after?: string;
  /** Maximum records per page. */
  readonly limit?: number;
}

/** Response from `GET /v1/fine_tuning/jobs`. */
export interface ListFineTuningJobsResponse {
  /** Discriminator, always `"list"`. */
  readonly object: "list";
  /** Jobs on the current page. */
  readonly data: readonly FineTuningJob[];
  /** True when more pages remain. */
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
  /** Auto-paginate fine-tuning jobs, yielding one job at a time across pages. */
  iterate(query?: ListFineTuningJobsQuery): AsyncIterable<Result<FineTuningJob, ApiError>>;
  /** Cancel a running fine-tuning job. */
  cancel(jobId: string): Promise<Result<FineTuningJob, ApiError>>;
}

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
      ...(query === undefined ? {} : { query }),
    });
  },
  iterate(query) {
    return paginate<FineTuningJob, string>(query?.after, async (after) => {
      const page = await this.list({ ...query, ...(after === undefined ? {} : { after }) });
      if (!page.ok) return page;
      const jobs = page.value.data;
      const last = jobs[jobs.length - 1];
      return {
        ok: true,
        value: { items: jobs, next: page.value.has_more && last ? last.id : undefined },
      };
    });
  },
  cancel(jobId) {
    return transport.request<FineTuningJob>({
      method: "POST",
      path: `/v1/fine_tuning/jobs/${encodeURIComponent(jobId)}/cancel`,
    });
  },
});
