/**
 * Shared response shape for the proxy's `daily/activity` analytics endpoints.
 *
 * `GET /customer/daily/activity`, `/team/daily/activity`, `/user/daily/activity`,
 * `/user/daily/activity/aggregated`, `/organization/daily/activity`,
 * `/tag/daily/activity`, and `/agent/daily/activity` all return a
 * `SpendAnalyticsPaginatedResponse`. The query parameters differ per entity, so
 * each namespace keeps its own `*DailyActivityQuery` type and reuses this
 * response.
 */

/** Token / request / spend counters, summed over the relevant window. */
export interface SpendMetrics {
  readonly spend: number;
  readonly prompt_tokens: number;
  readonly completion_tokens: number;
  readonly cache_read_input_tokens: number;
  readonly cache_creation_input_tokens: number;
  readonly total_tokens: number;
  readonly successful_requests: number;
  readonly failed_requests: number;
  readonly api_requests: number;
}

/** Metadata attached to an API-key breakdown entry. */
export interface SpendKeyMetadata {
  readonly key_alias?: string;
  readonly team_id?: string;
}

/** Per-key metrics with key metadata. */
export interface KeyMetricWithMetadata {
  readonly metrics: SpendMetrics;
  readonly metadata: SpendKeyMetadata;
}

/** Metrics for a breakdown dimension, with a per-key sub-breakdown. */
export interface MetricWithMetadata {
  readonly metrics: SpendMetrics;
  /** Dimension-specific metadata; shape varies by dimension. */
  readonly metadata: Readonly<Record<string, unknown>>;
  /** Which API keys contributed to this metric (`api_key` -> metrics). */
  readonly api_key_breakdown: Readonly<Record<string, KeyMetricWithMetadata>>;
}

/** Spend broken down by each dimension; keys are the dimension value. */
export interface BreakdownMetrics {
  readonly mcp_servers: Readonly<Record<string, MetricWithMetadata>>;
  readonly models: Readonly<Record<string, MetricWithMetadata>>;
  readonly model_groups: Readonly<Record<string, MetricWithMetadata>>;
  readonly providers: Readonly<Record<string, MetricWithMetadata>>;
  readonly endpoints: Readonly<Record<string, MetricWithMetadata>>;
  readonly api_keys: Readonly<Record<string, KeyMetricWithMetadata>>;
  readonly entities: Readonly<Record<string, MetricWithMetadata>>;
}

/** One day's metrics plus its per-dimension breakdown. */
export interface DailySpendData {
  /** ISO-8601 date (`YYYY-MM-DD`). */
  readonly date: string;
  readonly metrics: SpendMetrics;
  readonly breakdown: BreakdownMetrics;
}

/** Window totals and pagination cursor for the activity response. */
export interface DailySpendMetadata {
  readonly total_spend: number;
  readonly total_prompt_tokens: number;
  readonly total_completion_tokens: number;
  readonly total_tokens: number;
  readonly total_api_requests: number;
  readonly total_successful_requests: number;
  readonly total_failed_requests: number;
  readonly total_cache_read_input_tokens: number;
  readonly total_cache_creation_input_tokens: number;
  /** 1-based page index. */
  readonly page: number;
  /** Total number of pages available. */
  readonly total_pages: number;
  /** True when more pages remain. */
  readonly has_more: boolean;
}

/** Response from the `daily/activity` analytics endpoints. */
export interface SpendAnalyticsPaginatedResponse {
  /** One entry per day in the requested window. */
  readonly results: readonly DailySpendData[];
  /** Window totals and pagination. */
  readonly metadata: DailySpendMetadata;
}
