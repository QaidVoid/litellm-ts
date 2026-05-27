import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/**
 * Anthropic event-logging batch payload. The proxy stubs this endpoint to
 * prevent 404s from Claude Code clients that send telemetry; the body
 * shape follows the Anthropic spec.
 */
export type AnthropicEventLoggingBatchRequest = Readonly<Record<string, unknown>>;

/** Response from `POST /api/event_logging/batch`. */
export interface AnthropicEventLoggingBatchResponse {
  /** Status tag, currently always `"ok"`. */
  readonly status: string;
}

/**
 * Surface for the Anthropic event-logging endpoints on the `Client`.
 *
 * @beta The proxy tags `/api/event_logging/*` as beta; shapes may
 * change between LiteLLM versions.
 */
export interface AnthropicEventLoggingNamespace {
  /**
   * Forward an Anthropic event-logging batch. The proxy currently accepts
   * the request and discards the body, so this method is best treated as
   * fire-and-forget telemetry.
   */
  batch(
    req: AnthropicEventLoggingBatchRequest,
  ): Promise<Result<AnthropicEventLoggingBatchResponse, ApiError>>;
}

/** Bind an `AnthropicEventLoggingNamespace` to a constructed `Transport`. */
export const createAnthropicEventLogging = (
  transport: Transport,
): AnthropicEventLoggingNamespace => ({
  batch(req) {
    return transport.request<AnthropicEventLoggingBatchResponse>({
      method: "POST",
      path: "/api/event_logging/batch",
      body: req,
    });
  },
});
