import type { ApiError } from "../error.ts";
import type { ModelsWithMode } from "../models/mod.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Request body for `/v1/rerank`. Cohere-shape across all backing providers. */
export interface RerankRequest {
  /** Rerank-capable model id. */
  readonly model: ModelsWithMode<"rerank">;
  /** Text the documents are scored against. */
  readonly query: string;
  /** Candidate documents (strings or per-field structured objects). */
  readonly documents: readonly string[];
  /** Limit the number of returned results to the top scoring entries. */
  readonly top_n?: number;
  /** When true, the response includes each candidate's text in `result.document`. */
  readonly return_documents?: boolean;
  /** Field names to rank on when documents are structured objects. */
  readonly rank_fields?: readonly string[];
}

/** A single ranked entry in the rerank response. */
export interface RerankResult {
  /** Position of this entry in the original `documents` array. */
  readonly index: number;
  /** Similarity score in [0, 1]. Higher is more relevant. */
  readonly relevance_score: number;
  /** The original document text, when `return_documents` was set. */
  readonly document?: { readonly text: string };
}

/** Optional billing / version metadata block. */
export interface RerankMeta {
  /** Upstream API version block. */
  readonly api_version?: { readonly version: string };
  /** Billing breakdown for the request. */
  readonly billed_units?: { readonly search_units: number };
}

/** A complete rerank response. */
export interface RerankResponse {
  /** Server-assigned request identifier. */
  readonly id?: string;
  /** Documents in descending order of relevance. */
  readonly results: readonly RerankResult[];
  /** Optional billing and version metadata. */
  readonly meta?: RerankMeta;
}

/** Surface for the rerank endpoint on the `Client`. */
export interface RerankNamespace {
  /** Re-rank a set of candidate documents against a query (Cohere v1 shape). */
  create(req: RerankRequest): Promise<Result<RerankResponse, ApiError>>;
  /** Re-rank using the newer Cohere v2 shape exposed under `/v2/rerank`. */
  createV2(req: RerankRequest): Promise<Result<RerankResponse, ApiError>>;
}

/** Bind a `RerankNamespace` to a constructed `Transport`. */
export const createRerank = (transport: Transport): RerankNamespace => ({
  create(req) {
    return transport.request<RerankResponse>({
      method: "POST",
      path: "/v1/rerank",
      body: req,
    });
  },
  createV2(req) {
    return transport.request<RerankResponse>({
      method: "POST",
      path: "/v2/rerank",
      body: req,
    });
  },
});
