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
  readonly completion_window: BatchCompletionWindow;
  /** Free-form metadata returned alongside the batch object. */
  readonly metadata?: Readonly<Record<string, string>>;
}

/** Per-status counts of individual line items in a batch. */
export interface BatchRequestCounts {
  readonly total: number;
  readonly completed: number;
  readonly failed: number;
}

/** Inline error details on a failed batch. */
export interface BatchErrorObject {
  readonly code: string;
  readonly message: string;
  readonly param?: string | null;
  readonly line?: number | null;
}

/** A single batch job record. */
export interface Batch {
  readonly id: string;
  readonly object: "batch";
  readonly endpoint: BatchEndpoint;
  readonly errors?: { readonly object: "list"; readonly data: readonly BatchErrorObject[] } | null;
  readonly input_file_id: string;
  readonly completion_window: BatchCompletionWindow;
  readonly status: BatchStatus;
  readonly output_file_id?: string | null;
  readonly error_file_id?: string | null;
  readonly created_at: number;
  readonly in_progress_at?: number | null;
  readonly expires_at?: number | null;
  readonly finalizing_at?: number | null;
  readonly completed_at?: number | null;
  readonly failed_at?: number | null;
  readonly expired_at?: number | null;
  readonly cancelling_at?: number | null;
  readonly cancelled_at?: number | null;
  readonly request_counts?: BatchRequestCounts;
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
  readonly object: "list";
  readonly data: readonly Batch[];
  readonly first_id?: string;
  readonly last_id?: string;
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
