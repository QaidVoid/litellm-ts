import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";
import type { ChatMessage } from "../chat.ts";

/** Request body for `/spend/calculate`. Provide either `messages` or `completion_response`. */
export interface CalculateSpendRequest {
  /** Model that was (or would be) called. */
  readonly model: string;
  /** Estimate cost from the request shape, before issuing it. */
  readonly messages?: readonly ChatMessage[];
  /** Compute cost from an actual upstream response (with usage). */
  readonly completion_response?: {
    readonly usage: {
      readonly prompt_tokens: number;
      readonly completion_tokens: number;
    } & Readonly<Record<string, unknown>>;
  } & Readonly<Record<string, unknown>>;
}

/** Response from `/spend/calculate`. */
export interface CalculateSpendResponse {
  /** Cost in USD. */
  readonly cost: number;
}

/** Query for `/spend/tags`. */
export interface SpendTagsQuery {
  readonly start_date?: string;
  readonly end_date?: string;
}

/** A single tag aggregation row. */
export interface SpendTagBucket {
  readonly tag: string;
  readonly spend: number;
  readonly count: number;
}

/** Response from `/spend/tags`. */
export interface SpendTagsResponse {
  readonly tags: readonly SpendTagBucket[];
  readonly total_spend: number;
}

/** Query for `/spend/logs`. */
export interface SpendLogsQuery {
  readonly api_key?: string;
  readonly user_id?: string;
  readonly team_id?: string;
  readonly start_date?: string;
  readonly end_date?: string;
  readonly page?: number;
  readonly limit?: number;
}

/** A single spend log entry. */
export interface SpendLog {
  readonly request_id?: string;
  readonly call_type?: string;
  readonly api_key?: string;
  readonly spend?: number;
  readonly total_tokens?: number;
  readonly prompt_tokens?: number;
  readonly completion_tokens?: number;
  readonly model?: string;
  readonly start_time?: string;
  readonly end_time?: string;
  readonly user?: string;
  readonly team_id?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Response from `/spend/logs`. */
export interface SpendLogsResponse {
  readonly logs: readonly SpendLog[];
  readonly total_count?: number;
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
