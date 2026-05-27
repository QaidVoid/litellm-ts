import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";
import type { ChatMessage } from "../chat.ts";

/** Upstream completion shape accepted by `/spend/calculate`. */
export interface SpendCompletionResponse {
  /** Token-usage block returned by the upstream. */
  readonly usage: {
    /** Tokens consumed by the prompt. */
    readonly prompt_tokens: number;
    /** Tokens produced in the completion. */
    readonly completion_tokens: number;
  } & Readonly<Record<string, unknown>>;
}

/**
 * Request body for `/spend/calculate`. The proxy needs exactly one cost
 * source: either the input `messages` (pre-call estimate) or a recorded
 * `completion_response` (post-call cost). This union encodes that constraint.
 */
export type CalculateSpendRequest =
  & { readonly model: string }
  & (
    | {
      /** Estimate cost from the request shape, before issuing it. */
      readonly messages: readonly ChatMessage[];
      readonly completion_response?: never;
    }
    | {
      readonly messages?: never;
      /** Compute cost from an actual upstream response (with usage). */
      readonly completion_response:
        & SpendCompletionResponse
        & Readonly<Record<string, unknown>>;
    }
  );

/** Response from `/spend/calculate`. */
export interface CalculateSpendResponse {
  /** Cost in USD. */
  readonly cost: number;
}

/** Query for `/spend/tags`. */
export interface SpendTagsQuery {
  /** ISO-8601 lower bound (inclusive). */
  readonly start_date?: string;
  /** ISO-8601 upper bound (inclusive). */
  readonly end_date?: string;
}

/** A single tag aggregation row. */
export interface SpendTagBucket {
  /** Tag value. */
  readonly tag: string;
  /** Spend accumulated under this tag, in USD. */
  readonly spend: number;
  /** Number of requests in this bucket. */
  readonly count: number;
}

/** Response from `/spend/tags`. */
export interface SpendTagsResponse {
  /** Per-tag spend buckets. */
  readonly tags: readonly SpendTagBucket[];
  /** Total spend across the window, in USD. */
  readonly total_spend: number;
}

/** Query for `/spend/logs`. */
export interface SpendLogsQuery {
  /** Filter by virtual key. */
  readonly api_key?: string;
  /** Filter by user. */
  readonly user_id?: string;
  /** Filter by team. */
  readonly team_id?: string;
  /** ISO-8601 lower bound (inclusive). */
  readonly start_date?: string;
  /** ISO-8601 upper bound (inclusive). */
  readonly end_date?: string;
  /** 1-based page number. */
  readonly page?: number;
  /** Page size. */
  readonly limit?: number;
}

/** A single spend log entry. */
export interface SpendLog {
  /** Request id assigned to the call. */
  readonly request_id?: string;
  /** Call type (e.g. `"chat.completion"`). */
  readonly call_type?: string;
  /** Virtual key the call was charged to (masked). */
  readonly api_key?: string;
  /** Spend in USD for this call. */
  readonly spend?: number;
  /** Total tokens used. */
  readonly total_tokens?: number;
  /** Tokens consumed by the prompt. */
  readonly prompt_tokens?: number;
  /** Tokens produced in the response. */
  readonly completion_tokens?: number;
  /** Model called. */
  readonly model?: string;
  /** ISO-8601 start time. */
  readonly start_time?: string;
  /** ISO-8601 end time. */
  readonly end_time?: string;
  /** User identifier attached to the call. */
  readonly user?: string;
  /** Team the call was attributed to. */
  readonly team_id?: string;
  /** Free-form metadata captured for the call. */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Response from `/spend/logs`. */
export interface SpendLogsResponse {
  /** Log entries on the current page. */
  readonly logs: readonly SpendLog[];
  /** Total entry count across all pages. */
  readonly total_count?: number;
  /** Page number returned. */
  readonly page?: number;
}

/** Surface for spend analytics on the `Client`. */
export interface SpendNamespace {
  /** Calculate the cost of a request or completion. */
  calculate(req: CalculateSpendRequest): Promise<Result<CalculateSpendResponse, ApiError>>;
  /** Aggregate spend grouped by tag, optionally bounded by date. */
  tags(query?: SpendTagsQuery): Promise<Result<SpendTagsResponse, ApiError>>;
  /** Paginated raw spend logs with optional filters. */
  logs(query?: SpendLogsQuery): Promise<Result<SpendLogsResponse, ApiError>>;
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

/** Bind a `SpendNamespace` to a constructed `Transport`. */
export const createSpend = (transport: Transport): SpendNamespace => ({
  calculate(req) {
    return transport.request<CalculateSpendResponse>({
      method: "POST",
      path: "/spend/calculate",
      body: req,
    });
  },
  tags(query) {
    return transport.request<SpendTagsResponse>({
      method: "GET",
      path: "/spend/tags",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  logs(query) {
    return transport.request<SpendLogsResponse>({
      method: "GET",
      path: "/spend/logs",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
});
