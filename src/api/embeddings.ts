import type { ApiError } from "../error.ts";
import type { ModelsWithMode } from "../models/mod.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** Allowed input shapes for the embeddings endpoint. */
export type EmbeddingsInput =
  | string
  | readonly string[]
  | readonly number[]
  | readonly (readonly number[])[];

/** Wire format the upstream encodes embeddings in. */
export type EmbeddingsEncoding = "float" | "base64";

/** Embeddings request body. `model` is constrained to embedding-mode models. */
export interface EmbeddingsRequest {
  readonly model: ModelsWithMode<"embedding">;
  readonly input: EmbeddingsInput;
  readonly encoding_format?: EmbeddingsEncoding;
  readonly dimensions?: number;
  readonly user?: string;
}

/** A single embedding row in the response. */
export interface EmbeddingsDatum {
  readonly object: "embedding";
  readonly embedding: readonly number[] | string;
  readonly index: number;
}

/** Token usage reported for the embeddings request. */
export interface EmbeddingsUsage {
  readonly prompt_tokens: number;
  readonly total_tokens: number;
}

/** A complete embeddings response. */
export interface EmbeddingsResponse {
  readonly object: "list";
  readonly data: readonly EmbeddingsDatum[];
  readonly model: string;
  readonly usage: EmbeddingsUsage;
}

/** Surface for the embeddings endpoint on the `Client`. */
export interface EmbeddingsNamespace {
  /** Embed one or more inputs with an embedding-mode model. */
  create(req: EmbeddingsRequest): Promise<Result<EmbeddingsResponse, ApiError>>;
}

/** Bind an `EmbeddingsNamespace` to a constructed `Transport`. */
export const createEmbeddings = (transport: Transport): EmbeddingsNamespace => ({
  create(req) {
    return transport.request<EmbeddingsResponse>({
      method: "POST",
      path: "/v1/embeddings",
      body: req,
    });
  },
});
