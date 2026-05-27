import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Request body for `/tag/new`. */
export interface CreateTagRequest {
  /** Unique tag name. */
  readonly name: string;
  /** Free-form description. */
  readonly description?: string;
  /** Model allowlist tied to the tag. */
  readonly models?: readonly string[];
  /** Maps model_id to model_name. */
  readonly model_info?: Readonly<Record<string, string>>;
  /** Existing budget record id to attach. */
  readonly budget_id?: string;
  /** Hard spend ceiling in USD. */
  readonly max_budget?: number;
  /** Warning threshold below `max_budget`. */
  readonly soft_budget?: number;
  /** Maximum parallel in-flight requests. */
  readonly max_parallel_requests?: number;
  /** Tokens-per-minute ceiling. */
  readonly tpm_limit?: number;
  /** Requests-per-minute ceiling. */
  readonly rpm_limit?: number;
  /** Per-model budget map keyed by model name. */
  readonly model_max_budget?: Readonly<Record<string, unknown>>;
  /** Rolling window duration. */
  readonly budget_duration?: string;
}

/** Request body for `/tag/update`. */
export type UpdateTagRequest = CreateTagRequest;

/** Request body for `/tag/info`. */
export interface TagInfoRequest {
  /** Tag names to fetch. */
  readonly names: readonly string[];
}

/** Request body for `/tag/delete`. */
export interface DeleteTagRequest {
  /** Tag name to delete. */
  readonly name: string;
}

/** A tag record returned by `/tag/list` and `/tag/info`. */
export interface TagConfig {
  /** Tag name. */
  readonly name: string;
  /** Free-form description. */
  readonly description?: string;
  /** Model allowlist tied to the tag. */
  readonly models?: readonly string[];
  /** Maps model_id to model_name. */
  readonly model_info?: Readonly<Record<string, string>>;
  /** ISO-8601 creation timestamp. */
  readonly created_at?: string;
  /** ISO-8601 last-update timestamp. */
  readonly updated_at?: string;
  /** Identifier of the creating user. */
  readonly created_by?: string;
  /** Stored budget rollup row from the proxy database. */
  readonly litellm_budget_table?: Readonly<Record<string, unknown>>;
}

/** Query parameters for `/tag/list`. */
export interface ListTagsQuery {
  /** Restrict dynamic tags to those active in the window. */
  readonly start_date?: string;
  /** ISO-8601 upper bound (inclusive). */
  readonly end_date?: string;
}

/** Query parameters for `GET /tag/daily/activity`. */
export interface TagDailyActivityQuery {
  /** Comma-separated tag names. Omit for all tags. */
  readonly tags?: string;
  /** Inclusive start date `YYYY-MM-DD`. */
  readonly start_date?: string;
  /** Inclusive end date `YYYY-MM-DD`. */
  readonly end_date?: string;
  /** Filter by model name. */
  readonly model?: string;
  /** Filter by virtual key. */
  readonly api_key?: string;
  /** Page number (1-indexed). */
  readonly page?: number;
  /** Page size. */
  readonly page_size?: number;
}

/** A single distinct tag entry returned by `/tag/distinct`. */
export interface DistinctTagEntry {
  /** Tag value. */
  readonly tag: string;
}

/** Response from `GET /tag/distinct`. */
export interface DistinctTagsResponse {
  /** Distinct tags ordered by usage frequency. */
  readonly results: readonly DistinctTagEntry[];
}

/** Filters accepted by the DAU / WAU / MAU endpoints. */
export interface TagActiveUsersQuery {
  /** Legacy single-tag filter (case-insensitive partial match). */
  readonly tag_filter?: string;
  /** Multi-tag filter; takes precedence over `tag_filter`. */
  readonly tag_filters?: readonly string[];
}

