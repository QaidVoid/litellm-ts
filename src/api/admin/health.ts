import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Lifecycle states reported by `/health/readiness`. */
export type ReadinessStatus = "healthy" | "unhealthy";

/** Connection states reported for the database backing the proxy. */
export type DatabaseStatus = "connected" | "disconnected" | "Not connected";

/** Response from `/health/readiness` (basic, unauthenticated). */
export interface ReadinessResponse {
  /** Overall health state. */
  readonly status: ReadinessStatus;
  /** Database connectivity state, if a database is configured. */
  readonly db?: DatabaseStatus;
}

/** Response from `/health/readiness/details` (authenticated). */
export interface ReadinessDetailsResponse {
  /** Overall health state. */
  readonly status: ReadinessStatus;
  /** Database connectivity details. */
  readonly db?: Readonly<Record<string, unknown>>;
  /** Cache backend details. */
  readonly cache?: Readonly<Record<string, unknown>>;
  /** Callback configuration. */
  readonly callbacks?: Readonly<Record<string, unknown>>;
  /** Requests currently being processed. */
  readonly in_flight_requests?: number;
}

/** Request body for `/health/test_connection`. */
export interface TestConnectionRequest {
  /** LiteLLM model parameters identifying the upstream model and credentials. */
  readonly litellm_params: {
    /** Upstream model name (e.g. `"gpt-4o-mini"`). */
    readonly model: string;
    /** Provider API key. */
    readonly api_key?: string;
    /** Override the provider's API base URL. */
    readonly api_base?: string;
    /** Override the provider's API version. */
    readonly api_version?: string;
  } & Readonly<Record<string, unknown>>;
  /** Connection-mode probe (chat, embedding, etc.). */
  readonly mode?: string;
  /** Additional model metadata mirrored from `/model/new`. */
  readonly model_info?: Readonly<Record<string, unknown>>;
}

/** Response from `/health/test_connection`. */
export interface TestConnectionResponse {
  /** Whether the test request succeeded against the upstream provider. */
  readonly status: "success" | "failed";
  /** Echo of the upstream response on success. */
  readonly data?: unknown;
  /** Error description on failure. */
  readonly error?: string;
}

/** Query parameters for the legacy `/health` endpoint. */
export interface HealthCheckQuery {
  /** Filter by model name registered with the proxy. */
  readonly model?: string;
  /** Filter by model id assigned by the proxy. */
  readonly model_id?: string;
}

/** Aggregated health-check response from `/health`. */
export interface HealthCheckResponse {
  /** Healthy deployment entries (one per deployment). */
  readonly healthy_endpoints?: readonly Readonly<Record<string, unknown>>[];
  /** Unhealthy deployment entries with error details. */
  readonly unhealthy_endpoints?: readonly Readonly<Record<string, unknown>>[];
  /** Healthy deployment count. */
  readonly healthy_count?: number;
  /** Unhealthy deployment count. */
  readonly unhealthy_count?: number;
  /** Diagnostic warnings (e.g. missing `model_info.id`). */
  readonly warnings?: readonly string[];
}

/** Query parameters for `/health/services`. */
export interface HealthServicesQuery {
  /** The service name to probe (e.g. `"datadog"`, `"langfuse"`, `"slack"`). */
  readonly service: string;
}

/** Response from `/health/services`. */
export interface HealthServicesResponse {
  /** Per-service status reported by the upstream integration. */
  readonly status: string;
  /** Human-readable message describing the result. */
  readonly message?: string;
}

/** Response from `/health/shared-status` (Redis-coordinated background checks). */
export interface SharedHealthStatusResponse {
  /** Whether shared health-check coordination is enabled. */
  readonly shared_health_check_enabled: boolean;
  /** Whether Redis is reachable when shared mode is on. */
  readonly redis_available?: boolean;
  /** Free-form diagnostic message. */
  readonly message?: string;
  /** Lock and cache status details, when available. */
  readonly status?: Readonly<Record<string, unknown>>;
}

/** Response from `/health/license`. */
export interface HealthLicenseResponse {
  /** Whether a license string is configured. */
  readonly has_license: boolean;
  /** `"enterprise"` for premium users, `"community"` otherwise. */
  readonly license_type: "enterprise" | "community";
  /** License expiration timestamp, or `null` if absent. */
  readonly expiration_date: string | null;
  /** Feature flags allowed by the license. */
  readonly allowed_features: readonly string[];
  /** Quantitative limits enforced by the license. */
  readonly limits: {
    /** Maximum allowed user accounts, or `null` for unlimited. */
    readonly max_users: number | null;
    /** Maximum allowed teams, or `null` for unlimited. */
    readonly max_teams: number | null;
  };
}

/** Response from `/health/backlog`. */
export interface HealthBacklogResponse {
  /** Number of HTTP requests currently in flight on this worker. */
  readonly in_flight_requests: number;
}

/** Query parameters for `/health/history`. */
export interface HealthHistoryQuery {
  /** Filter by specific model name. */
  readonly model?: string;
  /** Filter by status (`"healthy"` or `"unhealthy"`). */
  readonly status_filter?: string;
  /** Page size (1-1000). Defaults to 100. */
  readonly limit?: number;
  /** Pagination offset. Defaults to 0. */
  readonly offset?: number;
}

