import type { ApiError } from "../../error.ts";
import type { Result } from "../../result.ts";
import type { Transport } from "../../transport.ts";

/** Type of fallback bucket on the proxy. */
export type FallbackType = "general" | "context_window" | "content_policy";

/** Request body for `POST /fallback`. */
export interface FallbackCreateRequest {
  /** Primary model the fallbacks apply to. */
  readonly model: string;
  /** Ordered fallback models to try when the primary fails. */
  readonly fallback_models: readonly string[];
  /** Defaults to `"general"`. */
  readonly fallback_type?: FallbackType;
}

/** Response from `POST /fallback`. */
export interface FallbackResponse {
  readonly model: string;
  readonly fallback_models: readonly string[];
  readonly fallback_type: FallbackType;
  readonly message: string;
}

/** Response from `GET /fallback/{model}`. */
export interface FallbackGetResponse {
  readonly model: string;
  readonly fallback_models: readonly string[];
  readonly fallback_type: FallbackType;
}

/** Response from `DELETE /fallback/{model}`. */
export interface FallbackDeleteResponse {
  readonly model: string;
  readonly fallback_type: FallbackType;
  readonly message: string;
}

/** Surface for fallback administration on the `Client`. */
export interface FallbacksNamespace {
  /** Create or update fallbacks for a model. */
  create(req: FallbackCreateRequest): Promise<Result<FallbackResponse, ApiError>>;
  /** Get configured fallbacks for a model. */
  get(
    model: string,
    fallbackType?: FallbackType,
  ): Promise<Result<FallbackGetResponse, ApiError>>;
  /** Delete fallbacks for a model. */
  delete(
    model: string,
    fallbackType?: FallbackType,
  ): Promise<Result<FallbackDeleteResponse, ApiError>>;
}

const encode = (s: string) => encodeURIComponent(s);

/** Bind a `FallbacksNamespace` to a constructed `Transport`. */
export const createFallbacks = (transport: Transport): FallbacksNamespace => ({
  create(req) {
    return transport.request<FallbackResponse>({
      method: "POST",
      path: "/fallback",
      body: req,
    });
  },
  get(model, fallbackType) {
    return transport.request<FallbackGetResponse>({
      method: "GET",
      path: `/fallback/${encode(model)}`,
      ...(fallbackType === undefined ? {} : { query: { fallback_type: fallbackType } }),
    });
  },
  delete(model, fallbackType) {
    return transport.request<FallbackDeleteResponse>({
      method: "DELETE",
      path: `/fallback/${encode(model)}`,
      ...(fallbackType === undefined ? {} : { query: { fallback_type: fallbackType } }),
    });
  },
});