/** A single active-users row for one tag and time bucket. */
export interface TagActiveUsersRow {
  /** Tag value. */
  readonly tag: string;
  /** Distinct active users in this bucket. */
  readonly active_users: number;
  /** Bucket label (date for DAU; e.g. `"Week 1 (Jan 8)"` for WAU/MAU). */
  readonly date: string;
  /** Start of the bucket for WAU/MAU. */
  readonly period_start?: string | null;
  /** End of the bucket for WAU/MAU. */
  readonly period_end?: string | null;
}

/** Response from `/tag/dau`, `/tag/wau`, and `/tag/mau`. */
export interface ActiveUsersAnalyticsResponse {
  /** Per-tag, per-bucket active-user counts. */
  readonly results: readonly TagActiveUsersRow[];
}

/** Required date window for `GET /tag/summary`. */
export interface TagSummaryQuery extends TagActiveUsersQuery {
  /** Inclusive start date `YYYY-MM-DD`. */
  readonly start_date: string;
  /** Inclusive end date `YYYY-MM-DD`. */
  readonly end_date: string;
}

/** Aggregated metrics for a single tag. */
export interface TagSummaryRow {
  /** Tag value. */
  readonly tag: string;
  /** Distinct users observed. */
  readonly unique_users: number;
  /** Total request count. */
  readonly total_requests: number;
  /** Successful request count. */
  readonly successful_requests: number;
  /** Failed request count. */
  readonly failed_requests: number;
  /** Combined prompt + completion tokens. */
  readonly total_tokens: number;
  /** Spend in USD. */
  readonly total_spend: number;
}

/** Response from `GET /tag/summary`. */
export interface TagSummaryResponse {
  /** Per-tag summary metrics ordered by total requests. */
  readonly results: readonly TagSummaryRow[];
}

/** Query parameters for `GET /tag/user-agent/per-user-analytics`. */
export interface TagPerUserAnalyticsQuery extends TagActiveUsersQuery {
  /** Page number (1-indexed). */
  readonly page?: number;
  /** Page size (1-1000). */
  readonly page_size?: number;
}

/** Per-user usage metrics returned by `/tag/user-agent/per-user-analytics`. */
export interface PerUserMetricsRow {
  /** User identifier. */
  readonly user_id: string;
  /** Primary email, when known. */
  readonly user_email?: string | null;
  /** User-Agent string captured for the user. */
  readonly user_agent?: string | null;
  /** Successful request count. */
  readonly successful_requests: number;
  /** Failed request count. */
  readonly failed_requests: number;
  /** Total request count. */
  readonly total_requests: number;
  /** Total tokens consumed. */
  readonly total_tokens: number;
  /** Spend in USD. */
  readonly spend: number;
}

/** Response from `GET /tag/user-agent/per-user-analytics`. */
export interface PerUserAnalyticsResponse {
  /** Per-user metrics on the current page. */
  readonly results: readonly PerUserMetricsRow[];
  /** Total user count across all pages. */
  readonly total_count: number;
  /** Page number returned. */
  readonly page: number;
  /** Page size returned. */
  readonly page_size: number;
  /** Total page count. */
  readonly total_pages: number;
}

/** Analytics sub-namespace exposed at `client.tags.analytics`. */
export interface TagAnalyticsNamespace {
  /** Per-day spend / request counters for tags. */
  dailyActivity(query?: TagDailyActivityQuery): Promise<Result<unknown, ApiError>>;
  /** Daily Active Users by tag for the last 7 days. */
  dau(query?: TagActiveUsersQuery): Promise<Result<ActiveUsersAnalyticsResponse, ApiError>>;
  /** Weekly Active Users by tag for the last 7 weeks. */
  wau(query?: TagActiveUsersQuery): Promise<Result<ActiveUsersAnalyticsResponse, ApiError>>;
  /** Monthly Active Users by tag for the last 7 months. */
  mau(query?: TagActiveUsersQuery): Promise<Result<ActiveUsersAnalyticsResponse, ApiError>>;
  /** Distinct user-agent tags ordered by usage frequency. */
  distinct(): Promise<Result<DistinctTagsResponse, ApiError>>;
  /** Aggregated unique-user / request / spend metrics over a date window. */
  summary(query: TagSummaryQuery): Promise<Result<TagSummaryResponse, ApiError>>;
  /** Per-user usage metrics derived from tag activity in the last 30 days. */
  perUserAnalytics(
    query?: TagPerUserAnalyticsQuery,
  ): Promise<Result<PerUserAnalyticsResponse, ApiError>>;
}

