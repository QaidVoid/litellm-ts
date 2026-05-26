import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Per-call guardrail mode supported by the proxy. */
export type GuardrailMode = "pre_call" | "during_call" | "post_call";

/** A single configured guardrail. */
export interface GuardrailInfo {
  readonly guardrail_name: string;
  readonly litellm_params?: Readonly<Record<string, unknown>>;
  readonly guardrail_info?: Readonly<Record<string, unknown>>;
  readonly mode?: GuardrailMode;
}

/** Response from `GET /guardrails/list`. */
export interface ListGuardrailsResponse {
  readonly guardrails: readonly GuardrailInfo[];
}

/** Surface for guardrail administration on the `Client`. Read-only in v0.2. */
export interface GuardrailsNamespace {
  /** List configured guardrails. */
  list(): Promise<Result<ListGuardrailsResponse, ApiError>>;
}

/** Bind a `GuardrailsNamespace` to a constructed `Transport`. */
export const createGuardrails = (transport: Transport): GuardrailsNamespace => ({
  list() {
    return transport.request<ListGuardrailsResponse>({
      method: "GET",
      path: "/guardrails/list",
    });
  },
});
