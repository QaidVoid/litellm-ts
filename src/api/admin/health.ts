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
    readonly model: string;
    readonly api_key?: string;
    readonly api_base?: string;
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

/** Surface for proxy health endpoints on the `Client`. */
export interface HealthNamespace {
  /** Lightweight unauthenticated probe. Returns the literal `"I'm alive!"` string. */
  liveliness(): Promise<Result<string, ApiError>>;
  /** Readiness probe. Unauthenticated; reports overall and DB status. */
  readiness(): Promise<Result<ReadinessResponse, ApiError>>;
  /** Authenticated readiness probe with full backend detail. */
  readinessDetails(): Promise<Result<ReadinessDetailsResponse, ApiError>>;
  /** Test connection to a single configured (or ad-hoc) upstream model. */
  testConnection(
    req: TestConnectionRequest,
  ): Promise<Result<TestConnectionResponse, ApiError>>;
}

/** Bind a `HealthNamespace` to a constructed `Transport`. */
export const createHealth = (transport: Transport): HealthNamespace => ({
  liveliness() {
    return transport.request<string>({ method: "GET", path: "/health/liveliness" });
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
});