/** Surface for tag administration on the `Client`. */
export interface TagsNamespace {
  /** Create a new tag. */
  create(req: CreateTagRequest): Promise<Result<unknown, ApiError>>;
  /** Update an existing tag. */
  update(req: UpdateTagRequest): Promise<Result<unknown, ApiError>>;
  /** Get information about specific tags. */
  info(req: TagInfoRequest): Promise<Result<Readonly<Record<string, TagConfig>>, ApiError>>;
  /** List all available tags. */
  list(query?: ListTagsQuery): Promise<Result<readonly TagConfig[], ApiError>>;
  /** Delete a tag by name. */
  delete(req: DeleteTagRequest): Promise<Result<{ readonly message: string }, ApiError>>;
  /** Tag analytics endpoints (DAU/WAU/MAU, summary, per-user). */
  readonly analytics: TagAnalyticsNamespace;
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

const filterUndefinedWithArrays = <T extends object>(
  q: T,
): Readonly<
  Record<string, string | number | boolean | readonly (string | number | boolean)[]>
> => {
  const out: Record<
    string,
    string | number | boolean | readonly (string | number | boolean)[]
  > = {};
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined) {
      out[k] = v as string | number | boolean | readonly (string | number | boolean)[];
    }
  }
  return out;
};

/** Bind a `TagsNamespace` to a constructed `Transport`. */
export const createTags = (transport: Transport): TagsNamespace => ({
  create(req) {
    return transport.request<unknown>({ method: "POST", path: "/tag/new", body: req });
  },
  update(req) {
    return transport.request<unknown>({ method: "POST", path: "/tag/update", body: req });
  },
  info(req) {
    return transport.request<Readonly<Record<string, TagConfig>>>({
      method: "POST",
      path: "/tag/info",
      body: req,
    });
  },
  list(query) {
    return transport.request<readonly TagConfig[]>({
      method: "GET",
      path: "/tag/list",
      ...(query === undefined ? {} : { query: filterUndefined(query) }),
    });
  },
  delete(req) {
    return transport.request<{ readonly message: string }>({
      method: "POST",
      path: "/tag/delete",
      body: req,
    });
  },
  analytics: {
    dailyActivity(query) {
      return transport.request<unknown>({
        method: "GET",
        path: "/tag/daily/activity",
        ...(query === undefined ? {} : { query: filterUndefined(query) }),
      });
    },
    dau(query) {
      return transport.request<ActiveUsersAnalyticsResponse>({
        method: "GET",
        path: "/tag/dau",
        ...(query === undefined ? {} : { query: filterUndefinedWithArrays(query) }),
      });
    },
    wau(query) {
      return transport.request<ActiveUsersAnalyticsResponse>({
        method: "GET",
        path: "/tag/wau",
        ...(query === undefined ? {} : { query: filterUndefinedWithArrays(query) }),
      });
    },
    mau(query) {
      return transport.request<ActiveUsersAnalyticsResponse>({
        method: "GET",
        path: "/tag/mau",
        ...(query === undefined ? {} : { query: filterUndefinedWithArrays(query) }),
      });
    },
    distinct() {
      return transport.request<DistinctTagsResponse>({
        method: "GET",
        path: "/tag/distinct",
      });
    },
    summary(query) {
      return transport.request<TagSummaryResponse>({
        method: "GET",
        path: "/tag/summary",
        query: filterUndefinedWithArrays(query),
      });
    },
    perUserAnalytics(query) {
      return transport.request<PerUserAnalyticsResponse>({
        method: "GET",
        path: "/tag/user-agent/per-user-analytics",
        ...(query === undefined ? {} : { query: filterUndefinedWithArrays(query) }),
      });
    },
  },
});
