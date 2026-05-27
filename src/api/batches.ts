import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Endpoints a batch may target. */
export type BatchEndpoint =
  | "/v1/chat/completions"
  | "/v1/embeddings"
  | "/v1/completions"
  | "/v1/responses";

/** How long the upstream waits for the batch to finish before failing. */
export type BatchCompletionWindow = "24h";

/** Lifecycle states of a batch job. */
export type BatchStatus =
  | "validating"
  | "failed"
  | "in_progress"
  | "finalizing"
  | "completed"
  | "expired"
  | "cancelling"
  | "cancelled";

/** Request body for `/v1/batches`. */
export interface BatchCreateRequest {
  /** Id of a previously uploaded JSONL file containing batch input. */
  readonly input_file_id: string;
  /** Endpoint the batch should issue requests against. */
  readonly endpoint: BatchEndpoint;
  /** Time window the upstream allows the batch to run. */
  readonly completion_window: BatchCompletionWindow;
  /** Free-form metadata returned alongside the batch object. */
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Per-status counts of individual line items in a batch. */
export interface BatchRequestCounts {
  /** Total submitted line items. */
  readonly total: number;
  /** Line items that completed successfully. */
  readonly completed: number;
  /** Line items that failed. */
  readonly failed: number;
}

/** Inline error details on a failed batch. */
export interface BatchErrorObject {
  /** Machine-readable error code. */
  readonly code: string;
  /** Human-readable error message. */
  readonly message: string;
  /** Offending parameter name, when known. */
  readonly param?: string | null;
  /** 1-based input line number, when known. */
  readonly line?: number | null;
}

/** A single batch job record. */
export interface Batch {
  /** Server-assigned id. */
  readonly id: string;
  /** Discriminator, always `"batch"`. */
  readonly object: "batch";
  /** Endpoint the batch dispatches against. */
  readonly endpoint: BatchEndpoint;
  /** Top-level error envelope when the batch failed. */
  readonly errors?: { readonly object: "list"; readonly data: readonly BatchErrorObject[] } | null;
  /** File id supplied as input. */
  readonly input_file_id: string;
  /** Time window the upstream allows the batch to run. */
  readonly completion_window: BatchCompletionWindow;
  /** Current lifecycle state. */
  readonly status: BatchStatus;
  /** File id holding the JSONL output once finalized. */
  readonly output_file_id?: string | null;
  /** File id holding per-line error output. */
  readonly error_file_id?: string | null;
  /** Unix epoch seconds when the batch was created. */
  readonly created_at: number;
  /** Unix epoch seconds when processing began. */
  readonly in_progress_at?: number | null;
  /** Unix epoch seconds at which the batch expires. */
  readonly expires_at?: number | null;
  /** Unix epoch seconds when finalization started. */
  readonly finalizing_at?: number | null;
  /** Unix epoch seconds when the batch completed. */
  readonly completed_at?: number | null;
  /** Unix epoch seconds when the batch failed. */
  readonly failed_at?: number | null;
  /** Unix epoch seconds when the batch expired. */
  readonly expired_at?: number | null;
  /** Unix epoch seconds when cancellation was requested. */
  readonly cancelling_at?: number | null;
  /** Unix epoch seconds when cancellation completed. */
  readonly cancelled_at?: number | null;
  /** Per-status line-item counts. */
  readonly request_counts?: BatchRequestCounts;
  /** Caller-supplied metadata returned verbatim. */
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Query parameters for `GET /v1/batches`. */
export interface ListBatchesQuery {
  /** Cursor for pagination (batch id). */
  readonly after?: string;
  /** Maximum number of results (1-100). Defaults to 20 on the server. */
  readonly limit?: number;
}

/** Response from `GET /v1/batches`. */
export interface ListBatchesResponse {
  /** Discriminator, always `"list"`. */
  readonly object: "list";
  /** Batches on the current page. */
  readonly data: readonly Batch[];
  /** Id of the first record on the page. */
  readonly first_id?: string;
  /** Id of the last record on the page. */
  readonly last_id?: string;
  /** True when more pages remain. */
  readonly has_more: boolean;
}

/** Surface for the batches endpoint on the `Client`. */
export interface BatchesNamespace {
  /** Submit a new batch job. */
  create(req: BatchCreateRequest): Promise<Result<Batch, ApiError>>;
  /** Look up a batch by id. */
  retrieve(batchId: string): Promise<Result<Batch, ApiError>>;
  /** Page through previously submitted batches. */
  list(query?: ListBatchesQuery): Promise<Result<ListBatchesResponse, ApiError>>;
  /** Request cancellation of an in-progress batch. */
  cancel(batchId: string): Promise<Result<Batch, ApiError>>;
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

/** Bind a `BatchesNamespace` to a constructed `Transport`. */
export const createBatches = (transport: Transport): BatchesNamespace => ({
  create(req) {
    return transport.request<Batch>({ method: "POST", path: "/v1/batches", body: req });
  },
  retrieve(batchId) {
    return transport.request<Batch>({
      method: "GET",
      path: `/v1/batches/${encodeURIComponent(batchId)}`,
    });
  },
  list(query) {
    return transport.request<ListBatchesResponse>({
      method: "GET",
      path: "/v1/batches",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  cancel(batchId) {
    return transport.request<Batch>({
      method: "POST",
      path: `/v1/batches/${encodeURIComponent(batchId)}/cancel`,
    });
  },
});
