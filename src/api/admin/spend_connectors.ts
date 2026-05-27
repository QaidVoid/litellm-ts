import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Request body for `POST /vantage/init`. */
export interface VantageInitRequest {
  /** Vantage API key for authentication. */
  readonly api_key: string;
  /** Vantage integration token for the cost-import endpoint. */
  readonly integration_token: string;
  /** Vantage API base URL. Defaults to `https://api.vantage.sh`. */
  readonly base_url?: string;
}

/** Response from `POST /vantage/init`. */
export interface VantageInitResponse {
  /** Human-readable summary. */
  readonly message: string;
  /** Operation status. */
  readonly status: string;
}

/** Request body for `POST /vantage/export`. */
export interface VantageExportRequest {
  /** Maximum records to export (no limit by default). */
  readonly limit?: number;
  /** ISO-8601 start of the export window (UTC). */
  readonly start_time_utc?: string;
  /** ISO-8601 end of the export window (UTC). */
  readonly end_time_utc?: string;
}

/** Request body for `POST /vantage/dry-run`. */
export interface VantageDryRunRequest {
  /** Max records to include in the preview. Default 500. */
  readonly limit?: number;
}

/** Response from `POST /vantage/export` and `POST /vantage/dry-run`. */
export interface VantageExportResponse {
  /** Human-readable summary. */
  readonly message: string;
  /** Operation status. */
  readonly status: string;
  /** Dry-run payload, when applicable. */
  readonly dry_run_data?: Readonly<Record<string, unknown>>;
  /** Aggregate summary stats. */
  readonly summary?: Readonly<Record<string, unknown>>;
}

/** Response from `GET /vantage/settings`. */
export interface VantageSettingsView {
  /** API key with first/last four characters preserved. */
  readonly api_key_masked?: string;
  /** Integration token with first/last four characters preserved. */
  readonly integration_token_masked?: string;
  /** Configured Vantage API base URL. */
  readonly base_url?: string;
  /** Configuration status. */
  readonly status?: string;
}

/** Request body for `PUT /vantage/settings`. */
export interface VantageSettingsUpdate {
  /** Replacement API key. */
  readonly api_key?: string;
  /** Replacement integration token. */
  readonly integration_token?: string;
  /** Replacement base URL. */
  readonly base_url?: string;
}

/** Vantage spend-connector sub-namespace under `client.spendConnectors.vantage`. */
export interface VantageNamespace {
  /** Read masked Vantage settings. */
  settings(): Promise<Result<VantageSettingsView, ApiError>>;
  /** Update Vantage settings. */
  updateSettings(req: VantageSettingsUpdate): Promise<Result<unknown, ApiError>>;
  /** Initialize Vantage settings from scratch. */
  init(req: VantageInitRequest): Promise<Result<VantageInitResponse, ApiError>>;
  /** Capped preview of what `export` would send. */
  dryRun(req: VantageDryRunRequest): Promise<Result<VantageExportResponse, ApiError>>;
  /** Push cost data to Vantage. */
  export(req: VantageExportRequest): Promise<Result<VantageExportResponse, ApiError>>;
  /** Remove stored Vantage settings. */
  delete(): Promise<Result<unknown, ApiError>>;
}

/** Request body for `POST /cloudzero/init`. */
export interface CloudZeroInitRequest {
  /** CloudZero API key. */
  readonly api_key: string;
  /** CloudZero connection id for data submission. */
  readonly connection_id: string;
  /** Timezone for date handling. Defaults to `"UTC"`. */
  readonly timezone?: string;
}

/** Response from `POST /cloudzero/init`. */
export interface CloudZeroInitResponse {
  /** Human-readable summary. */
  readonly message: string;
  /** Operation status. */
  readonly status: string;
}

/** Request body for `POST /cloudzero/export` and `POST /cloudzero/dry-run`. */
export interface CloudZeroExportRequest {
  /** Maximum records to include. */
  readonly limit?: number;
  /** CloudZero operation type. Defaults to `"replace_hourly"`. */
  readonly operation?: "replace_hourly" | "sum" | string;
  /** ISO-8601 start of the export window (UTC). */
  readonly start_time_utc?: string;
  /** ISO-8601 end of the export window (UTC). */
  readonly end_time_utc?: string;
}

