import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** A single configurable alerting field returned by `/alerting/settings`. */
export interface AlertingSettingField {
  /** Backend field name. */
  readonly field_name: string;
  /** Field type tag (`"String"`, `"Integer"`, `"Boolean"`, ...). */
  readonly field_type: string;
  /** Human-readable description. */
  readonly field_description: string;
  /** Currently stored value. */
  readonly field_value?: unknown;
  /** Default applied when unset. */
  readonly field_default_value?: unknown;
  /** Other proxy-supplied fields. */
  readonly [key: string]: unknown;
}

/** Response from `GET /alerting/settings`. */
export type AlertingSettingsResponse = readonly AlertingSettingField[];

/** Surface for alerting administration on the `Client`. */
export interface AlertingNamespace {
  /** Configurable alerting parameters with description and current value. */
  settings(): Promise<Result<AlertingSettingsResponse, ApiError>>;
}

/** Bind an `AlertingNamespace` to a constructed `Transport`. */
export const createAlerting = (transport: Transport): AlertingNamespace => ({
  settings() {
    return transport.request<AlertingSettingsResponse>({
      method: "GET",
      path: "/alerting/settings",
    });
  },
});
