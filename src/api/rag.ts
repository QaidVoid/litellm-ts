import type { ApiError } from "../error.ts";
import type { Result } from "../result.ts";
import type { Transport } from "../transport.ts";

/** RecursiveCharacterTextSplitter parameters used when chunking documents. */
export interface RagChunkingStrategy {
  /** Maximum size of each chunk (characters). Default `1000`. */
  readonly chunk_size?: number;
  /** Character overlap between adjacent chunks. Default `200`. */
  readonly chunk_overlap?: number;
  /** Custom separators tried in order before falling back to character splits. */
  readonly separators?: readonly string[];
}

/** OCR step configuration applied before chunking image-bearing documents. */
export interface RagIngestOcrOptions {
  /** OCR-capable model, e.g. `"mistral/mistral-ocr-latest"`. */
  readonly model: string;
}

/** Embedding step configuration used during ingestion. */
export interface RagIngestEmbeddingOptions {
  /** Embedding model, e.g. `"text-embedding-3-small"`. */
  readonly model: string;
}

/** OpenAI vector store backend for `RagIngestOptions.vector_store`. */
export interface RagOpenAIVectorStoreOptions {
  readonly custom_llm_provider: "openai";
  /** Existing vector store id. When omitted, the proxy auto-creates one. */
  readonly vector_store_id?: string;
  /** Time-to-live in days for indexed content. */
  readonly ttl_days?: number;
  /** Name of a credential stored via `client.credentials`. */
  readonly litellm_credential_name?: string;
  readonly api_key?: string;
  readonly api_base?: string;
}

/** AWS Bedrock Knowledge Base backend for `RagIngestOptions.vector_store`. */
export interface RagBedrockVectorStoreOptions {
  readonly custom_llm_provider: "bedrock";
  readonly vector_store_id?: string;
  readonly s3_bucket?: string;
  readonly s3_prefix?: string;
  readonly embedding_model?: string;
  readonly data_source_id?: string;
  /** Block until ingestion finishes; default `false`. */
  readonly wait_for_ingestion?: boolean;
  /** Timeout in seconds when `wait_for_ingestion` is `true`. Default `300`. */
  readonly ingestion_timeout?: number;
  readonly litellm_credential_name?: string;
  readonly aws_access_key_id?: string;
  readonly aws_secret_access_key?: string;
  readonly aws_session_token?: string;
  readonly aws_region_name?: string;
  readonly aws_role_name?: string;
  readonly aws_session_name?: string;
  readonly aws_profile_name?: string;
  readonly aws_web_identity_token?: string;
  readonly aws_sts_endpoint?: string;
  readonly aws_external_id?: string;
}

/** Vertex AI RAG Engine backend for `RagIngestOptions.vector_store`. */
export interface RagVertexAIVectorStoreOptions {
  readonly custom_llm_provider: "vertex_ai";
  /** RAG corpus id (required for Vertex AI). */
  readonly vector_store_id: string;
  readonly vertex_project?: string;
  readonly vertex_location?: string;
  readonly vertex_credentials?: string;
  readonly gcs_bucket?: string;
  /** Block until import completes; default `true`. */
  readonly wait_for_import?: boolean;
  /** Timeout in seconds. Default `600`. */
  readonly import_timeout?: number;
}

/** S3 Vectors backend for `RagIngestOptions.vector_store`. */
export interface RagS3VectorsVectorStoreOptions {
  readonly custom_llm_provider: "s3_vectors";
  readonly vector_bucket_name: string;
  readonly index_name?: string;
  readonly dimension?: number;
  readonly distance_metric?: "cosine" | "euclidean";
  readonly non_filterable_metadata_keys?: readonly string[];
  readonly litellm_credential_name?: string;
  readonly aws_access_key_id?: string;
  readonly aws_secret_access_key?: string;
  readonly aws_session_token?: string;
  readonly aws_region_name?: string;
  readonly aws_role_name?: string;
  readonly aws_session_name?: string;
  readonly aws_profile_name?: string;
  readonly aws_web_identity_token?: string;
  readonly aws_sts_endpoint?: string;
  readonly aws_external_id?: string;
}