/** Response from `POST /cloudzero/export` and `POST /cloudzero/dry-run`. */
export interface CloudZeroExportResponse {
  /** Human-readable summary. */
  readonly message: string;
  /** Operation status. */
  readonly status: string;
  /** Number of records actually exported. */
  readonly records_exported?: number;
  /** Dry-run payload, when applicable. */
  readonly dry_run_data?: Readonly<Record<string, unknown>>;
  /** Aggregate summary stats. */
  readonly summary?: Readonly<Record<string, unknown>>;
}

/** Response from `GET /cloudzero/settings`. */
export interface CloudZeroSettingsView {
  /** API key with first/last four characters preserved. */
  readonly api_key_masked?: string;
  /** CloudZero connection id. */
  readonly connection_id?: string;
  /** Timezone for date handling. */
  readonly timezone?: string;
  /** Configuration status. */
  readonly status?: string;
}

/** Request body for `PUT /cloudzero/settings`. */
export interface CloudZeroSettingsUpdate {
  /** Replacement API key. */
  readonly api_key?: string;
  /** Replacement connection id. */
  readonly connection_id?: string;
  /** Replacement timezone. */
  readonly timezone?: string;
}

/** CloudZero spend-connector sub-namespace under `client.spendConnectors.cloudzero`. */
export interface CloudZeroNamespace {
  /** Read masked CloudZero settings. */
  settings(): Promise<Result<CloudZeroSettingsView, ApiError>>;
  /** Update CloudZero settings. */
  updateSettings(req: CloudZeroSettingsUpdate): Promise<Result<unknown, ApiError>>;
  /** Initialize CloudZero settings from scratch. */
  init(req: CloudZeroInitRequest): Promise<Result<CloudZeroInitResponse, ApiError>>;
  /** Capped preview of what `export` would send. */
  dryRun(req: CloudZeroExportRequest): Promise<Result<CloudZeroExportResponse, ApiError>>;
  /** Push cost data to CloudZero. */
  export(req: CloudZeroExportRequest): Promise<Result<CloudZeroExportResponse, ApiError>>;
  /** Remove stored CloudZero settings. */
  delete(): Promise<Result<unknown, ApiError>>;
}

/** Surface for spend-connector administration on the `Client`. */
export interface SpendConnectorsNamespace {
  /** Vantage cost-export integration. */
  readonly vantage: VantageNamespace;
  /** CloudZero cost-export integration. */
  readonly cloudzero: CloudZeroNamespace;
}

const createVantage = (transport: Transport): VantageNamespace => ({
  settings() {
    return transport.request<VantageSettingsView>({
      method: "GET",
      path: "/vantage/settings",
    });
  },
  updateSettings(req) {
    return transport.request<unknown>({
      method: "PUT",
      path: "/vantage/settings",
      body: req,
    });
  },
  init(req) {
    return transport.request<VantageInitResponse>({
      method: "POST",
      path: "/vantage/init",
      body: req,
    });
  },
  dryRun(req) {
    return transport.request<VantageExportResponse>({
      method: "POST",
      path: "/vantage/dry-run",
      body: req,
    });
  },
  export(req) {
    return transport.request<VantageExportResponse>({
      method: "POST",
      path: "/vantage/export",
      body: req,
    });
  },
  delete() {
    return transport.request<unknown>({
      method: "DELETE",
      path: "/vantage/delete",
    });
  },
});

const createCloudZero = (transport: Transport): CloudZeroNamespace => ({
  settings() {
    return transport.request<CloudZeroSettingsView>({
      method: "GET",
      path: "/cloudzero/settings",
    });
  },
  updateSettings(req) {
    return transport.request<unknown>({
      method: "PUT",
      path: "/cloudzero/settings",
      body: req,
    });
  },
  init(req) {
    return transport.request<CloudZeroInitResponse>({
      method: "POST",
      path: "/cloudzero/init",
      body: req,
    });
  },
  dryRun(req) {
    return transport.request<CloudZeroExportResponse>({
      method: "POST",
      path: "/cloudzero/dry-run",
      body: req,
    });
  },
  export(req) {
    return transport.request<CloudZeroExportResponse>({
      method: "POST",
      path: "/cloudzero/export",
      body: req,
    });
  },
  delete() {
    return transport.request<unknown>({
      method: "DELETE",
      path: "/cloudzero/delete",
    });
  },
});

/** Bind a `SpendConnectorsNamespace` to a constructed `Transport`. */
export const createSpendConnectors = (transport: Transport): SpendConnectorsNamespace => ({
  vantage: createVantage(transport),
  cloudzero: createCloudZero(transport),
});
