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
  /** Input to embed. May be one string, an array of strings, or token-id arrays. */
  readonly input: EmbeddingsInput;
  /** Wire format the upstream encodes the vectors in. Defaults to `"float"`. */
  readonly encoding_format?: EmbeddingsEncoding;
  /** Reduce the vector dimensionality (Matryoshka-style). Provider support varies. */
  readonly dimensions?: number;
  /** Opaque caller identifier forwarded to upstream abuse-detection systems. */
  readonly user?: string;
}

/** A single embedding row in the response. */
export interface EmbeddingsDatum {
  readonly object: "embedding";
  /** The vector itself. A `string` when `encoding_format` is `"base64"`. */
  readonly embedding: readonly number[] | string;
  /** Position of this embedding in the request input array. */
  readonly index: number;
}

/** Token usage reported for the embeddings request. */
export interface EmbeddingsUsage {
  /** Tokens consumed by the input. */
  readonly prompt_tokens: number;
  /** Equal to `prompt_tokens` for embeddings; included for parity with chat. */
  readonly total_tokens: number;
}

/** A complete embeddings response. */
export interface EmbeddingsResponse {
  readonly object: "list";
  /** One entry per input, in the same order. */
  readonly data: readonly EmbeddingsDatum[];
  /** Model that produced the embeddings. */
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
