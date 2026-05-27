import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Field-level metadata for a router setting (used for UI rendering). */
export interface RouterSettingsField {
  readonly field_name: string;
  readonly field_type: string;
  readonly field_value?: unknown;
  readonly field_description: string;
  readonly field_default?: unknown;
  readonly options?: readonly string[];
  readonly ui_field_name: string;
  readonly link?: string;
}

/** Response from `GET /router/settings`. */
export interface RouterSettingsResponse {
  readonly fields: readonly RouterSettingsField[];
  readonly current_values: Readonly<Record<string, unknown>>;
  readonly routing_strategy_descriptions: Readonly<Record<string, string>>;
}

/** Response from `GET /router/fields`. */
export interface RouterFieldsResponse {
  readonly fields: readonly RouterSettingsField[];
  readonly routing_strategy_descriptions: Readonly<Record<string, string>>;
}

/** Surface for router-settings reads on the `Client`. */
export interface RouterNamespace {
  /** Get router settings with current values applied. */
  settings(): Promise<Result<RouterSettingsResponse, ApiError>>;
  /** Get router field metadata only (no values). */
  fields(): Promise<Result<RouterFieldsResponse, ApiError>>;
}

/** Bind a `RouterNamespace` to a constructed `Transport`. */
export const createRouter = (transport: Transport): RouterNamespace => ({
  settings() {
    return transport.request<RouterSettingsResponse>({
      method: "GET",
      path: "/router/settings",
    });
  },
  fields() {
    return transport.request<RouterFieldsResponse>({
      method: "GET",
      path: "/router/fields",
    });
  },
});
