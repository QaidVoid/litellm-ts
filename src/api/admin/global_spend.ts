import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Common date-range query for the `/global/*` analytics endpoints. */
export interface GlobalDateRangeQuery {
  /** Inclusive start date (`YYYY-MM-DD`). */
  readonly start_date?: string;
  /** Inclusive end date (`YYYY-MM-DD`). */
  readonly end_date?: string;
}

/** Query parameters for `GET /global/spend/logs`. */
export interface GlobalSpendLogsQuery {
  /** Restrict aggregation to a single virtual key. */
  readonly api_key?: string;
}

/** Query parameters for `GET /global/spend/keys`. */
export interface GlobalSpendKeysQuery {
  /** Limit on returned rows. The proxy returns the top N by spend. */
  readonly limit?: number;
}

/** Query parameters for `GET /global/spend/models`. */
export interface GlobalSpendModelsQuery {
  /** Limit on returned rows. The proxy returns the top N by spend. Default 10. */
  readonly limit?: number;
}

/** Query parameters for `GET /global/spend/tags`. */
export interface GlobalSpendTagsQuery extends GlobalDateRangeQuery {
  /** Comma-separated tag filter. */
  readonly tags?: string;
}

/** Query parameters for `GET /global/spend/report`. */
export interface GlobalSpendReportQuery extends GlobalDateRangeQuery {
  /** Grouping dimension. Defaults to `"team"`. */
  readonly group_by?: "team" | "customer" | "api_key";
  /** Restrict to a single virtual key. */
  readonly api_key?: string;
  /** Restrict to a single internal user id. */
  readonly internal_user_id?: string;
  /** Restrict to a single team id. */
  readonly team_id?: string;
  /** Restrict to a single customer id. */
  readonly customer_id?: string;
}

/** Request body for `POST /global/spend/end_users`. */
export interface GlobalSpendEndUsersRequest {
  /** Restrict to a single virtual key. */
  readonly api_key?: string;
  /** ISO-8601 lower bound (inclusive). */
  readonly startTime?: string;
  /** ISO-8601 upper bound (exclusive). */
  readonly endTime?: string;
}

/**
 * Surface for the legacy `/global/*` spend and activity analytics endpoints.
 * Every response is left as `unknown` because the proxy returns ad-hoc
 * dashboard shapes that vary across releases and across internal/admin
 * callers.
 */
export interface GlobalSpendNamespace {
  /** Total spend across all virtual keys plus configured `max_budget`. */
  spend(): Promise<Result<unknown, ApiError>>;
  /** Top virtual keys by spend (admin and internal-user shapes diverge). */
  keys(query?: GlobalSpendKeysQuery): Promise<Result<unknown, ApiError>>;
  /** Daily spend rows from the materialized monthly view. */
  logs(query?: GlobalSpendLogsQuery): Promise<Result<unknown, ApiError>>;
  /** Top models by spend in the trailing 30-day window. */
  models(query?: GlobalSpendModelsQuery): Promise<Result<unknown, ApiError>>;
  /** Daily spend grouped by team alias. */
  teams(): Promise<Result<unknown, ApiError>>;
  /** Spend grouped by request tag. */
  tags(query?: GlobalSpendTagsQuery): Promise<Result<unknown, ApiError>>;
  /** Spend grouped by provider. */
  provider(query?: GlobalDateRangeQuery): Promise<Result<unknown, ApiError>>;
  /** Detailed per-team / per-customer / per-key spend report (enterprise). */
  report(query?: GlobalSpendReportQuery): Promise<Result<unknown, ApiError>>;
  /** Distinct tag names observed in the spend logs. */
  allTagNames(): Promise<Result<unknown, ApiError>>;
  /** Distinct end-user ids observed in the spend logs. */
  allEndUsers(): Promise<Result<unknown, ApiError>>;
  /** Top end-users by spend (filtered by key + time window). */
  endUsers(req?: GlobalSpendEndUsersRequest): Promise<Result<unknown, ApiError>>;
  /** Daily API request counts + token totals. */
  activity(query?: GlobalDateRangeQuery): Promise<Result<unknown, ApiError>>;
  /** Daily exception counts grouped by exception type. */
  activityExceptions(
    query?: GlobalDateRangeQuery,
  ): Promise<Result<unknown, ApiError>>;
  /** Per-deployment exception breakdown. */
  activityExceptionsDeployment(
    query?: GlobalDateRangeQuery,
  ): Promise<Result<unknown, ApiError>>;
  /** Per-model daily activity, capped at the top 10 models. */
  activityModel(query?: GlobalDateRangeQuery): Promise<Result<unknown, ApiError>>;
  /** Cache-hit vs LLM-call counts per day. */
  activityCacheHits(
    query?: GlobalDateRangeQuery,
  ): Promise<Result<unknown, ApiError>>;
  /** Force a refresh of the cached global-spend aggregates. */
  refresh(): Promise<Result<unknown, ApiError>>;
  /** Zero the accumulated global-spend counters. */
  reset(): Promise<Result<unknown, ApiError>>;
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

/** Bind a `GlobalSpendNamespace` to a constructed `Transport`. */
export const createGlobalSpend = (transport: Transport): GlobalSpendNamespace => ({
  spend() {
    return transport.request<unknown>({ method: "GET", path: "/global/spend" });
  },
  keys(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/global/spend/keys",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  logs(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/global/spend/logs",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  models(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/global/spend/models",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  teams() {
    return transport.request<unknown>({ method: "GET", path: "/global/spend/teams" });
  },
  tags(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/global/spend/tags",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  provider(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/global/spend/provider",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  report(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/global/spend/report",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  allTagNames() {
    return transport.request<unknown>({
      method: "GET",
      path: "/global/spend/all_tag_names",
    });
  },
  allEndUsers() {
    return transport.request<unknown>({
      method: "GET",
      path: "/global/all_end_users",
    });
  },
  endUsers(req) {
    return transport.request<unknown>({
      method: "POST",
      path: "/global/spend/end_users",
      ...(req === undefined ? {} : { body: req }),
    });
  },
  activity(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/global/activity",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  activityExceptions(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/global/activity/exceptions",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  activityExceptionsDeployment(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/global/activity/exceptions/deployment",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  activityModel(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/global/activity/model",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  activityCacheHits(query) {
    return transport.request<unknown>({
      method: "GET",
      path: "/global/activity/cache_hits",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  refresh() {
    return transport.request<unknown>({
      method: "POST",
      path: "/global/spend/refresh",
    });
  },
  reset() {
    return transport.request<unknown>({
      method: "POST",
      path: "/global/spend/reset",
    });
  },
});
