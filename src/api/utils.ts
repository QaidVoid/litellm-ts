import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Request body for `POST /utils/token_counter`. */
export interface TokenCountRequest {
  /** Model to tokenize against. */
  readonly model: string;
  /** Plain-text prompt input. */
  readonly prompt?: string;
  /** OpenAI-shape chat messages. */
  readonly messages?: readonly Readonly<Record<string, unknown>>[];
  /** Google `:countTokens` shape: a list of `contents`. */
  readonly contents?: readonly Readonly<Record<string, unknown>>[];
  /** Tool definitions counted toward the prompt total. */
  readonly tools?: readonly Readonly<Record<string, unknown>>[];
  /** Anthropic-style system prompt (string or block array). */
  readonly system?: unknown;
}

/** Response from `POST /utils/token_counter`. */
export interface TokenCountResponse {
  /** Computed token count. */
  readonly total_tokens?: number;
  /** Provider-specific extras. */
  readonly [key: string]: unknown;
}

/** Call-type accepted by `/utils/transform_request`. */
export type TransformRequestCallType =
  | "completion"
  | "embedding"
  | "image_generation"
  | "moderation"
  | "audio_transcription"
  | "speech"
  | "rerank"
  | string;

/** Request body for `POST /utils/transform_request`. */
export interface TransformRequestBody {
  /** Operation kind the request will execute. */
  readonly call_type: TransformRequestCallType;
  /** Request body to transform to the upstream shape. */
  readonly request_body: Readonly<Record<string, unknown>>;
}

/** Response from `POST /utils/transform_request`. */
export interface TransformRequestResponse {
  /** Transformed request body the proxy would send upstream. */
  readonly transformed_request: Readonly<Record<string, unknown>>;
  /** Provider-specific extras. */
  readonly [key: string]: unknown;
}

/** Query parameters for `GET /utils/supported_openai_params`. */
export interface SupportedOpenAIParamsQuery {
  /** Model whose supported params are returned. */
  readonly model: string;
}

/** Response from `GET /utils/supported_openai_params`. */
export interface SupportedOpenAIParamsResponse {
  /** Parameter names accepted on requests for the model. */
  readonly supported_params: readonly string[];
}

/** Request body for `POST /utils/test_policies_and_guardrails`. */
export interface TestPoliciesAndGuardrailsRequest {
  /** Policies to evaluate. */
  readonly policies?: readonly Readonly<Record<string, unknown>>[];
  /** Guardrails to evaluate. */
  readonly guardrails?: readonly Readonly<Record<string, unknown>>[];
  /** Sample request body to test against. */
  readonly request_body?: Readonly<Record<string, unknown>>;
  /** Provider-specific extras. */
  readonly [key: string]: unknown;
}

/** Surface for proxy utility endpoints on the `Client`. */
export interface UtilsNamespace {
  /** Count tokens for a request without actually calling the model. */
  tokenCounter(req: TokenCountRequest): Promise<Result<TokenCountResponse, ApiError>>;
  /** Compute the upstream-shape request body without sending it. */
  transformRequest(req: TransformRequestBody): Promise<Result<TransformRequestResponse, ApiError>>;
  /** List parameters accepted for a specific model. */
  supportedOpenAIParams(
    model: string,
  ): Promise<Result<SupportedOpenAIParamsResponse, ApiError>>;
  /** Sandbox-evaluate policy + guardrail combinations against a sample request. */
  testPoliciesAndGuardrails(
    req: TestPoliciesAndGuardrailsRequest,
  ): Promise<Result<unknown, ApiError>>;
}

/** Bind a `UtilsNamespace` to a constructed `Transport`. */
export const createUtils = (transport: Transport): UtilsNamespace => ({
  tokenCounter(req) {
    return transport.request<TokenCountResponse>({
      method: "POST",
      path: "/utils/token_counter",
      body: req,
    });
  },
  transformRequest(req) {
    return transport.request<TransformRequestResponse>({
      method: "POST",
      path: "/utils/transform_request",
      body: req,
    });
  },
  supportedOpenAIParams(model) {
    return transport.request<SupportedOpenAIParamsResponse>({
      method: "GET",
      path: "/utils/supported_openai_params",
      query: { model },
    });
  },
  testPoliciesAndGuardrails(req) {
    return transport.request<unknown>({
      method: "POST",
      path: "/utils/test_policies_and_guardrails",
      body: req,
    });
  },
});