/** A single persisted health-check record. */
export interface HealthCheckRecord {
  /** Deployment model id, when available. */
  readonly model_id?: string;
  /** Deployment model name. */
  readonly model_name?: string;
  /** Reported status. */
  readonly status?: string;
  /** Captured timestamp. */
  readonly checked_at?: string;
  /** Additional fields from the underlying Prisma row. */
  readonly [key: string]: unknown;
}

/** Response from `/health/history`. */
export interface HealthHistoryResponse {
  /** Returned health-check records. */
  readonly health_checks: readonly HealthCheckRecord[];
  /** Total records returned in this page. */
  readonly total_records: number;
  /** Echo of the limit query parameter. */
  readonly limit: number;
  /** Echo of the offset query parameter. */
  readonly offset: number;
}

/** Response from `/health/latest`. */
export interface HealthLatestResponse {
  /** Map of model id (or model name) to its most recent health-check record. */
  readonly latest_health_checks: Readonly<Record<string, HealthCheckRecord>>;
  /** Number of distinct models reported. */
  readonly total_models: number;
}

/** Surface for proxy health endpoints on the `Client`. */
export interface HealthNamespace {
  /** Lightweight unauthenticated probe. Returns the literal `"I'm alive!"` string. */
  liveliness(): Promise<Result<string, ApiError>>;
  /** k8s-style alias for `liveliness`. Hits `/health/liveness`. */
  liveness(): Promise<Result<string, ApiError>>;
  /** Readiness probe. Unauthenticated; reports overall and DB status. */
  readiness(): Promise<Result<ReadinessResponse, ApiError>>;
  /** Authenticated readiness probe with full backend detail. */
  readinessDetails(): Promise<Result<ReadinessDetailsResponse, ApiError>>;
  /** Test connection to a single configured (or ad-hoc) upstream model. */
  testConnection(
    req: TestConnectionRequest,
  ): Promise<Result<TestConnectionResponse, ApiError>>;
  /** Aggregate health of every configured deployment via `/health`. */
  check(query?: HealthCheckQuery): Promise<Result<HealthCheckResponse, ApiError>>;
  /** Probe a named callback/integration service. */
  services(query: HealthServicesQuery): Promise<Result<HealthServicesResponse, ApiError>>;
  /** Inspect the Redis-coordinated shared health-check state. */
  sharedStatus(): Promise<Result<SharedHealthStatusResponse, ApiError>>;
  /** Read license metadata (no secret material is returned). */
  license(): Promise<Result<HealthLicenseResponse, ApiError>>;
  /** Per-worker in-flight request gauge. */
  backlog(): Promise<Result<HealthBacklogResponse, ApiError>>;
  /** Paginated history of persisted health checks. */
  history(query?: HealthHistoryQuery): Promise<Result<HealthHistoryResponse, ApiError>>;
  /** Most recent health check per model. */
  latest(): Promise<Result<HealthLatestResponse, ApiError>>;
  /** Lightweight uptime probe (`GET /test`). Returns `"ok"` or similar. */
  test(): Promise<Result<unknown, ApiError>>;
  /** List every HTTP route the proxy currently exposes. */
  routes(): Promise<Result<unknown, ApiError>>;
}

/** Bind a `HealthNamespace` to a constructed `Transport`. */
export const createHealth = (transport: Transport): HealthNamespace => ({
  liveliness() {
    return transport.request<string>({ method: "GET", path: "/health/liveliness" });
  },
  liveness() {
    return transport.request<string>({ method: "GET", path: "/health/liveness" });
  },
  readiness() {
    return transport.request<ReadinessResponse>({ method: "GET", path: "/health/readiness" });
  },
  readinessDetails() {
    return transport.request<ReadinessDetailsResponse>({
      method: "GET",
      path: "/health/readiness/details",
    });
  },
  testConnection(req) {
    return transport.request<TestConnectionResponse>({
      method: "POST",
      path: "/health/test_connection",
      body: req,
    });
  },
  check(query) {
    return transport.request<HealthCheckResponse>({
      method: "GET",
      path: "/health",
      ...(query === undefined ? {} : { query }),
    });
  },
  services(query) {
    return transport.request<HealthServicesResponse>({
      method: "GET",
      path: "/health/services",
      query,
    });
  },
  sharedStatus() {
    return transport.request<SharedHealthStatusResponse>({
      method: "GET",
      path: "/health/shared-status",
    });
  },
  license() {
    return transport.request<HealthLicenseResponse>({
      method: "GET",
      path: "/health/license",
    });
  },
  backlog() {
    return transport.request<HealthBacklogResponse>({
      method: "GET",
      path: "/health/backlog",
    });
  },
  history(query) {
    return transport.request<HealthHistoryResponse>({
      method: "GET",
      path: "/health/history",
      ...(query === undefined ? {} : { query }),
    });
  },
  latest() {
    return transport.request<HealthLatestResponse>({
      method: "GET",
      path: "/health/latest",
    });
  },
  test() {
    return transport.request<unknown>({ method: "GET", path: "/test" });
  },
  routes() {
    return transport.request<unknown>({ method: "GET", path: "/routes" });
  },
});