/** Discriminated union of supported RAG vector store backends. */
export type RagVectorStoreOptions =
  | RagOpenAIVectorStoreOptions
  | RagBedrockVectorStoreOptions
  | RagVertexAIVectorStoreOptions
  | RagS3VectorsVectorStoreOptions;

/** End-to-end ingest pipeline configuration. */
export interface RagIngestOptions {
  /** Optional pipeline name used in logs. */
  readonly name?: string;
  readonly ocr?: RagIngestOcrOptions;
  readonly chunking_strategy?: RagChunkingStrategy;
  readonly embedding?: RagIngestEmbeddingOptions;
  readonly vector_store: RagVectorStoreOptions;
}

/** Request body for `POST /v1/rag/ingest`. At least one source must be set. */
export interface RagIngestRequest {
  readonly ingest_options: RagIngestOptions;
  /** Public URL the proxy fetches the file from. */
  readonly file_url?: string;
  /** Identifier returned by `client.files.create`. */
  readonly file_id?: string;
  /** Inline file payload (filename + base64 + content_type). */
  readonly file?: {
    readonly filename: string;
    readonly content: string;
    readonly content_type: string;
  };
}

/** Response from `POST /v1/rag/ingest`. */
export interface RagIngestResponse {
  readonly id?: string;
  readonly status?: "completed" | "in_progress" | "failed";
  readonly vector_store_id?: string;
  readonly file_id?: string;
  readonly error?: string;
}

/** Retrieval step configuration on a `RagQueryRequest`. */
export interface RagRetrievalConfig {
  readonly vector_store_id?: string;
  readonly custom_llm_provider?: string;
  /** Max results returned from the vector store. */
  readonly top_k?: number;
  /** Provider-specific filter expression. */
  readonly filters?: Readonly<Record<string, unknown>>;
}

/** Optional rerank step applied after retrieval. */
export interface RagRerankConfig {
  readonly enabled: boolean;
  readonly model?: string;
  /** Final number of chunks after reranking. */
  readonly top_n?: number;
  readonly return_documents?: boolean;
}

/** Request body for `POST /v1/rag/query`. */
export interface RagQueryRequest {
  /** Chat-completion-capable model used for the final generation step. */
  readonly model: string;
  /** Chat-style message history. */
  readonly messages: readonly Readonly<Record<string, unknown>>[];
  readonly retrieval_config: RagRetrievalConfig;
  readonly rerank?: RagRerankConfig;
  readonly stream?: boolean;
}

/**
 * Response from `POST /v1/rag/query`. The proxy returns a standard chat
 * completion shape, so the response is left as `unknown` and consumers can
 * narrow with `ChatCompletion` from the chat namespace if desired.
 */
export type RagQueryResponse = Readonly<Record<string, unknown>>;

/** Surface for the RAG endpoints on the `Client`. */
export interface RagNamespace {
  /** Ingest a document into a vector store with optional OCR and chunking. */
  ingest(req: RagIngestRequest): Promise<Result<RagIngestResponse, ApiError>>;
  /** Run a retrieval + (optional) rerank + generation pipeline. */
  query(req: RagQueryRequest): Promise<Result<RagQueryResponse, ApiError>>;
}

/** Bind a `RagNamespace` to a constructed `Transport`. */
export const createRag = (transport: Transport): RagNamespace => ({
  ingest(req) {
    return transport.request<RagIngestResponse>({
      method: "POST",
      path: "/v1/rag/ingest",
      body: req,
    });
  },
  query(req) {
    return transport.request<RagQueryResponse>({
      method: "POST",
      path: "/v1/rag/query",
      body: req,
    });
  },
});
