import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Field-level metadata for a router setting (used for UI rendering). */
export interface RouterSettingsField {
  /** Field identifier on the wire. */
  readonly field_name: string;
  /** TypeScript-style type hint (e.g. `"int"`, `"string"`). */
  readonly field_type: string;
  /** Current value, when known. */
  readonly field_value?: unknown;
  /** Human-readable description shown in the UI. */
  readonly field_description: string;
  /** Default value applied when no override is set. */
  readonly field_default?: unknown;
  /** Allowed option strings for enum-like fields. */
  readonly options?: readonly string[];
  /** Display label shown in the UI. */
  readonly ui_field_name: string;
  /** Documentation link for the field. */
  readonly link?: string;
}

/** Response from `GET /router/settings`. */
export interface RouterSettingsResponse {
  /** Field metadata. */
  readonly fields: readonly RouterSettingsField[];
  /** Current values keyed by `field_name`. */
  readonly current_values: Readonly<Record<string, unknown>>;
  /** Per-strategy description strings. */
  readonly routing_strategy_descriptions: Readonly<Record<string, string>>;
}

/** Response from `GET /router/fields`. */
export interface RouterFieldsResponse {
  /** Field metadata. */
  readonly fields: readonly RouterSettingsField[];
  /** Per-strategy description strings. */
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
